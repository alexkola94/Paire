using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;


namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for importing bank transactions into the app's transaction system
    /// Automatically maps bank transactions to expenses/income and detects duplicates
    /// </summary>
    /// <summary>
    /// Service for importing bank transactions into the app's transaction system
    /// Automatically maps bank transactions to expenses/income and detects duplicates.
    /// Now generic and supports imports from CSVs/Excel via DTOs.
    /// </summary>
    public class BankTransactionImportService : IBankTransactionImportService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BankTransactionImportService> _logger;

        /// <summary>Days tolerance for matching manual transactions (bank posting delay).</summary>
        private const int ManualDuplicateDateToleranceDays = 3;

        /// <summary>Amount tolerance for matching manual transactions (rounding).</summary>
        private static readonly decimal ManualDuplicateAmountTolerance = 0.01m;

        /// <summary>Relative amount tolerance (e.g. 1%) when matching manual transactions.</summary>
        private static readonly decimal ManualDuplicateAmountRelativeTolerance = 0.01m;

        // Regex patterns for normalizing descriptions (strip bank boilerplate)
        private static readonly Regex BankNoisePattern = new(@"(?i)\b(DEBIT|CREDIT|SEPA|REF\s*:?\s*\S+)\b", RegexOptions.Compiled);
        private static readonly Regex DatePattern = new(@"\d{1,2}/\d{1,2}(/\d{2,4})?", RegexOptions.Compiled);
        private static readonly Regex NonAlphanumericPattern = new(@"[^\p{L}\p{N}\s]", RegexOptions.Compiled);
        private static readonly Regex MultipleSpacesPattern = new(@"\s+", RegexOptions.Compiled);

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
            { "interest", "Investment" }, 
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
            ILogger<BankTransactionImportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public Task<BankTransactionImportResult> ImportTransactionsAsync(
            string userId,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            // NOT IMPLEMENTED: Since we removed Plaid, we don't have a way to auto-fetch transactions for all accounts anymore
            // This method is kept to satisfy the interface, or it could be deprecated/removed.
            // For now, we'll return an empty result or throw.
            return Task.FromResult(new BankTransactionImportResult());
        }

        public Task<BankTransactionImportResult> ImportTransactionsForAccountAsync(
             string userId,
             string accountId,
             DateTime? fromDate = null,
             DateTime? toDate = null,
             CancellationToken cancellationToken = default)
        {
             // Not implemented for similar reasons as above.
             return Task.FromResult(new BankTransactionImportResult());
        }
        
        // <summary>
        // Process a list of generic ImportedTransactionDTOs from CSV/Excel
        // </summary>
        public async Task<BankTransactionImportResult> ProcessImportedTransactionsAsync(
            string userId,
            List<ImportedTransactionDTO> transactions,
            CancellationToken cancellationToken,
            ImportHistory? importHistory = null)
        {
            var result = new BankTransactionImportResult();
            if (!transactions.Any()) return result;

            if (importHistory != null)
            {
                await _context.ImportHistories.AddAsync(importHistory, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }

            var newTransactions = new List<Transaction>();
            var latestDate = DateTime.MinValue;

            // Get existing transaction IDs to avoid duplicates
            // We'll check against existing BankTransactionIds where they are not null
            // For imported CSVs, we are generating deterministic IDs based on content
            var incomingIds = transactions.Select(t => t.TransactionId).ToList();
            
            var existingIds = await _context.Transactions
                .Where(t => t.UserId == userId && t.BankTransactionId != null && incomingIds.Contains(t.BankTransactionId))
                .Select(t => t.BankTransactionId!)
                .ToListAsync(cancellationToken);

            var existingIdsSet = new HashSet<string>(existingIds);

            foreach (var dto in transactions)
            {
                // Skip if already imported (re-import of same statement)
                if (existingIdsSet.Contains(dto.TransactionId))
                {
                    result.DuplicatesSkipped++;
                    continue;
                }

                // Skip if a manual transaction already exists with same date/amount (avoid end-of-month duplicate)
                if (await ExistsMatchingManualTransactionAsync(userId, dto, cancellationToken))
                {
                    result.DuplicatesSkipped++;
                    result.ManualDuplicatesSkipped++;
                    continue;
                }

                try 
                {
                    var transaction = MapDtoToAppTransaction(dto, userId);
                    
                    if (importHistory != null)
                    {
                        transaction.ImportHistoryId = importHistory.Id;
                    }

                    newTransactions.Add(transaction);

                    if (transaction.Date > latestDate)
                    {
                        latestDate = transaction.Date;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error mapping transaction {Id}", dto.TransactionId);
                    result.Errors++;
                    result.ErrorMessages.Add($"Error processing transaction {dto.Description}: {ex.Message}");
                }
            }

            if (newTransactions.Any())
            {
                await _context.Transactions.AddRangeAsync(newTransactions, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                
                result.TotalImported = newTransactions.Count;
                result.LastTransactionDate = latestDate > DateTime.MinValue ? latestDate : null;
            }
            
            return result;
        }
        private YouAndMeExpensesAPI.Models.Transaction MapDtoToAppTransaction(
            ImportedTransactionDTO dto,
            string userId)
        {
            // Assume dto.Amount is signed: negative for expense, positive for income (or handled by caller)
            // Convention from most CSVs: -10.00 is expense, +10.00 is income.
            // App internal: Amount is absolute, Type is "expense" or "income".
            
            var amount = dto.Amount;
            var type = amount < 0 ? "expense" : "income"; // Negative = Money leaving = Expense
            var absAmount = Math.Abs(amount);

            // Category mapping
            string categoryName = MapCategory(dto.Category, dto.Description);

            return new YouAndMeExpensesAPI.Models.Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = type,
                Amount = absAmount,
                Category = categoryName,
                Description = dto.Description ?? "Imported Transaction",
                Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc),
                BankTransactionId = dto.TransactionId,
                // BankAccountId = null, // CSV imports might not be linked to a stored "Bank Account" entity yet, or we could pass it in.
                IsBankSynced = true,
                PaidBy = "Bank", 
                Notes = "Imported via Statement",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,

            };
        }

        private async Task<bool> IsDuplicateTransactionAsync(
            string userId,
            string bankTransactionId,
            decimal amount,
            DateTime transactionDate,
            CancellationToken cancellationToken = default)
        {
            // Check by ID first
            if (!string.IsNullOrEmpty(bankTransactionId))
            {
                var existsById = await _context.Transactions
                    .AnyAsync(t => t.UserId == userId && t.BankTransactionId == bankTransactionId, cancellationToken);
                if (existsById) return true;
            }

            // Fuzzy check for CSVs that might not have stable IDs? 
            // For now, rely on caller providing a deterministic ID (e.g. hash of date+amount+desc)
            return false; 
        }

        /// <summary>
        /// Normalizes a description for comparison: lowercase, strip bank noise (DEBIT/CREDIT/REF/dates), collapse spaces.
        /// </summary>
        private static string NormalizeDescriptionForMatch(string? description)
        {
            if (string.IsNullOrWhiteSpace(description)) return string.Empty;
            var s = description.Trim().ToLowerInvariant();
            s = BankNoisePattern.Replace(s, " ");
            s = DatePattern.Replace(s, " ");
            s = NonAlphanumericPattern.Replace(s, " ");
            s = MultipleSpacesPattern.Replace(s, " ").Trim();
            return s;
        }

        /// <summary>
        /// Returns true if the two descriptions match for duplicate detection: one contains the other,
        /// or they share at least one meaningful word (length > 2). If both normalize to empty, we consider it a match (date+amount only).
        /// </summary>
        private static bool DescriptionsMatch(string? manualDesc, string? bankDesc)
        {
            var normManual = NormalizeDescriptionForMatch(manualDesc);
            var normBank = NormalizeDescriptionForMatch(bankDesc);
            if (string.IsNullOrEmpty(normManual) && string.IsNullOrEmpty(normBank))
                return true;
            if (string.IsNullOrEmpty(normManual) || string.IsNullOrEmpty(normBank))
                return true;
            if (normManual.Contains(normBank, StringComparison.Ordinal) || normBank.Contains(normManual, StringComparison.Ordinal))
                return true;
            var manualWords = normManual.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 2).ToHashSet();
            var bankWords = normBank.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 2).ToHashSet();
            return manualWords.Overlaps(bankWords);
        }

        /// <summary>
        /// Returns true if a manual transaction already exists that matches this imported row
        /// (same user, date within tolerance, amount within tolerance, description match). Used to avoid
        /// duplicating manually entered bills/income when importing the end-of-month statement.
        /// </summary>
        private async Task<bool> ExistsMatchingManualTransactionAsync(
            string userId,
            ImportedTransactionDTO dto,
            CancellationToken cancellationToken)
        {
            var absAmount = Math.Abs(dto.Amount);
            var dtoDateUtc = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc);
            var dateMin = dtoDateUtc.AddDays(-ManualDuplicateDateToleranceDays);
            var dateMax = dtoDateUtc.AddDays(ManualDuplicateDateToleranceDays);
            // Widen amount window for candidate fetch: absolute 0.01 or 1% of amount, whichever is larger
            var amountTolerance = absAmount >= 1 ? absAmount * ManualDuplicateAmountRelativeTolerance : ManualDuplicateAmountTolerance;
            if (amountTolerance < ManualDuplicateAmountTolerance) amountTolerance = ManualDuplicateAmountTolerance;
            var amountMin = absAmount - amountTolerance;
            var amountMax = absAmount + amountTolerance;

            var candidates = await _context.Transactions
                .Where(t =>
                    t.UserId == userId
                    && t.BankTransactionId == null
                    && t.ImportHistoryId == null
                    && t.Date >= dateMin
                    && t.Date <= dateMax
                    && t.Amount >= amountMin
                    && t.Amount <= amountMax)
                .Select(t => new { t.Description, t.Amount })
                .ToListAsync(cancellationToken);

            // In-memory: apply exact amount rule (absolute or relative) and description match
            foreach (var c in candidates)
            {
                var amountMatch = Math.Abs(c.Amount - absAmount) < ManualDuplicateAmountTolerance
                    || (absAmount > 0 && Math.Abs(c.Amount - absAmount) / Math.Max(c.Amount, absAmount) <= ManualDuplicateAmountRelativeTolerance);
                if (!amountMatch) continue;
                if (DescriptionsMatch(c.Description, dto.Description))
                    return true;
            }

            return false;
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
