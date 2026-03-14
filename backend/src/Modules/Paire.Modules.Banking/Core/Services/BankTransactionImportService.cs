using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Finance.Core.DTOs;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;

namespace Paire.Modules.Banking.Core.Services;

public class BankTransactionImportService : IBankTransactionImportService
{
    private readonly FinanceDbContext _context;
    private readonly ILogger<BankTransactionImportService> _logger;

    private const int ManualDuplicateDateToleranceDays = 3;
    private static readonly decimal ManualDuplicateAmountTolerance = 0.01m;
    private static readonly decimal ManualDuplicateAmountRelativeTolerance = 0.01m;

    private static readonly Regex BankNoisePattern = new(@"(?i)\b(DEBIT|CREDIT|SEPA|REF\s*:?\s*\S+)\b", RegexOptions.Compiled);
    private static readonly Regex DatePattern = new(@"\d{1,2}/\d{1,2}(/\d{2,4})?", RegexOptions.Compiled);
    private static readonly Regex NonAlphanumericPattern = new(@"[^\p{L}\p{N}\s]", RegexOptions.Compiled);
    private static readonly Regex MultipleSpacesPattern = new(@"\s+", RegexOptions.Compiled);

    private readonly Dictionary<string, string> _categoryMapping = new()
    {
        { "groceries", "Food & Groceries" }, { "supermarket", "Food & Groceries" }, { "market", "Food & Groceries" },
        { "food", "Food & Dining" }, { "restaurant", "Food & Dining" }, { "dining", "Food & Dining" },
        { "transport", "Transportation" }, { "taxi", "Transportation" }, { "uber", "Transportation" },
        { "shopping", "Shopping" }, { "amazon", "Shopping" }, { "bill", "Bills & Utilities" },
        { "utilities", "Bills & Utilities" }, { "rent", "Rent/Mortgage" }, { "mortgage", "Rent/Mortgage" },
        { "entertainment", "Entertainment" }, { "spotify", "Subscription" }, { "netflix", "Subscription" },
        { "salary", "Salary" }, { "income", "Income" }, { "transfer", "Transfer" }, { "other", "other" }
    };

