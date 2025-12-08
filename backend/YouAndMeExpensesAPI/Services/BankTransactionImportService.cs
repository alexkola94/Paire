using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for importing bank transactions into the app's transaction system
    /// Automatically maps bank transactions to expenses/income and detects duplicates
    /// </summary>
    public class BankTransactionImportService : IBankTransactionImportService
    {
        private readonly AppDbContext _context;
        private readonly IEnableBankingService _enableBankingService;
        private readonly ILogger<BankTransactionImportService> _logger;

        // Category mapping from bank categories to app categories
        private readonly Dictionary<string, string> _categoryMapping = new()
        {
            { "groceries", "Food & Groceries" },
            { "food", "Food & Groceries" },
            { "restaurant", "Food & Dining" },
            { "dining", "Food & Dining" },
            { "transport", "Transportation" },
            { "transportation", "Transportation" },
            { "fuel", "Transportation" },
            { "gas", "Transportation" },
            { "shopping", "Shopping" },
            { "retail", "Shopping" },
            { "bills", "Bills & Utilities" },
            { "utilities", "Bills & Utilities" },
            { "entertainment", "Entertainment" },
            { "health", "Health & Medical" },
            { "medical", "Health & Medical" },
            { "salary", "Salary" },
            { "income", "Income" },
            { "transfer", "Transfer" },
            { "other", "Other" }
        };

        public BankTransactionImportService(
            AppDbContext context,
            IEnableBankingService enableBankingService,
            ILogger<BankTransactionImportService> logger)
        {
            _context = context;
            _enableBankingService = enableBankingService;
            _logger = logger;
        }

        /// <summary>
        /// Imports bank transactions for all connected accounts of a user
        /// </summary>
        public async Task<BankTransactionImportResult> ImportTransactionsAsync(
            string userId,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var result = new BankTransactionImportResult();

            try
            {
                // Get active bank connection
                var bankConnection = await _context.Set<BankConnection>()
                    .FirstOrDefaultAsync(bc => bc.UserId == userId && bc.IsActive, cancellationToken);

                if (bankConnection == null)
                {
                    _logger.LogWarning($"No active bank connection found for user {userId}");
                    result.ErrorMessages.Add("No active bank connection found");
                    return result;
                }

                // Enable Banking sessions are long-lived (90 days). 
                // We check if TokenExpiresAt is passed. If so, user needs to re-auth manually usually.
                // Or if we implemented session extension logic, we'd do it here. 
                // For now, if expired, we log warning/error.
                if (bankConnection.TokenExpiresAt.HasValue &&
                    bankConnection.TokenExpiresAt.Value <= DateTime.UtcNow)
                {
                     _logger.LogWarning("Bank connection expired. User needs to re-authenticate.");
                     // In a real app we might return an error asking for re-login
                }

                // Get all connected accounts
                var accounts = await _context.Set<StoredBankAccount>()
                    .Where(a => a.UserId == userId && a.BankConnectionId == bankConnection.Id)
                    .ToListAsync(cancellationToken);

                if (!accounts.Any())
                {
                    _logger.LogWarning($"No bank accounts found for user {userId}");
                    result.ErrorMessages.Add("No bank accounts found");
                    return result;
                }

                if (!fromDate.HasValue) fromDate = DateTime.UtcNow.AddDays(-90);
                if (!toDate.HasValue) toDate = DateTime.UtcNow;

                // Import transactions for each account
                foreach (var account in accounts)
                {
                    try
                    {
                        var accountResult = await ImportTransactionsForAccountAsync(
                            userId,
                            account.AccountId, // This checks against external ID
                            fromDate,
                            toDate);

                        result.TotalImported += accountResult.TotalImported;
                        result.DuplicatesSkipped += accountResult.DuplicatesSkipped;
                        result.Errors += accountResult.Errors;
                        result.ErrorMessages.AddRange(accountResult.ErrorMessages);

                        if (accountResult.LastTransactionDate.HasValue &&
                            (!result.LastTransactionDate.HasValue ||
                             accountResult.LastTransactionDate.Value > result.LastTransactionDate.Value))
                        {
                            result.LastTransactionDate = accountResult.LastTransactionDate;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error importing transactions for account {account.AccountId}");
                        result.Errors++;
                        result.ErrorMessages.Add($"Error importing account {account.AccountName}: {ex.Message}");
                    }
                }

                // Update last sync time
                bankConnection.LastSyncAt = DateTime.UtcNow;
                bankConnection.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error importing transactions for user {userId}");
                result.Errors++;
                result.ErrorMessages.Add($"Import failed: {ex.Message}");
                return result;
            }
        }

        /// <summary>
        /// Imports transactions from a specific bank account
        /// </summary>
        public async Task<BankTransactionImportResult> ImportTransactionsForAccountAsync(
            string userId,
            string accountId,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            var result = new BankTransactionImportResult();

            try
            {
                var bankConnection = await _context.Set<BankConnection>()
                    .FirstOrDefaultAsync(bc => bc.UserId == userId && bc.IsActive, cancellationToken);

                if (bankConnection == null)
                {
                    result.ErrorMessages.Add("No active bank connection found");
                    return result;
                }

                // Fetch transactions from Enable Banking API
                // Using new signature: GetTransactionsAsync(accountUid, from, to)
                var bankTransactions = await _enableBankingService.GetTransactionsAsync(
                    accountId,
                    fromDate,
                    toDate);

                if (!bankTransactions.Any())
                {
                    _logger.LogInformation($"No transactions found for account {accountId}");
                    return result;
                }

                // Process each transaction
                foreach (var bankTransaction in bankTransactions)
                {
                    try
                    {
                        // Ensure we have a valid date
                        var txDate = bankTransaction.TransactionDate ?? bankTransaction.ValueDate ?? DateTime.UtcNow;

                        // Check for duplicate
                        var isDuplicate = await IsDuplicateTransactionAsync(
                            userId,
                            bankTransaction.TransactionId,
                            bankTransaction.Amount,
                            txDate,
                            cancellationToken);

                        if (isDuplicate)
                        {
                            result.DuplicatesSkipped++;
                            continue;
                        }

                        // Map to app transaction
                        var appTransaction = MapBankTransactionToAppTransaction(
                            bankTransaction,
                            userId,
                            accountId);

                        // Save to database
                        appTransaction.Id = Guid.NewGuid();
                        appTransaction.CreatedAt = DateTime.UtcNow;
                        appTransaction.UpdatedAt = DateTime.UtcNow;

                        if (appTransaction.Date.Kind != DateTimeKind.Utc)
                        {
                            appTransaction.Date = appTransaction.Date.ToUniversalTime();
                        }

                        _context.Transactions.Add(appTransaction);
                        await _context.SaveChangesAsync(cancellationToken);

                        result.TotalImported++;

                        if (!result.LastTransactionDate.HasValue ||
                            txDate > result.LastTransactionDate.Value)
                        {
                            result.LastTransactionDate = txDate;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error importing transaction {bankTransaction.TransactionId}");
                        result.Errors++;
                        result.ErrorMessages.Add($"Transaction {bankTransaction.TransactionId}: {ex.Message}");
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error importing transactions for account {accountId}");
                result.Errors++;
                result.ErrorMessages.Add($"Import failed: {ex.Message}");
                return result;
            }
        }

        public Transaction MapBankTransactionToAppTransaction(
            BankTransaction bankTransaction,
            string userId,
            string accountId)
        {
            // Determine transaction type: negative amount = expense, positive = income
            var transactionType = bankTransaction.Amount < 0 ? "expense" : "income";
            var amount = Math.Abs(bankTransaction.Amount);

            // Map category (using Description since Category field might not exist in new model)
            var category = MapCategory(null, bankTransaction.Description, null);

            var transaction = new Transaction
            {
                UserId = userId,
                Type = transactionType,
                Amount = amount,
                Category = category,
                Description = bankTransaction.Description ?? "Bank Transaction",
                Date = bankTransaction.TransactionDate ?? bankTransaction.ValueDate ?? DateTime.UtcNow,
                BankTransactionId = bankTransaction.TransactionId,
                BankAccountId = accountId,
                IsBankSynced = true,
                Notes = $"Imported from bank"
            };

            return transaction;
        }

        private async Task<bool> IsDuplicateTransactionAsync(
            string userId,
            string bankTransactionId,
            decimal amount,
            DateTime transactionDate,
            CancellationToken cancellationToken = default)
        {
            var existsById = await _context.Transactions
                .AnyAsync(t => t.UserId == userId && 
                              t.BankTransactionId == bankTransactionId, cancellationToken);

            if (existsById) return true;

            var dateStart = transactionDate.Date;
            var dateEnd = transactionDate.Date.AddDays(1);

            var existsByDetails = await _context.Transactions
                .AnyAsync(t => t.UserId == userId &&
                              t.IsBankSynced &&
                              Math.Abs(t.Amount - Math.Abs(amount)) < 0.01m &&
                              t.Date >= dateStart &&
                              t.Date < dateEnd, cancellationToken);

            return existsByDetails;
        }

        private string MapCategory(string? bankCategory, string? description, string? merchantName)
        {
            if (!string.IsNullOrEmpty(bankCategory))
            {
                var categoryLower = bankCategory.ToLowerInvariant();
                if (_categoryMapping.ContainsKey(categoryLower)) return _categoryMapping[categoryLower];
                foreach (var mapping in _categoryMapping)
                {
                    if (categoryLower.Contains(mapping.Key)) return mapping.Value;
                }
            }

            if (!string.IsNullOrEmpty(description))
            {
                var descLower = description.ToLowerInvariant();
                foreach (var mapping in _categoryMapping)
                {
                    if (descLower.Contains(mapping.Key)) return mapping.Value;
                }
            }

            return "Other";
        }
    }
}
