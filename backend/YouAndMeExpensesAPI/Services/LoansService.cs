using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for loans. Encapsulates all data access and business rules
    /// so controllers stay thin and focused on HTTP concerns only.
    /// </summary>
    public class LoansService : ILoansService
    {
        private readonly AppDbContext _dbContext;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<LoansService> _logger;

        public LoansService(
            AppDbContext dbContext,
            IAchievementService achievementService,
            ILogger<LoansService> logger)
        {
            _dbContext = dbContext;
            _achievementService = achievementService;
            _logger = logger;
        }

        public async Task<IReadOnlyList<object>> GetLoansAsync(Guid userId)
        {
            // Get partner IDs if partnership exists
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            // Get loans from user and partner(s)
            var loans = await _dbContext.Loans
                .Where(l => allUserIds.Contains(l.UserId))
                .OrderByDescending(l => l.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            // Get user profiles for all loan creators
            var userIds = loans
                .Select(l => l.UserId)
                .Distinct()
                .ToList();

            var userProfiles = await _dbContext.UserProfiles
                .Where(up => userIds.Contains(up.Id.ToString()))
                .AsNoTracking()
                .ToListAsync();

            // Create a dictionary for quick lookup
            var profileDict = userProfiles.ToDictionary(
                p => p.Id.ToString(),
                p => new
                {
                    id = p.Id,
                    email = p.Email,
                    display_name = p.DisplayName,
                    avatar_url = p.AvatarUrl
                });

            // Enrich loans with user profile data (using camelCase / snake_case for frontend compatibility)
            var enrichedLoans = loans
                .Select(l => new
                {
                    id = l.Id,
                    userId = l.UserId,
                    lentBy = l.LentBy,
                    borrowedBy = l.BorrowedBy,
                    amount = l.Amount,
                    description = l.Description,
                    date = l.Date,
                    durationYears = l.DurationYears,
                    durationMonths = l.DurationMonths,
                    interestRate = l.InterestRate,
                    hasInstallments = l.HasInstallments,
                    installmentAmount = l.InstallmentAmount,
                    installmentFrequency = l.InstallmentFrequency,
                    totalPaid = l.TotalPaid,
                    remainingAmount = l.RemainingAmount,
                    nextPaymentDate = l.NextPaymentDate,
                    dueDate = l.DueDate,
                    isSettled = l.IsSettled,
                    settledDate = l.SettledDate,
                    category = l.Category,
                    notes = l.Notes,
                    createdAt = l.CreatedAt,
                    updatedAt = l.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(l.UserId) ? profileDict[l.UserId] : null
                })
                .Cast<object>()
                .ToList();

            return enrichedLoans;
        }

        public async Task<Loan?> GetLoanAsync(Guid userId, Guid loanId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            return await _dbContext.Loans
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));
        }

        public async Task<Loan> CreateLoanAsync(Guid userId, Loan loan)
        {
            // Set loan properties
            loan.Id = Guid.NewGuid();
            loan.UserId = userId.ToString();
            loan.CreatedAt = DateTime.UtcNow;
            loan.UpdatedAt = DateTime.UtcNow;

            // Convert all DateTime values to UTC to avoid PostgreSQL timestamp issues
            NormalizeLoanDates(loan);

            // Initialize TotalPaid to 0 for new loans
            loan.TotalPaid = 0;

            // Calculate RemainingAmount based on Amount and TotalPaid
            loan.RemainingAmount = loan.Amount - loan.TotalPaid;

            // If loan is marked as settled, ensure RemainingAmount is 0 and SettledDate is set
            if (loan.IsSettled)
            {
                loan.RemainingAmount = 0;
                loan.SettledDate ??= DateTime.UtcNow;
                NormalizeSettledDate(loan);
            }
            else
            {
                loan.SettledDate = null;
            }

            _dbContext.Loans.Add(loan);
            await _dbContext.SaveChangesAsync();

            return loan;
        }

        public async Task<Loan?> UpdateLoanAsync(Guid userId, Guid loanId, Loan updatedLoan)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            // Allow user or partner to update the loan
            var existingLoan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

            if (existingLoan == null)
            {
                return null;
            }

            // Update properties – keep logic aligned with original controller
            existingLoan.Amount = updatedLoan.Amount;
            existingLoan.LentBy = updatedLoan.LentBy ?? existingLoan.LentBy;
            existingLoan.BorrowedBy = updatedLoan.BorrowedBy ?? existingLoan.BorrowedBy;
            existingLoan.Description = updatedLoan.Description ?? existingLoan.Description;

            // Convert Date to UTC if provided
            if (updatedLoan.Date != default && updatedLoan.Date != existingLoan.Date)
            {
                existingLoan.Date = NormalizeToUtc(updatedLoan.Date);
            }

            // Handle due date if provided - convert to UTC
            if (updatedLoan.DueDate.HasValue)
            {
                existingLoan.DueDate = NormalizeToUtc(updatedLoan.DueDate.Value);
            }

            // Handle next payment date if provided - convert to UTC
            if (updatedLoan.NextPaymentDate.HasValue)
            {
                existingLoan.NextPaymentDate = NormalizeToUtc(updatedLoan.NextPaymentDate.Value);
            }

            // Recalculate RemainingAmount based on Amount and TotalPaid
            existingLoan.RemainingAmount = existingLoan.Amount - existingLoan.TotalPaid;

            // Update settled status
            var wasSettled = existingLoan.IsSettled;
            existingLoan.IsSettled = updatedLoan.IsSettled;

            if (existingLoan.RemainingAmount <= 0)
            {
                existingLoan.IsSettled = true;
                existingLoan.RemainingAmount = 0;
                existingLoan.SettledDate ??= DateTime.UtcNow;
            }
            else if (!existingLoan.IsSettled)
            {
                existingLoan.SettledDate = null;
            }
            else if (updatedLoan.SettledDate.HasValue)
            {
                existingLoan.SettledDate = NormalizeToUtc(updatedLoan.SettledDate.Value);
            }

            existingLoan.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            // Check for new achievements if loan was just settled
            if (!wasSettled && existingLoan.IsSettled)
            {
                await SafeCheckLoanAchievementsAsync(userId);
            }

            return existingLoan;
        }

        public async Task<bool> DeleteLoanAsync(Guid userId, Guid loanId)
        {
            var loan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == loanId && l.UserId == userId.ToString());

            if (loan == null)
            {
                return false;
            }

            _dbContext.Loans.Remove(loan);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<object> GetLoanSummaryAsync(Guid userId)
        {
            var loans = await _dbContext.Loans
                .Where(l => l.UserId == userId.ToString())
                .AsNoTracking()
                .ToListAsync();

            // Calculate totals by person – same logic as original controller
            var summary = loans
                .Where(l => !l.IsSettled)
                .GroupBy(l => new { l.LentBy, l.BorrowedBy })
                .Select(g => new
                {
                    lentBy = g.Key.LentBy,
                    borrowedBy = g.Key.BorrowedBy,
                    totalAmount = g.Sum(l => l.Amount),
                    count = g.Count()
                })
                .ToList();

            var response = new
            {
                summary,
                totalLoans = loans.Count,
                activeLoans = loans.Count(l => !l.IsSettled),
                settledLoans = loans.Count(l => l.IsSettled)
            };

            return response;
        }

        public async Task<(Loan? loan, bool alreadySettled)> SettleLoanAsync(Guid userId, Guid loanId)
        {
            var loan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == loanId && l.UserId == userId.ToString());

            if (loan == null)
            {
                return (null, false);
            }

            if (loan.IsSettled)
            {
                return (loan, true);
            }

            loan.IsSettled = true;
            loan.SettledDate = DateTime.UtcNow;
            loan.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            await SafeCheckLoanAchievementsAsync(userId);

            return (loan, false);
        }

        /// <summary>
        /// Helper: get partner user IDs for current user.
        /// </summary>
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

        /// <summary>
        /// Normalize all date fields on the loan to UTC.
        /// </summary>
        private static void NormalizeLoanDates(Loan loan)
        {
            loan.Date = NormalizeToUtc(loan.Date);

            if (loan.DueDate.HasValue)
            {
                loan.DueDate = NormalizeToUtc(loan.DueDate.Value);
            }

            if (loan.NextPaymentDate.HasValue)
            {
                loan.NextPaymentDate = NormalizeToUtc(loan.NextPaymentDate.Value);
            }

            if (loan.SettledDate.HasValue)
            {
                loan.SettledDate = NormalizeToUtc(loan.SettledDate.Value);
            }
        }

        private static void NormalizeSettledDate(Loan loan)
        {
            if (loan.SettledDate.HasValue)
            {
                loan.SettledDate = NormalizeToUtc(loan.SettledDate.Value);
            }
        }

        /// <summary>
        /// Utility: safely convert DateTime to UTC while preserving unspecified values.
        /// </summary>
        private static DateTime NormalizeToUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
                _ => value.ToUniversalTime()
            };
        }

        /// <summary>
        /// Achievement checks should never break main loan flows, so we swallow and log errors.
        /// </summary>
        private async Task SafeCheckLoanAchievementsAsync(Guid userId)
        {
            try
            {
                await _achievementService.CheckLoanAchievementsAsync(userId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking achievements for user {UserId} after loan update", userId);
            }
        }
    }
}

