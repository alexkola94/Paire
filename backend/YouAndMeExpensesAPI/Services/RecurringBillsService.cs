using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for recurring bills. Encapsulates EF Core access and
    /// calculation logic so controllers remain thin.
    /// </summary>
    public class RecurringBillsService : IRecurringBillsService
    {
        private readonly AppDbContext _dbContext;
        private readonly IBudgetService _budgetService;
        private readonly IStorageService _storageService;
        private readonly ILogger<RecurringBillsService> _logger;

        public RecurringBillsService(
            AppDbContext dbContext,
            IBudgetService budgetService,
            IStorageService storageService,
            ILogger<RecurringBillsService> logger)
        {
            _dbContext = dbContext;
            _budgetService = budgetService;
            _storageService = storageService;
            _logger = logger;
        }

        public async Task<IReadOnlyList<object>> GetRecurringBillsAsync(Guid userId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var bills = await _dbContext.RecurringBills
                .Where(b => allUserIds.Contains(b.UserId))
                .Include(b => b.Attachments)
                .OrderBy(b => b.NextDueDate)
                .AsNoTracking()
                .ToListAsync();

            var userIds = bills.Select(b => b.UserId).Distinct().ToList();

            var userProfiles = await _dbContext.UserProfiles
                .Where(up => userIds.Contains(up.Id.ToString()))
                .AsNoTracking()
                .ToListAsync();

            var profileDict = userProfiles.ToDictionary(
                p => p.Id.ToString(),
                p => new
                {
                    id = p.Id,
                    email = p.Email,
                    display_name = p.DisplayName,
                    avatar_url = p.AvatarUrl
                });

            var enrichedBills = bills
                .Select(b => new
                {
                    id = b.Id,
                    userId = b.UserId,
                    name = b.Name,
                    amount = b.Amount,
                    category = b.Category,
                    frequency = b.Frequency,
                    dueDay = b.DueDay,
                    nextDueDate = b.NextDueDate,
                    autoPay = b.AutoPay,
                    reminderDays = b.ReminderDays,
                    isActive = b.IsActive,
                    notes = b.Notes,
                    createdAt = b.CreatedAt,
                    updatedAt = b.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(b.UserId) ? profileDict[b.UserId] : null,
                    attachments = b.Attachments.Select(a => new
                    {
                        id = a.Id,
                        fileUrl = a.FileUrl,
                        fileName = a.FileName,
                        uploadedAt = a.UploadedAt
                    }).ToList()
                })
                .Cast<object>()
                .ToList();

            return enrichedBills;
        }

        public async Task<RecurringBill?> GetRecurringBillAsync(Guid userId, Guid billId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            return await _dbContext.RecurringBills
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == billId && allUserIds.Contains(b.UserId));
        }

        public async Task<RecurringBill> CreateRecurringBillAsync(Guid userId, RecurringBill bill)
        {
            bill.Id = Guid.NewGuid();
            bill.UserId = userId.ToString();
            bill.CreatedAt = DateTime.UtcNow;
            bill.UpdatedAt = DateTime.UtcNow;
            bill.IsActive = true;

            bill.NextDueDate = CalculateNextDueDate(bill.Frequency, bill.DueDay, null);

            if (bill.NextDueDate.Kind == DateTimeKind.Unspecified)
            {
                bill.NextDueDate = DateTime.SpecifyKind(bill.NextDueDate, DateTimeKind.Utc);
            }
            else if (bill.NextDueDate.Kind == DateTimeKind.Local)
            {
                bill.NextDueDate = bill.NextDueDate.ToUniversalTime();
            }

            if (string.IsNullOrEmpty(bill.Frequency))
            {
                bill.Frequency = "monthly";
            }

            if (bill.ReminderDays <= 0)
            {
                bill.ReminderDays = 3;
            }

            _dbContext.RecurringBills.Add(bill);
            await _dbContext.SaveChangesAsync();

            return bill;
        }

        public async Task<RecurringBill?> UpdateRecurringBillAsync(Guid userId, Guid billId, RecurringBill updates)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var existingBill = await _dbContext.RecurringBills
                .FirstOrDefaultAsync(b => b.Id == billId && allUserIds.Contains(b.UserId));

            if (existingBill == null)
            {
                return null;
            }

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

            existingBill.NextDueDate = CalculateNextDueDate(existingBill.Frequency, existingBill.DueDay, existingBill.NextDueDate);

            if (existingBill.NextDueDate.Kind == DateTimeKind.Unspecified)
            {
                existingBill.NextDueDate = DateTime.SpecifyKind(existingBill.NextDueDate, DateTimeKind.Utc);
            }
            else if (existingBill.NextDueDate.Kind == DateTimeKind.Local)
            {
                existingBill.NextDueDate = existingBill.NextDueDate.ToUniversalTime();
            }

            await _dbContext.SaveChangesAsync();

            return existingBill;
        }

        public async Task<bool> DeleteRecurringBillAsync(Guid userId, Guid billId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var bill = await _dbContext.RecurringBills
                .FirstOrDefaultAsync(b => b.Id == billId && allUserIds.Contains(b.UserId));

            if (bill == null)
            {
                return false;
            }

            _dbContext.RecurringBills.Remove(bill);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<RecurringBill?> MarkBillPaidAsync(Guid userId, Guid billId)
        {
            var bill = await _dbContext.RecurringBills
                .FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());

            if (bill == null)
            {
                return null;
            }

            var newTransaction = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId.ToString(),
                Amount = bill.Amount,
                Type = "expense",
                Category = bill.Category,
                Description = bill.Name,
                Date = DateTime.UtcNow,
                PaidBy = "User",
                Notes = $"[RecurringBill:{bill.Id}]",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsBankSynced = false
            };

            _dbContext.Transactions.Add(newTransaction);

            bill.NextDueDate = CalculateNextDueDate(bill.Frequency, bill.DueDay, bill.NextDueDate);

            if (bill.NextDueDate.Kind == DateTimeKind.Unspecified)
            {
                bill.NextDueDate = DateTime.SpecifyKind(bill.NextDueDate, DateTimeKind.Utc);
            }
            else if (bill.NextDueDate.Kind == DateTimeKind.Local)
            {
                bill.NextDueDate = bill.NextDueDate.ToUniversalTime();
            }

            bill.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            await _budgetService.UpdateSpentAmountAsync(
                userId.ToString(),
                newTransaction.Category,
                newTransaction.Amount,
                newTransaction.Date);

            return bill;
        }

        public async Task<RecurringBill?> UnmarkBillPaidAsync(Guid userId, Guid billId)
        {
            var bill = await _dbContext.RecurringBills
                .FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());

            if (bill == null)
            {
                return null;
            }

            bill.NextDueDate = CalculatePreviousDueDate(bill.Frequency, bill.DueDay, bill.NextDueDate);

            if (bill.NextDueDate.Kind == DateTimeKind.Unspecified)
            {
                bill.NextDueDate = DateTime.SpecifyKind(bill.NextDueDate, DateTimeKind.Utc);
            }
            else if (bill.NextDueDate.Kind == DateTimeKind.Local)
            {
                bill.NextDueDate = bill.NextDueDate.ToUniversalTime();
            }

            bill.UpdatedAt = DateTime.UtcNow;

            var tag = $"[RecurringBill:{bill.Id}]";
            var recentTransaction = await _dbContext.Transactions
                .Where(t => t.UserId == userId.ToString() && t.Notes != null && t.Notes.Contains(tag))
                .OrderByDescending(t => t.Date)
                .FirstOrDefaultAsync();

            if (recentTransaction != null)
            {
                _dbContext.Transactions.Remove(recentTransaction);
            }

            await _dbContext.SaveChangesAsync();

            if (recentTransaction != null)
            {
                await _budgetService.UpdateSpentAmountAsync(
                    userId.ToString(),
                    recentTransaction.Category,
                    -recentTransaction.Amount,
                    recentTransaction.Date);
            }

            return bill;
        }

        public async Task<IReadOnlyList<RecurringBill>> GetUpcomingBillsAsync(Guid userId, int days)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);
            var today = DateTime.UtcNow.Date;
            var futureDate = today.AddDays(days);

            var upcomingBills = await _dbContext.RecurringBills
                .Where(b => allUserIds.Contains(b.UserId) && b.IsActive && b.NextDueDate <= futureDate)
                .OrderBy(b => b.NextDueDate)
                .AsNoTracking()
                .ToListAsync();

            return upcomingBills;
        }

        public async Task<object> GetSummaryAsync(Guid userId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var bills = await _dbContext.RecurringBills
                .Where(b => allUserIds.Contains(b.UserId))
                .AsNoTracking()
                .ToListAsync();

            var activeBills = bills.Where(b => b.IsActive).ToList();
            var today = DateTime.UtcNow.Date;

            var summary = new
            {
                totalBills = bills.Count,
                activeBills = activeBills.Count,
                inactiveBills = bills.Count - activeBills.Count,
                totalMonthlyAmount = CalculateTotalMonthlyAmount(activeBills),
                totalYearlyAmount = CalculateTotalYearlyAmount(activeBills),
                upcomingBills = activeBills.Count(b => b.NextDueDate <= today.AddDays(7)),
                overdueBills = activeBills.Count(b => b.NextDueDate < today),
                billsByCategory = activeBills
                    .GroupBy(b => b.Category)
                    .Select(g => new { category = g.Key, count = g.Count(), totalAmount = g.Sum(b => b.Amount) })
                    .ToList(),
                billsByFrequency = activeBills
                    .GroupBy(b => b.Frequency)
                    .Select(g => new { frequency = g.Key, count = g.Count() })
                    .ToList()
            };

            return summary;
        }

        public async Task<object?> UploadAttachmentAsync(Guid userId, Guid billId, IFormFile file)
        {
            var bill = await _dbContext.RecurringBills
                .FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());

            if (bill == null)
            {
                return null;
            }

            var fileExtension = Path.GetExtension(file.FileName);
            var fileName = $"bill-attachments/{userId}/{Guid.NewGuid()}{fileExtension}";

            var url = await _storageService.UploadFileAsync(file, fileName, "receipts");

            var attachment = new RecurringBillAttachment
            {
                Id = Guid.NewGuid(),
                RecurringBillId = billId,
                FileUrl = url,
                FilePath = fileName,
                FileName = file.FileName,
                UploadedAt = DateTime.UtcNow
            };

            _dbContext.RecurringBillAttachments.Add(attachment);
            await _dbContext.SaveChangesAsync();

            return new
            {
                id = attachment.Id,
                fileUrl = attachment.FileUrl,
                fileName = attachment.FileName,
                uploadedAt = attachment.UploadedAt
            };
        }

        public async Task<bool> DeleteAttachmentAsync(Guid userId, Guid billId, Guid attachmentId)
        {
            var bill = await _dbContext.RecurringBills
                .FirstOrDefaultAsync(b => b.Id == billId && b.UserId == userId.ToString());

            if (bill == null)
            {
                return false;
            }

            var attachment = await _dbContext.RecurringBillAttachments
                .FirstOrDefaultAsync(a => a.Id == attachmentId && a.RecurringBillId == billId);

            if (attachment == null)
            {
                return false;
            }

            if (!string.IsNullOrEmpty(attachment.FilePath))
            {
                await _storageService.DeleteFileAsync(attachment.FilePath, "receipts");
            }

            _dbContext.RecurringBillAttachments.Remove(attachment);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        // ===== Helpers reused from controller logic =====

        private async Task<List<string>> GetUserAndPartnerIdsAsync(Guid userId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);
            return allUserIds;
        }

        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userId || p.User2Id == userId) &&
                        p.Status == "active");

                if (partnership == null)
                {
                    return new List<string>();
                }

                var partnerId = partnership.User1Id == userId
                    ? partnership.User2Id
                    : partnership.User1Id;

                return new List<string> { partnerId.ToString() };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
                return new List<string>();
            }
        }

        private static DateTime CalculatePreviousDueDate(string frequency, int dueDay, DateTime currentDueDate)
        {
            if (currentDueDate.Kind != DateTimeKind.Utc)
            {
                currentDueDate = currentDueDate.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(currentDueDate, DateTimeKind.Utc)
                    : currentDueDate.ToUniversalTime();
            }

            DateTime result;

            switch (frequency.ToLower())
            {
                case "weekly":
                    result = currentDueDate.AddDays(-7);
                    break;

                case "monthly":
                    var prevMonth = currentDueDate.AddMonths(-1);
                    var daysInMonth = DateTime.DaysInMonth(prevMonth.Year, prevMonth.Month);
                    var actualDay = Math.Min(dueDay, daysInMonth);
                    result = new DateTime(prevMonth.Year, prevMonth.Month, actualDay, 0, 0, 0, DateTimeKind.Utc);
                    break;

                case "quarterly":
                    var prevQuarter = currentDueDate.AddMonths(-3);
                    var daysInQuarter = DateTime.DaysInMonth(prevQuarter.Year, prevQuarter.Month);
                    var quarterDay = Math.Min(dueDay, daysInQuarter);
                    result = new DateTime(prevQuarter.Year, prevQuarter.Month, quarterDay, 0, 0, 0, DateTimeKind.Utc);
                    break;

                case "yearly":
                    var prevYear = currentDueDate.AddYears(-1);
                    result = new DateTime(prevYear.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dueDay - 1);
                    break;

                default:
                    return CalculatePreviousDueDate("monthly", dueDay, currentDueDate);
            }

            return result;
        }

        private static DateTime CalculateNextDueDate(string frequency, int dueDay, DateTime? currentDueDate)
        {
            var baseDate = currentDueDate ?? DateTime.UtcNow.Date;
            if (baseDate.Kind != DateTimeKind.Utc)
            {
                baseDate = baseDate.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(baseDate, DateTimeKind.Utc)
                    : baseDate.ToUniversalTime();
            }

            DateTime result;

            switch (frequency.ToLower())
            {
                case "weekly":
                    var daysUntilDue = ((dueDay - (int)baseDate.DayOfWeek + 7) % 7);
                    result = baseDate.AddDays(daysUntilDue == 0 ? 7 : daysUntilDue);
                    break;

                case "monthly":
                    var nextMonth = baseDate.AddMonths(currentDueDate.HasValue ? 1 : 0);
                    var daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                    var actualDay = Math.Min(dueDay, daysInMonth);
                    result = new DateTime(nextMonth.Year, nextMonth.Month, actualDay, 0, 0, 0, DateTimeKind.Utc);

                    if (result <= baseDate && !currentDueDate.HasValue)
                    {
                        nextMonth = nextMonth.AddMonths(1);
                        daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                        actualDay = Math.Min(dueDay, daysInMonth);
                        result = new DateTime(nextMonth.Year, nextMonth.Month, actualDay, 0, 0, 0, DateTimeKind.Utc);
                    }
                    break;

                case "quarterly":
                    var nextQuarter = baseDate.AddMonths(currentDueDate.HasValue ? 3 : 0);
                    var daysInQuarterMonth = DateTime.DaysInMonth(nextQuarter.Year, nextQuarter.Month);
                    var quarterDay = Math.Min(dueDay, daysInQuarterMonth);
                    result = new DateTime(nextQuarter.Year, nextQuarter.Month, quarterDay, 0, 0, 0, DateTimeKind.Utc);

                    if (result <= baseDate && !currentDueDate.HasValue)
                    {
                        nextQuarter = nextQuarter.AddMonths(3);
                        daysInQuarterMonth = DateTime.DaysInMonth(nextQuarter.Year, nextQuarter.Month);
                        quarterDay = Math.Min(dueDay, daysInQuarterMonth);
                        result = new DateTime(nextQuarter.Year, nextQuarter.Month, quarterDay, 0, 0, 0, DateTimeKind.Utc);
                    }
                    break;

                case "yearly":
                    var nextYear = baseDate.AddYears(currentDueDate.HasValue ? 1 : 0);
                    result = new DateTime(nextYear.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dueDay - 1);

                    if (result <= baseDate && !currentDueDate.HasValue)
                    {
                        result = result.AddYears(1);
                    }
                    break;

                default:
                    return CalculateNextDueDate("monthly", dueDay, currentDueDate);
            }

            if (result.Kind != DateTimeKind.Utc)
            {
                result = result.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(result, DateTimeKind.Utc)
                    : result.ToUniversalTime();
            }

            return result;
        }

        private static decimal CalculateTotalMonthlyAmount(List<RecurringBill> bills)
        {
            return bills.Sum(b =>
                b.Frequency.ToLower() switch
                {
                    "weekly" => b.Amount * 4.33m,
                    "monthly" => b.Amount,
                    "quarterly" => b.Amount / 3,
                    "yearly" => b.Amount / 12,
                    _ => b.Amount
                });
        }

        private static decimal CalculateTotalYearlyAmount(List<RecurringBill> bills)
        {
            return bills.Sum(b =>
                b.Frequency.ToLower() switch
                {
                    "weekly" => b.Amount * 52,
                    "monthly" => b.Amount * 12,
                    "quarterly" => b.Amount * 4,
                    "yearly" => b.Amount,
                    _ => b.Amount * 12
                });
        }
    }
}

