using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;
using Paire.Shared.Infrastructure.Services;

namespace Paire.Modules.Finance.Core.Services;

public class RecurringBillsService : IRecurringBillsService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IBudgetService _budgetService;
    private readonly IStorageService _storageService;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly ILogger<RecurringBillsService> _logger;

    private const int EarlyPaymentLeadDays = 7;

    public RecurringBillsService(
        FinanceDbContext dbContext, IBudgetService budgetService,
        IStorageService storageService, IPartnershipResolver partnershipResolver,
        ILogger<RecurringBillsService> logger)
    {
        _dbContext = dbContext;
        _budgetService = budgetService;
        _storageService = storageService;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<IReadOnlyList<object>> GetRecurringBillsAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());

        var bills = await _dbContext.RecurringBills
            .Where(b => allUserIds.Contains(b.UserId))
            .Include(b => b.Attachments)
            .OrderBy(b => b.NextDueDate)
            .AsNoTracking()
            .ToListAsync();

        var userIds = bills.Select(b => b.UserId).Distinct().ToList();
        var userProfiles = await _dbContext.UserProfiles.Where(up => userIds.Contains(up.Id.ToString())).AsNoTracking().ToListAsync();
        var profileDict = userProfiles.ToDictionary(p => p.Id.ToString(), p => new { id = p.Id, email = p.Email, display_name = p.DisplayName, avatar_url = p.AvatarUrl });

        var billIds = bills.Select(b => b.Id).ToList();
        var transactionsWithBillTag = await _dbContext.Transactions
            .Where(t => allUserIds.Contains(t.UserId) && t.Notes != null && t.Notes.Contains("[RecurringBill:"))
            .Select(t => new { t.Date, t.Notes })
            .ToListAsync();

        const string prefix = "[RecurringBill:";
        const string duePrefix = "[Due:";

        var paymentInfoByBill = new Dictionary<Guid, List<(DateTime paymentDateUtc, DateTime? coveredDueDateUtc)>>();
        foreach (var t in transactionsWithBillTag)
        {
            if (string.IsNullOrEmpty(t.Notes)) continue;
            var start = t.Notes.IndexOf(prefix, StringComparison.Ordinal);
            if (start < 0) continue;
            start += prefix.Length;
            var end = t.Notes.IndexOf(']', start);
            if (end < 0) continue;
            var guidStr = t.Notes.Substring(start, end - start);
            if (!Guid.TryParse(guidStr, out var bid) || !billIds.Contains(bid)) continue;

            var dateUtc = t.Date.Kind == DateTimeKind.Utc ? t.Date : t.Date.ToUniversalTime();
            DateTime? coveredDueDateUtc = null;
            var dueStart = t.Notes.IndexOf(duePrefix, StringComparison.Ordinal);
            if (dueStart >= 0)
            {
                dueStart += duePrefix.Length;
                var dueEnd = t.Notes.IndexOf(']', dueStart);
                if (dueEnd > dueStart)
                {
                    var dueStr = t.Notes.Substring(dueStart, dueEnd - dueStart);
                    if (DateTime.TryParseExact(dueStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dueDate))
                        coveredDueDateUtc = dueDate.Date;
                }
            }

            if (!paymentInfoByBill.TryGetValue(bid, out var list))
            {
                list = new List<(DateTime, DateTime?)>();
                paymentInfoByBill[bid] = list;
            }
            list.Add((dateUtc, coveredDueDateUtc));
        }

        var todayUtc = DateTime.UtcNow.Date;

        return bills.Select(b =>
        {
            var previousDueDate = CalculatePreviousDueDate(b.Frequency, b.DueDay, b.NextDueDate);
            paymentInfoByBill.TryGetValue(b.Id, out var paymentInfos);

            DateTime? lastPaymentDate = paymentInfos != null && paymentInfos.Count > 0
                ? paymentInfos.Max(pi => (DateTime?)pi.paymentDateUtc) : null;

            DateTime? lastPaidDueDateFromTag = paymentInfos?.Where(pi => pi.coveredDueDateUtc.HasValue).Select(pi => pi.coveredDueDateUtc).DefaultIfEmpty().Max();
            DateTime? lastPaidDueDate = lastPaidDueDateFromTag;

            if (!lastPaidDueDate.HasValue && lastPaymentDate.HasValue)
            {
                var legacyWindowStart = previousDueDate.AddDays(-EarlyPaymentLeadDays);
                if (lastPaymentDate.Value >= legacyWindowStart) lastPaidDueDate = previousDueDate.Date;
            }

            var nextDueNormalized = b.NextDueDate.Kind == DateTimeKind.Utc ? b.NextDueDate : b.NextDueDate.ToUniversalTime();
            var isOverdue = nextDueNormalized.Date < todayUtc;
            var isPaid = lastPaidDueDate.HasValue && lastPaidDueDate.Value.Date == previousDueDate.Date && !isOverdue;

            return new
            {
                id = b.Id, userId = b.UserId, name = b.Name, amount = b.Amount,
                category = b.Category, frequency = b.Frequency, dueDay = b.DueDay,
                nextDueDate = b.NextDueDate, autoPay = b.AutoPay, reminderDays = b.ReminderDays,
                isActive = b.IsActive, isPaid, lastPaidDueDate, lastPaymentDate,
                notes = b.Notes, createdAt = b.CreatedAt, updatedAt = b.UpdatedAt,
                user_profiles = profileDict.ContainsKey(b.UserId) ? profileDict[b.UserId] : null,
                attachments = b.Attachments.Select(a => new { id = a.Id, fileUrl = a.FileUrl, fileName = a.FileName, uploadedAt = a.UploadedAt }).ToList()
            };
        }).Cast<object>().ToList();
    }

    public async Task<RecurringBill?> GetRecurringBillAsync(Guid userId, Guid billId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        return await _dbContext.RecurringBills.AsNoTracking().FirstOrDefaultAsync(b => b.Id == billId && allUserIds.Contains(b.UserId));
    }

    public async Task<RecurringBill> CreateRecurringBillAsync(Guid userId, RecurringBill bill)
    {
        bill.Id = Guid.NewGuid();
        bill.UserId = userId.ToString();
        bill.CreatedAt = DateTime.UtcNow;
        bill.UpdatedAt = DateTime.UtcNow;
        bill.IsActive = true;
        bill.NextDueDate = CalculateNextDueDate(bill.Frequency, bill.DueDay, null);
        bill.NextDueDate = EnsureUtc(bill.NextDueDate);
        if (string.IsNullOrEmpty(bill.Frequency)) bill.Frequency = "monthly";
        if (bill.ReminderDays <= 0) bill.ReminderDays = 3;

        _dbContext.RecurringBills.Add(bill);
        await _dbContext.SaveChangesAsync();
        return bill;
    }

    public async Task<RecurringBill?> UpdateRecurringBillAsync(Guid userId, Guid billId, RecurringBill updates)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var existingBill = await _dbContext.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId && allUserIds.Contains(b.UserId));
        if (existingBill == null) return null;

        var scheduleChanged = !string.Equals(existingBill.Frequency, updates.Frequency, StringComparison.OrdinalIgnoreCase) || existingBill.DueDay != updates.DueDay;
        existingBill.Name = updates.Name;
        existingBill.Amount = updates.Amount;
        existingBill.Category = updates.Category;
        existingBill.Frequency = updates.Frequency;
        existingBill.DueDay = updates.DueDay;
        existingBill.AutoPay = updates.AutoPay;
        existingBill.ReminderDays = updates.ReminderDays;
        existingBill.IsActive = updates.IsActive;
        existingBill.Notes = updates.Notes;
        existingBill.UpdatedAt = DateTime.UtcNow;

        if (scheduleChanged)
            existingBill.NextDueDate = EnsureUtc(CalculateNextDueDate(existingBill.Frequency, existingBill.DueDay, null));

        await _dbContext.SaveChangesAsync();
        return existingBill;
    }

    public async Task<bool> DeleteRecurringBillAsync(Guid userId, Guid billId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var bill = await _dbContext.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId && allUserIds.Contains(b.UserId));
        if (bill == null) return false;
        _dbContext.RecurringBills.Remove(bill);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<RecurringBill?> MarkBillPaidAsync(Guid userId, Guid billId)
    {
        var bill = await _dbContext.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());
        if (bill == null) return null;

        var currentCycleDueDate = EnsureUtc(bill.NextDueDate);

        var newTransaction = new Transaction
        {
            Id = Guid.NewGuid(), UserId = userId.ToString(), Amount = bill.Amount,
            Type = "expense", Category = bill.Category, Description = bill.Name,
            Date = DateTime.UtcNow, PaidBy = "User",
            Notes = $"[RecurringBill:{bill.Id}][Due:{currentCycleDueDate:yyyy-MM-dd}]",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsBankSynced = false
        };

        _dbContext.Transactions.Add(newTransaction);
        bill.NextDueDate = EnsureUtc(CalculateNextDueDate(bill.Frequency, bill.DueDay, bill.NextDueDate));
        bill.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        await _budgetService.UpdateSpentAmountAsync(userId.ToString(), newTransaction.Category, newTransaction.Amount, newTransaction.Date);
        return bill;
    }

    public async Task<RecurringBill?> UnmarkBillPaidAsync(Guid userId, Guid billId)
    {
        var bill = await _dbContext.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());
        if (bill == null) return null;

        bill.NextDueDate = EnsureUtc(CalculatePreviousDueDate(bill.Frequency, bill.DueDay, bill.NextDueDate));
        bill.UpdatedAt = DateTime.UtcNow;

        var tag = $"[RecurringBill:{bill.Id}]";
        var recentTransaction = await _dbContext.Transactions
            .Where(t => t.UserId == userId.ToString() && t.Notes != null && t.Notes.Contains(tag))
            .OrderByDescending(t => t.Date)
            .FirstOrDefaultAsync();

        if (recentTransaction != null) _dbContext.Transactions.Remove(recentTransaction);
        await _dbContext.SaveChangesAsync();

        if (recentTransaction != null)
            await _budgetService.UpdateSpentAmountAsync(userId.ToString(), recentTransaction.Category, -recentTransaction.Amount, recentTransaction.Date);

        return bill;
    }

    public async Task<IReadOnlyList<RecurringBill>> GetUpcomingBillsAsync(Guid userId, int days)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var futureDate = DateTime.UtcNow.Date.AddDays(days);
        return await _dbContext.RecurringBills
            .Where(b => allUserIds.Contains(b.UserId) && b.IsActive && b.NextDueDate <= futureDate)
            .OrderBy(b => b.NextDueDate).AsNoTracking().ToListAsync();
    }

    public async Task<object> GetSummaryAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var bills = await _dbContext.RecurringBills.Where(b => allUserIds.Contains(b.UserId)).AsNoTracking().ToListAsync();
        var activeBills = bills.Where(b => b.IsActive).ToList();
        var today = DateTime.UtcNow.Date;

        return new
        {
            totalBills = bills.Count, activeBills = activeBills.Count,
            inactiveBills = bills.Count - activeBills.Count,
            totalMonthlyAmount = CalculateTotalMonthlyAmount(activeBills),
            totalYearlyAmount = CalculateTotalYearlyAmount(activeBills),
            upcomingBills = activeBills.Count(b => b.NextDueDate <= today.AddDays(7)),
            overdueBills = activeBills.Count(b => b.NextDueDate < today),
            billsByCategory = activeBills.GroupBy(b => b.Category).Select(g => new { category = g.Key, count = g.Count(), totalAmount = g.Sum(b => b.Amount) }).ToList(),
            billsByFrequency = activeBills.GroupBy(b => b.Frequency).Select(g => new { frequency = g.Key, count = g.Count() }).ToList()
        };
    }

    public async Task<object?> UploadAttachmentAsync(Guid userId, Guid billId, IFormFile file)
    {
        var bill = await _dbContext.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());
        if (bill == null) return null;

        var fileExtension = Path.GetExtension(file.FileName);
        var fileName = $"bill-attachments/{userId}/{Guid.NewGuid()}{fileExtension}";
        var url = await _storageService.UploadFileAsync(file, fileName, "receipts");

        var attachment = new RecurringBillAttachment
        {
            Id = Guid.NewGuid(), RecurringBillId = billId, FileUrl = url,
            FilePath = fileName, FileName = file.FileName, UploadedAt = DateTime.UtcNow
        };

        _dbContext.RecurringBillAttachments.Add(attachment);
        await _dbContext.SaveChangesAsync();
        return new { id = attachment.Id, fileUrl = attachment.FileUrl, fileName = attachment.FileName, uploadedAt = attachment.UploadedAt };
    }

    public async Task<bool> DeleteAttachmentAsync(Guid userId, Guid billId, Guid attachmentId)
    {
        var bill = await _dbContext.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());
        if (bill == null) return false;

        var attachment = await _dbContext.RecurringBillAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.RecurringBillId == billId);
        if (attachment == null) return false;

        if (!string.IsNullOrEmpty(attachment.FilePath))
            await _storageService.DeleteFileAsync(attachment.FilePath, "receipts");

        _dbContext.RecurringBillAttachments.Remove(attachment);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<List<string>> GetHouseholdIdsAsync(string userId)
    {
        try { return await _partnershipResolver.GetHouseholdUserIdsAsync(userId); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
            return new List<string> { userId };
        }
    }

    private static DateTime EnsureUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Unspecified => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
        _ => dt.ToUniversalTime()
    };

    private static DateTime CalculatePreviousDueDate(string frequency, int dueDay, DateTime currentDueDate)
    {
        currentDueDate = EnsureUtc(currentDueDate);
        return frequency.ToLower() switch
        {
            "weekly" => currentDueDate.AddDays(-7),
            "monthly" => BuildMonthlyDate(currentDueDate.AddMonths(-1), dueDay),
            "quarterly" => BuildMonthlyDate(currentDueDate.AddMonths(-3), dueDay),
            "yearly" => new DateTime(currentDueDate.AddYears(-1).Year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dueDay - 1),
            _ => CalculatePreviousDueDate("monthly", dueDay, currentDueDate)
        };
    }

    private static DateTime CalculateNextDueDate(string frequency, int dueDay, DateTime? currentDueDate)
    {
        var baseDate = EnsureUtc(currentDueDate ?? DateTime.UtcNow.Date);
        DateTime result;
        switch (frequency.ToLower())
        {
            case "weekly":
                var daysUntilDue = ((dueDay - (int)baseDate.DayOfWeek + 7) % 7);
                result = baseDate.AddDays(daysUntilDue == 0 ? 7 : daysUntilDue);
                break;
            case "monthly":
                var nextMonth = baseDate.AddMonths(currentDueDate.HasValue ? 1 : 0);
                result = BuildMonthlyDate(nextMonth, dueDay);
                if (result <= baseDate && !currentDueDate.HasValue) result = BuildMonthlyDate(nextMonth.AddMonths(1), dueDay);
                break;
            case "quarterly":
                var nextQuarter = baseDate.AddMonths(currentDueDate.HasValue ? 3 : 0);
                result = BuildMonthlyDate(nextQuarter, dueDay);
                if (result <= baseDate && !currentDueDate.HasValue) result = BuildMonthlyDate(nextQuarter.AddMonths(3), dueDay);
                break;
            case "yearly":
                var nextYear = baseDate.AddYears(currentDueDate.HasValue ? 1 : 0);
                result = new DateTime(nextYear.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dueDay - 1);
                if (result <= baseDate && !currentDueDate.HasValue) result = result.AddYears(1);
                break;
            default:
                return CalculateNextDueDate("monthly", dueDay, currentDueDate);
        }
        return EnsureUtc(result);
    }

    private static DateTime BuildMonthlyDate(DateTime month, int dueDay)
    {
        var daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);
        return new DateTime(month.Year, month.Month, Math.Min(dueDay, daysInMonth), 0, 0, 0, DateTimeKind.Utc);
    }

    private static decimal CalculateTotalMonthlyAmount(List<RecurringBill> bills) =>
        bills.Sum(b => b.Frequency.ToLower() switch
        {
            "weekly" => b.Amount * 4.33m, "monthly" => b.Amount,
            "quarterly" => b.Amount / 3, "yearly" => b.Amount / 12, _ => b.Amount
        });

    private static decimal CalculateTotalYearlyAmount(List<RecurringBill> bills) =>
        bills.Sum(b => b.Frequency.ToLower() switch
        {
            "weekly" => b.Amount * 52, "monthly" => b.Amount * 12,
            "quarterly" => b.Amount * 4, "yearly" => b.Amount, _ => b.Amount * 12
        });
}
