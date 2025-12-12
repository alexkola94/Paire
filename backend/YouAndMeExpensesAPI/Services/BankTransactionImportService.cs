using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using Going.Plaid.Entity; // For Plaid Transaction types

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for importing bank transactions into the app's transaction system
    /// Automatically maps bank transactions to expenses/income and detects duplicates
    /// </summary>
    public class BankTransactionImportService : IBankTransactionImportService
    {
        private readonly AppDbContext _context;
        private readonly IPlaidService _plaidService;
        private readonly ILogger<BankTransactionImportService> _logger;

        // Category mapping from bank categories to app categories
        private readonly Dictionary<string, string> _categoryMapping = new()
        {
            // Food & Dining
            { "groceries", "Food & Groceries" },
            { "supermarket", "Food & Groceries" },
            { "market", "Food & Groceries" },
            { "food", "Food & Dining" },
            { "restaurant", "Food & Dining" },
            { "dining", "Food & Dining" },
            { "coffee", "Food & Dining" },
            { "cafe", "Food & Dining" },
            { "starbucks", "Food & Dining" },
            { "mcdonald", "Food & Dining" },
            { "burger", "Food & Dining" },
            { "pizza", "Food & Dining" },
            { "bakery", "Food & Groceries" },
            
            // Transportation
            { "transport", "Transportation" },
            { "taxi", "Transportation" },
            { "uber", "Transportation" },
            { "lyft", "Transportation" },
            { "fuel", "Transportation" },
            { "gas", "Transportation" },
            { "petrol", "Transportation" },
            { "train", "Transportation" },
            { "bus", "Transportation" },
            { "metro", "Transportation" },

            { "parking", "Transportation" },
            { "airline", "Transportation" },
            { "flight", "Transportation" },
            { "travel", "Transportation" },

            // Shopping
            { "shopping", "Shopping" },
            { "retail", "Shopping" },
            { "amazon", "Shopping" },
            { "clothing", "Shopping" },
            { "fashion", "Shopping" },
            { "store", "Shopping" },

            // Bills & Utilities
            { "bill", "Bills & Utilities" },
            { "utilities", "Bills & Utilities" },
            { "electric", "Bills & Utilities" },
            { "water", "Bills & Utilities" },
            { "energy", "Bills & Utilities" },
            { "phone", "Phone" },
            { "mobile", "Phone" },
            { "internet", "Internet" },
            { "broadband", "Internet" },
            { "rent", "Rent/Mortgage" },
            { "mortgage", "Rent/Mortgage" },
            
            // Entertainment
            { "entertainment", "Entertainment" },
            { "movie", "Entertainment" },
            { "cinema", "Entertainment" },
            { "theatre", "Entertainment" },
            { "spotify", "Subscription" },
            { "netflix", "Subscription" },
            { "prime", "Subscription" },
            { "subscription", "Subscription" },

            // Health
            { "health", "Healthcare" },
            { "medical", "Healthcare" },
            { "pharmacy", "Healthcare" },
            { "doctor", "Healthcare" },
            { "gym", "Gym/Fitness" },
            { "fitness", "Gym/Fitness" },
            { "sport", "Gym/Fitness" },

            // Income / Financial
            { "salary", "Salary" },
            { "payroll", "Salary" },
            { "income", "Income" },
            { "interest", "Investment" }, // Map interest to Investment or Other Income
            { "dividend", "Investment" },
            { "transfer", "Transfer" },
            { "credit", "Income" },
            
            // Insurance
            { "insurance", "Insurance" },
            { "assurance", "Insurance" },

            // Fallback
            { "other", "other" }
        };

        public BankTransactionImportService(
            AppDbContext context,
            IPlaidService plaidService,
            ILogger<BankTransactionImportService> logger)
        {
            _context = context;
            _plaidService = plaidService;
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
                // Get active bank connections
                var bankConnections = await _context.Set<BankConnection>()
                    .Where(bc => bc.UserId == userId && bc.IsActive)
                    .ToListAsync(cancellationToken);

                if (!bankConnections.Any())
                {
                    _logger.LogWarning($"No active bank connection found for user {userId}");
                    result.ErrorMessages.Add("No active bank connection found");
                    return result;
                }

                if (!fromDate.HasValue) fromDate = DateTime.UtcNow.AddDays(-30);
                if (!toDate.HasValue) toDate = DateTime.UtcNow;

                foreach(var connection in bankConnections)
                {
                    // Plaid Access Token is on the connection
                    // We can import for all accounts in this connection at once if we use Plaid's GetTransactions (it returns for all accounts in Item)
                    // But our method structure iterates accounts.
                    // We can optimize/refactor or just fetch per account (Plaid GetTransactions allows filtering by account_ids, 
                    // but usually you fetch all for item and filter in memory).
                    
                    // fetch all for this connection
                    try
                    {
                        var (plaidTransactions, plaidAccounts) = await _plaidService.GetTransactionsAsync(connection.AccessToken, fromDate.Value, toDate.Value);
                        
                        // Process per account
                        // First get stored accounts for this connection
                         var accounts = await _context.Set<StoredBankAccount>()
                            .Where(a => a.UserId == userId && a.BankConnectionId == connection.Id)
                            .ToListAsync(cancellationToken);

                        foreach(var account in accounts)
                        {
                            var accountTransactions = plaidTransactions.Where(t => t.AccountId == account.AccountId).ToList();
                            
                            // Check if first sync (before processing new ones)
                            bool isFirstSync = !await _context.Transactions.AnyAsync(t => t.BankAccountId == account.AccountId, cancellationToken);

                            // Process transactions
                            var accountResult = await ProcessTransactionsAsync(userId, account.AccountId, accountTransactions, cancellationToken);
                             
                             result.TotalImported += accountResult.TotalImported;
                             result.DuplicatesSkipped += accountResult.DuplicatesSkipped;
                             result.Errors += accountResult.Errors;
                             result.ErrorMessages.AddRange(accountResult.ErrorMessages);

                             // Update Account Balance
                             var plaidAccount = plaidAccounts.FirstOrDefault(a => a.AccountId == account.AccountId);
                             if (plaidAccount != null && plaidAccount.Balances.Current.HasValue)
                             {
                                 account.CurrentBalance = plaidAccount.Balances.Current.Value;
                                 account.Currency = plaidAccount.Balances.IsoCurrencyCode ?? account.Currency;
                                 account.LastBalanceUpdate = DateTime.UtcNow;

                                 // Opening Balance Logic for First Sync
                                 if (isFirstSync && accountTransactions.Any())
                                 {
                                     // Calculate Net Change from the imported transactions
                                     // Plaid: +ve = expense, -ve = income
                                     // Net Change to Balance = Sum(Income) - Sum(Expense)
                                     // Income = -Amount (if negative), Expense = Amount (if positive)
                                     // Change = (-Amount) - Amount = -Amount
                                     // So Net Change = Sum(-Amount)
                                     
                                     decimal netChange = accountTransactions.Sum(t => -(t.Amount ?? 0));
                                     decimal openingBalanceAmount = account.CurrentBalance.Value - netChange;
                                     
                                     // Find the date for opening balance (before the first transaction)
                                     var firstTxDate = accountTransactions.Min(t => t.Date?.ToDateTime(TimeOnly.MinValue) ?? DateTime.UtcNow);
                                     var openingDate = firstTxDate.AddSeconds(-1);
                                     if (openingDate.Kind != DateTimeKind.Utc) openingDate = openingDate.ToUniversalTime();

                                     var openingTx = new YouAndMeExpensesAPI.Models.Transaction
                                     {
                                         Id = Guid.NewGuid(),
                                         UserId = userId,
                                         Type = openingBalanceAmount >= 0 ? "income" : "expense",
                                         Amount = Math.Abs(openingBalanceAmount),
                                         Category = "Income", // Or "Opening Balance" if available
                                         Description = "Opening Balance",
                                         Date = openingDate,
                                         BankAccountId = account.AccountId,
                                         IsBankSynced = true,
                                         Notes = "Auto-generated Opening Balance",
                                         CreatedAt = DateTime.UtcNow,
                                         UpdatedAt = DateTime.UtcNow
                                     };
                                     _context.Transactions.Add(openingTx);
                                     result.TotalImported++; // Count this as imported
                                 }
                             }
                        }

                        // Update last sync
                        connection.LastSyncAt = DateTime.UtcNow;
                        connection.UpdatedAt = DateTime.UtcNow;
                    }
                    catch(Exception ex)
                    {
                         _logger.LogError(ex, $"Error fetching transactions from Plaid for connection {connection.Id}");
                         result.Errors++;
                         result.ErrorMessages.Add($"Plaid Sync Error: {ex.Message}");
                    }
                }
                
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

        // Implementation to support interface method (imports for single account)
        // Note: For Plaid, fetching single account typically means fetching Item (connection) transactions and filtering.
        // This method wraps that logic.
        public async Task<BankTransactionImportResult> ImportTransactionsForAccountAsync(
             string userId,
             string accountId,
             DateTime? fromDate = null,
             DateTime? toDate = null,
             CancellationToken cancellationToken = default)
        {
             // This logic is redundant if we use ImportTransactionsAsync, but implementing for interface completeness
             // Find connection for this account
             var account = await _context.Set<StoredBankAccount>().FirstOrDefaultAsync(a => a.AccountId == accountId && a.UserId == userId);
             if(account == null) return new BankTransactionImportResult { ErrorMessages = { "Account not found" } };

             var connection = await _context.Set<BankConnection>().FirstOrDefaultAsync(c => c.Id == account.BankConnectionId);
             if(connection == null) return new BankTransactionImportResult { ErrorMessages = { "Connection not found" } };

             if (!fromDate.HasValue) fromDate = DateTime.UtcNow.AddDays(-30);
             if (!toDate.HasValue) toDate = DateTime.UtcNow;

             try
             {
                 var (plaidTransactions, _) = await _plaidService.GetTransactionsAsync(connection.AccessToken, fromDate.Value, toDate.Value);
                 var accountTransactions = plaidTransactions.Where(t => t.AccountId == accountId).ToList();
                 return await ProcessTransactionsAsync(userId, accountId, accountTransactions, cancellationToken);
             }
             catch(Exception ex)
             {
                  return new BankTransactionImportResult { Errors = 1, ErrorMessages = { ex.Message } };
             }
        }


        private async Task<BankTransactionImportResult> ProcessTransactionsAsync(
            string userId, 
            string accountId, 
            List<Going.Plaid.Entity.Transaction> transactions,
            CancellationToken cancellationToken)
        {
            var result = new BankTransactionImportResult();
            
            foreach (var pt in transactions)
            {
                try
                {
                    var txDate = pt.Date?.ToDateTime(TimeOnly.MinValue) ?? DateTime.UtcNow; // Safe nullable conversion

                    // Duplicate Check
                    var isDuplicate = await IsDuplicateTransactionAsync(userId, pt.TransactionId, pt.Amount ?? 0, txDate, cancellationToken);
                    if (isDuplicate) 
                    {
                        result.DuplicatesSkipped++;
                        continue;
                    }

                    // Map
                    var appTransaction = MapPlaidTransactionToAppTransaction(pt, userId, accountId);
                    
                    if (appTransaction.Date.Kind != DateTimeKind.Utc)
                        appTransaction.Date = appTransaction.Date.ToUniversalTime();

                    _context.Transactions.Add(appTransaction);
                    result.TotalImported++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing plad transaction");
                    result.Errors++;
                }
            }

            return result;
        }

        private YouAndMeExpensesAPI.Models.Transaction MapPlaidTransactionToAppTransaction(
            Going.Plaid.Entity.Transaction pt,
            string userId,
            string accountId)
        {
            // Plaid convention: positive amount = expense, negative = income
            // App convention: determined by 'Type' string. Amount stores absolute usually?
            // Existing logic: Type='expense'|'income'. Amount is stored as positive decimal.
            
            var amount = pt.Amount ?? 0;
            var type = amount >= 0 ? "expense" : "income";
            var absAmount = Math.Abs(amount);

            // Category mapping
            // Plaid provides Category (list of strings) and PersonalFinanceCategory (object)
            string categoryName = "Other";

            // 1. Try PersonalFinanceCategory (v2) - most accurate
            if (pt.PersonalFinanceCategory != null && !string.IsNullOrEmpty(pt.PersonalFinanceCategory.Primary))
            {
                 var mapped = MapCategory(pt.PersonalFinanceCategory.Primary, pt.Name);
                 if (mapped != "Other") categoryName = mapped;
            }

            // 2. Fallback to legacy Category list if still "Other"
            if (categoryName == "Other" && pt.Category != null && pt.Category.Any())
            {
                // Try to map from the specific category
                foreach(var cat in pt.Category)
                {
                     var mapped = MapCategory(cat, pt.Name);
                     if(mapped != "Other") { categoryName = mapped; break; }
                }
                // Fallback to first if still other
                if(categoryName == "Other") categoryName = MapCategory(pt.Category.Last(), pt.Name);
            }

            return new YouAndMeExpensesAPI.Models.Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = type,
                Amount = absAmount,
                Category = categoryName,
                Description = pt.Name ?? "Plaid Transaction",
                Date = pt.Date?.ToDateTime(TimeOnly.MinValue) ?? DateTime.UtcNow,
                BankTransactionId = pt.TransactionId,
                BankAccountId = accountId,
                IsBankSynced = true,
                PaidBy = "Bank", // Explicitly tag as paid by Bank for frontend logic
                Notes = "Imported from Plaid",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        private async Task<bool> IsDuplicateTransactionAsync(
            string userId,
            string bankTransactionId,
            decimal amount,
            DateTime transactionDate,
            CancellationToken cancellationToken = default)
        {
            // Check by ID
            var existsById = await _context.Transactions
                .AnyAsync(t => t.UserId == userId && t.BankTransactionId == bankTransactionId, cancellationToken);
            if (existsById) return true;

            return false; // For now relies on ID. 
        }

        private string MapCategory(string? bankCategory, string? description)
        {
            if (!string.IsNullOrEmpty(bankCategory))
            {
                var lower = bankCategory.ToLowerInvariant();
                foreach (var mapping in _categoryMapping)
                {
                    if (lower.Contains(mapping.Key)) return mapping.Value;
                }
            }
            if (!string.IsNullOrEmpty(description))
            {
                var lower = description.ToLowerInvariant();
                foreach (var mapping in _categoryMapping)
                {
                     if (lower.Contains(mapping.Key)) return mapping.Value;
                }
            }
            return "Other";
        }
    }
}