    public BankTransactionImportService(FinanceDbContext context, ILogger<BankTransactionImportService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public Task<BankTransactionImportResult> ImportTransactionsAsync(string userId, DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default) =>
        Task.FromResult(new BankTransactionImportResult());

    public Task<BankTransactionImportResult> ImportTransactionsForAccountAsync(string userId, string accountId, DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default) =>
        Task.FromResult(new BankTransactionImportResult());

    public async Task<BankTransactionImportResult> ProcessImportedTransactionsAsync(string userId, List<ImportedTransactionDTO> transactions, CancellationToken cancellationToken, ImportHistory? importHistory = null)
    {
        var result = new BankTransactionImportResult();
        if (!transactions.Any()) return result;

        if (importHistory != null) { await _context.ImportHistories.AddAsync(importHistory, cancellationToken); await _context.SaveChangesAsync(cancellationToken); }

        var newTransactions = new List<Transaction>();
        var latestDate = DateTime.MinValue;
        var incomingIds = transactions.Select(t => t.TransactionId).ToList();
        var existingIds = await _context.Transactions.Where(t => t.UserId == userId && t.BankTransactionId != null && incomingIds.Contains(t.BankTransactionId)).Select(t => t.BankTransactionId!).ToListAsync(cancellationToken);
        var existingIdsSet = new HashSet<string>(existingIds);

        foreach (var dto in transactions)
        {
            if (existingIdsSet.Contains(dto.TransactionId)) { result.DuplicatesSkipped++; continue; }
            if (await ExistsMatchingManualTransactionAsync(userId, dto, cancellationToken)) { result.DuplicatesSkipped++; result.ManualDuplicatesSkipped++; continue; }
            try
            {
                var transaction = MapDtoToAppTransaction(dto, userId);
                if (importHistory != null) transaction.ImportHistoryId = importHistory.Id;
                newTransactions.Add(transaction);
                if (transaction.Date > latestDate) latestDate = transaction.Date;
            }
            catch (Exception ex) { _logger.LogError(ex, "Error mapping transaction {Id}", dto.TransactionId); result.Errors++; result.ErrorMessages.Add($"Error processing transaction {dto.Description}: {ex.Message}"); }
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

    private Transaction MapDtoToAppTransaction(ImportedTransactionDTO dto, string userId)
    {
        var amount = dto.Amount;
        var type = amount < 0 ? "expense" : "income";
        var absAmount = Math.Abs(amount);
        return new Transaction
        {
            Id = Guid.NewGuid(), UserId = userId, Type = type, Amount = absAmount,
            Category = MapCategory(dto.Category, dto.Description), Description = dto.Description ?? "Imported Transaction",
            Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc), BankTransactionId = dto.TransactionId, IsBankSynced = true,
            PaidBy = "Bank", Notes = "Imported via Statement", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
    }

    private static string NormalizeDescriptionForMatch(string? description)
    {
        if (string.IsNullOrWhiteSpace(description)) return string.Empty;
        var s = description.Trim().ToLowerInvariant();
        s = BankNoisePattern.Replace(s, " "); s = DatePattern.Replace(s, " "); s = NonAlphanumericPattern.Replace(s, " "); s = MultipleSpacesPattern.Replace(s, " ").Trim();
        return s;
    }

    private static bool DescriptionsMatch(string? manualDesc, string? bankDesc)
    {
        var normManual = NormalizeDescriptionForMatch(manualDesc); var normBank = NormalizeDescriptionForMatch(bankDesc);
        if (string.IsNullOrEmpty(normManual) && string.IsNullOrEmpty(normBank)) return true;
        if (string.IsNullOrEmpty(normManual) || string.IsNullOrEmpty(normBank)) return true;
        if (normManual.Contains(normBank, StringComparison.Ordinal) || normBank.Contains(normManual, StringComparison.Ordinal)) return true;
        var manualWords = normManual.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 2).ToHashSet();
        var bankWords = normBank.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 2).ToHashSet();
        return manualWords.Overlaps(bankWords);
    }

    private async Task<bool> ExistsMatchingManualTransactionAsync(string userId, ImportedTransactionDTO dto, CancellationToken cancellationToken)
    {
        var absAmount = Math.Abs(dto.Amount);
        var dtoDateUtc = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc);
        var dateMin = dtoDateUtc.AddDays(-ManualDuplicateDateToleranceDays); var dateMax = dtoDateUtc.AddDays(ManualDuplicateDateToleranceDays);
        var amountTolerance = absAmount >= 1 ? absAmount * ManualDuplicateAmountRelativeTolerance : ManualDuplicateAmountTolerance;
        if (amountTolerance < ManualDuplicateAmountTolerance) amountTolerance = ManualDuplicateAmountTolerance;

        var candidates = await _context.Transactions
            .Where(t => t.UserId == userId && t.BankTransactionId == null && t.ImportHistoryId == null && t.Date >= dateMin && t.Date <= dateMax && t.Amount >= absAmount - amountTolerance && t.Amount <= absAmount + amountTolerance)
            .Select(t => new { t.Description, t.Amount }).ToListAsync(cancellationToken);

        foreach (var c in candidates)
        {
            var amountMatch = Math.Abs(c.Amount - absAmount) < ManualDuplicateAmountTolerance || (absAmount > 0 && Math.Abs(c.Amount - absAmount) / Math.Max(c.Amount, absAmount) <= ManualDuplicateAmountRelativeTolerance);
            if (!amountMatch) continue;
            if (DescriptionsMatch(c.Description, dto.Description)) return true;
        }
        return false;
    }

    private string MapCategory(string? bankCategory, string? description)
    {
        if (!string.IsNullOrEmpty(bankCategory)) { var lower = bankCategory.ToLowerInvariant(); foreach (var kv in _categoryMapping) if (lower.Contains(kv.Key)) return kv.Value; }
        if (!string.IsNullOrEmpty(description)) { var lower = description.ToLowerInvariant(); foreach (var kv in _categoryMapping) if (lower.Contains(kv.Key)) return kv.Value; }
        return "Other";
    }
}
