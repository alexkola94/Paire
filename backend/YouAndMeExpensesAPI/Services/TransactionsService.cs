using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service that encapsulates all transaction-related business logic and data access.
    /// Controllers call into this service instead of talking to AppDbContext directly.
    /// </summary>
    public class TransactionsService : ITransactionsService
    {
        private readonly AppDbContext _dbContext;
        private readonly IStorageService _storageService;
        private readonly IAchievementService _achievementService;
        private readonly IBudgetService _budgetService;
        private readonly IBankStatementImportService _importService;
        private readonly ILogger<TransactionsService> _logger;

        public TransactionsService(
            AppDbContext dbContext,
            IStorageService storageService,
            IAchievementService achievementService,
            IBudgetService budgetService,
            IBankStatementImportService importService,
            ILogger<TransactionsService> logger)
        {
            _dbContext = dbContext;
            _storageService = storageService;
            _achievementService = achievementService;
            _budgetService = budgetService;
            _importService = importService;
            _logger = logger;
        }

        /// <summary>
        /// Helper to get current user and partner IDs as strings.
        /// </summary>
        private async Task<List<string>> GetUserAndPartnerIdsAsync(Guid userId)
        {
            var ids = new List<string> { userId.ToString() };

            try
            {
                var partnership = await _dbContext.Partnerships
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userId || p.User2Id == userId) &&
                        p.Status == "active");

                if (partnership != null)
                {
                    var partnerId = partnership.User1Id == userId
                        ? partnership.User2Id
                        : partnership.User1Id;
                    ids.Add(partnerId.ToString());
                }
            }
            catch (Exception ex)
            {
                // Log but still return the current user id so we don't fail the whole request.
                _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
            }

            return ids;
        }

        /// <summary>
        /// Normalize optional date range filters to UTC.
        /// </summary>
        private static (DateTime? StartUtc, DateTime? EndUtc) NormalizeDates(DateTime? startDate, DateTime? endDate)
        {
            DateTime? startUtc = null;
            DateTime? endUtc = null;

            if (startDate.HasValue)
            {
                startUtc = startDate.Value.Kind == DateTimeKind.Utc
                    ? startDate.Value
                    : startDate.Value.ToUniversalTime();
            }

            if (endDate.HasValue)
            {
                var end = endDate.Value.Kind == DateTimeKind.Utc
                    ? endDate.Value
                    : endDate.Value.ToUniversalTime();

                // Include the entire end date (end of day).
                endUtc = end.Date.AddDays(1).AddTicks(-1);
            }

            return (startUtc, endUtc);
        }

        private async Task<Dictionary<string, UserProfileSlimDto>> GetProfilesDictAsync(List<string> userIds)
        {
            var profiles = await _dbContext.UserProfiles
                .AsNoTracking()
                .Where(up => userIds.Contains(up.Id.ToString()))
                .ToListAsync();

            return profiles.ToDictionary(
                p => p.Id.ToString(),
                p => new UserProfileSlimDto
                {
                    Id = p.Id,
                    Email = p.Email,
                    DisplayName = p.DisplayName,
                    AvatarUrl = p.AvatarUrl
                });
        }

        private static TransactionWithProfileDto ToDto(Transaction t, UserProfileSlimDto? profile)
        {
            return new TransactionWithProfileDto
            {
                Id = t.Id,
                UserId = t.UserId,
                Type = t.Type,
                Amount = t.Amount,
                Category = t.Category,
                Description = t.Description,
                Date = t.Date,
                AttachmentUrl = t.AttachmentUrl,
                AttachmentPath = t.AttachmentPath,
                IsRecurring = t.IsRecurring,
                RecurrencePattern = t.RecurrencePattern,
                RecurrenceEndDate = t.RecurrenceEndDate,
                PaidBy = t.PaidBy,
                SplitType = t.SplitType,
                SplitPercentage = t.SplitPercentage,
                Tags = t.Tags,
                Notes = t.Notes,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                UserProfile = profile
            };
        }

        public async Task<TransactionsPageDto> GetTransactionsAsync(
            Guid userId,
            string? type,
            DateTime? startDate,
            DateTime? endDate,
            int? page,
            int? pageSize,
            string? search)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var query = _dbContext.Transactions
                .AsNoTracking()
                .Where(t => allUserIds.Contains(t.UserId));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = $"%{search.Trim()}%";
                query = query.Where(t =>
                    EF.Functions.ILike(t.Description ?? string.Empty, searchTerm) ||
                    EF.Functions.ILike(t.Category ?? string.Empty, searchTerm) ||
                    EF.Functions.ILike(t.Notes ?? string.Empty, searchTerm) ||
                    (t.Tags != null && t.Tags.Any(tag => EF.Functions.ILike(tag, searchTerm))));
            }

            if (!string.IsNullOrEmpty(type))
            {
                var normalizedType = type.ToLowerInvariant();
                if (normalizedType == "income" || normalizedType == "expense")
                {
                    query = query.Where(t => EF.Functions.ILike(t.Type, normalizedType));
                }
                else
                {
                    throw new ArgumentException("Invalid type parameter. Must be 'income' or 'expense'.");
                }
            }

            var (startUtc, endUtc) = NormalizeDates(startDate, endDate);
            if (startUtc.HasValue)
            {
                query = query.Where(t => t.Date >= startUtc.Value);
            }

            if (endUtc.HasValue)
            {
                query = query.Where(t => t.Date <= endUtc.Value);
            }

            int totalCount = 0;
            if (page.HasValue && pageSize.HasValue)
            {
                totalCount = await query.CountAsync();
            }

            var orderedQuery = query.OrderByDescending(t => t.Date);

            if (page.HasValue && pageSize.HasValue)
            {
                orderedQuery = (IOrderedQueryable<Transaction>)orderedQuery
                    .Skip((page.Value - 1) * pageSize.Value)
                    .Take(pageSize.Value);
            }

            var transactions = await orderedQuery.ToListAsync();

            var userIds = transactions.Select(t => t.UserId).Distinct().ToList();
            var profileDict = await GetProfilesDictAsync(userIds);

            var enriched = transactions
                .Select(t => ToDto(t, profileDict.TryGetValue(t.UserId, out var p) ? p : null))
                .ToList();

            var result = new TransactionsPageDto
            {
                Items = enriched
            };

            if (page.HasValue && pageSize.HasValue)
            {
                result.TotalCount = totalCount;
                result.Page = page;
                result.PageSize = pageSize;
                result.TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize.Value);
            }

            return result;
        }

        public async Task<Transaction?> GetTransactionAsync(Guid userId, Guid id)
        {
            return await _dbContext.Transactions
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId.ToString());
        }

        public async Task<Transaction> CreateTransactionAsync(Guid userId, CreateTransactionRequest request)
        {
            var transaction = request.ToTransaction();

            transaction.Id = Guid.NewGuid();
            transaction.UserId = userId.ToString();
            transaction.CreatedAt = DateTime.UtcNow;
            transaction.UpdatedAt = DateTime.UtcNow;

            _dbContext.Transactions.Add(transaction);
            await _dbContext.SaveChangesAsync();

            try
            {
                await _achievementService.CheckTransactionAchievementsAsync(userId.ToString());
                await _achievementService.CheckMilestoneAchievementsAsync(userId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking achievements after transaction creation");
            }

            if (transaction.Type.ToLower() == "expense")
            {
                await _budgetService.UpdateSpentAmountAsync(
                    userId.ToString(),
                    transaction.Category,
                    transaction.Amount,
                    transaction.Date);
            }

            return transaction;
        }

        public async Task<Transaction?> UpdateTransactionAsync(Guid userId, Guid id, Transaction transaction)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var existing = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && allUserIds.Contains(t.UserId));

            if (existing == null)
            {
                return null;
            }

            // Preserve old values for budget adjustments.
            var oldCategory = existing.Category;
            var oldAmount = existing.Amount;
            var oldDate = existing.Date;
            var oldType = existing.Type;

            existing.Type = transaction.Type;
            existing.Amount = transaction.Amount;
            existing.Category = transaction.Category;
            existing.Description = transaction.Description;
            existing.Date = transaction.Date.Kind == DateTimeKind.Utc
                ? transaction.Date
                : transaction.Date.ToUniversalTime();
            existing.AttachmentUrl = transaction.AttachmentUrl;
            existing.AttachmentPath = transaction.AttachmentPath;
            existing.PaidBy = transaction.PaidBy;
            existing.IsRecurring = transaction.IsRecurring;
            existing.RecurrencePattern = transaction.RecurrencePattern;

            if (transaction.RecurrenceEndDate.HasValue)
            {
                existing.RecurrenceEndDate = transaction.RecurrenceEndDate.Value.Kind == DateTimeKind.Utc
                    ? transaction.RecurrenceEndDate.Value
                    : transaction.RecurrenceEndDate.Value.ToUniversalTime();
            }
            else
            {
                existing.RecurrenceEndDate = null;
            }

            existing.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            // Update budget spent amount (revert old, then apply new if expense).
            if (oldType.ToLower() == "expense")
            {
                await _budgetService.UpdateSpentAmountAsync(
                    userId.ToString(),
                    oldCategory,
                    -oldAmount,
                    oldDate);
            }

            if (existing.Type.ToLower() == "expense")
            {
                await _budgetService.UpdateSpentAmountAsync(
                    userId.ToString(),
                    existing.Category,
                    existing.Amount,
                    existing.Date);
            }

            return existing;
        }

        public async Task<bool> DeleteTransactionAsync(Guid userId, Guid id)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var transaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && allUserIds.Contains(t.UserId));

            if (transaction == null)
            {
                return false;
            }

            _dbContext.Transactions.Remove(transaction);
            await _dbContext.SaveChangesAsync();

            if (transaction.Type.ToLower() == "expense")
            {
                await _budgetService.UpdateSpentAmountAsync(
                    userId.ToString(),
                    transaction.Category,
                    -transaction.Amount,
                    transaction.Date);
            }

            return true;
        }

        public async Task<ReceiptUploadResultDto> UploadReceiptAsync(Guid userId, IFormFile file)
        {
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
            {
                throw new ArgumentException("Only image files are allowed");
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                throw new ArgumentException("File size must be less than 5MB");
            }

            var fileName = $"receipt_{userId}_{DateTime.UtcNow.Ticks}{extension}";
            var receiptUrl = await _storageService.UploadFileAsync(file, fileName, "receipts");

            return new ReceiptUploadResultDto
            {
                Url = receiptUrl,
                Path = fileName
            };
        }

        public async Task<IReadOnlyList<TransactionWithProfileDto>> GetTransactionsWithReceiptsAsync(
            Guid userId,
            string? category,
            string? search)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var query = _dbContext.Transactions
                .AsNoTracking()
                .Where(t => allUserIds.Contains(t.UserId) && !string.IsNullOrEmpty(t.AttachmentUrl));

            if (!string.IsNullOrWhiteSpace(category) && category != "All")
            {
                query = query.Where(t => EF.Functions.ILike(t.Category, category));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = $"%{search.Trim()}%";
                query = query.Where(t =>
                    EF.Functions.ILike(t.Description ?? string.Empty, searchTerm) ||
                    EF.Functions.ILike(t.Category ?? string.Empty, searchTerm) ||
                    EF.Functions.ILike(t.Notes ?? string.Empty, searchTerm));
            }

            var transactions = await query
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var userIds = transactions.Select(t => t.UserId).Distinct().ToList();
            var profileDict = await GetProfilesDictAsync(userIds);

            return transactions
                .Select(t => ToDto(t, profileDict.TryGetValue(t.UserId, out var p) ? p : null))
                .ToList();
        }

        public async Task<bool> DeleteReceiptAsync(Guid userId, Guid transactionId)
        {
            var transaction = await _dbContext.Transactions.FindAsync(transactionId);
            if (transaction == null)
            {
                return false;
            }

            var allUserIds = await GetUserAndPartnerIdsAsync(userId);
            if (!allUserIds.Contains(transaction.UserId))
            {
                throw new UnauthorizedAccessException("User does not have permission to modify this transaction");
            }

            if (string.IsNullOrEmpty(transaction.AttachmentPath) &&
                string.IsNullOrEmpty(transaction.AttachmentUrl))
            {
                return false;
            }

            if (!string.IsNullOrEmpty(transaction.AttachmentPath))
            {
                await _storageService.DeleteFileAsync(transaction.AttachmentPath, "receipts");
            }

            transaction.AttachmentUrl = null;
            transaction.AttachmentPath = null;
            transaction.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<BankTransactionImportResult> ImportTransactionsAsync(Guid userId, IFormFile file)
        {
            // Delegate to existing import service to preserve behavior.
            return await _importService.ImportStatementAsync(userId.ToString(), file);
        }
    }
}

