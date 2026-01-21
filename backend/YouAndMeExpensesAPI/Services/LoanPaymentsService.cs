using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for loan payments. Encapsulates all data access and
    /// business rules for updating loans when payments change.
    /// </summary>
    public class LoanPaymentsService : ILoanPaymentsService
    {
        private readonly AppDbContext _dbContext;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<LoanPaymentsService> _logger;

        public LoanPaymentsService(
            AppDbContext dbContext,
            IAchievementService achievementService,
            ILogger<LoanPaymentsService> logger)
        {
            _dbContext = dbContext;
            _achievementService = achievementService;
            _logger = logger;
        }

        public async Task<IReadOnlyList<LoanPayment>> GetLoanPaymentsAsync(Guid userId, Guid loanId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var loan = await _dbContext.Loans
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

            if (loan == null)
            {
                return Array.Empty<LoanPayment>();
            }

            var payments = await _dbContext.LoanPayments
                .Where(p => p.LoanId == loanId && allUserIds.Contains(p.UserId))
                .OrderByDescending(p => p.PaymentDate)
                .AsNoTracking()
                .ToListAsync();

            return payments;
        }

        public async Task<IReadOnlyList<LoanPayment>> GetAllPaymentsAsync(Guid userId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var payments = await _dbContext.LoanPayments
                .Where(p => allUserIds.Contains(p.UserId))
                .OrderByDescending(p => p.PaymentDate)
                .AsNoTracking()
                .ToListAsync();

            return payments;
        }

        public async Task<LoanPayment?> GetLoanPaymentAsync(Guid userId, Guid paymentId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var payment = await _dbContext.LoanPayments
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == paymentId && allUserIds.Contains(p.UserId));

            return payment;
        }

        public async Task<LoanPayment> CreateLoanPaymentAsync(Guid userId, LoanPayment payment)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var loan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == payment.LoanId && allUserIds.Contains(l.UserId));

            if (loan == null)
            {
                throw new InvalidOperationException($"Loan {payment.LoanId} not found");
            }

            payment.Id = Guid.NewGuid();
            payment.UserId = userId.ToString();
            payment.CreatedAt = DateTime.UtcNow;

            payment.PaymentDate = NormalizeToUtc(payment.PaymentDate);

            // Update loan totals
            var wasSettled = loan.IsSettled;
            loan.TotalPaid += payment.Amount;
            loan.RemainingAmount = loan.Amount - loan.TotalPaid;

            if (loan.RemainingAmount <= 0)
            {
                loan.IsSettled = true;
                loan.SettledDate = DateTime.UtcNow;
                loan.RemainingAmount = 0;
            }

            loan.UpdatedAt = DateTime.UtcNow;

            _dbContext.LoanPayments.Add(payment);
            await _dbContext.SaveChangesAsync();

            if (!wasSettled && loan.IsSettled)
            {
                await SafeCheckLoanAchievementsAsync(userId);
            }

            return payment;
        }

        public async Task<LoanPayment?> UpdateLoanPaymentAsync(Guid userId, Guid paymentId, LoanPayment payment)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var existingPayment = await _dbContext.LoanPayments
                .FirstOrDefaultAsync(p => p.Id == paymentId && allUserIds.Contains(p.UserId));

            if (existingPayment == null)
            {
                return null;
            }

            var loan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == existingPayment.LoanId);

            if (loan == null)
            {
                throw new InvalidOperationException("Associated loan not found");
            }

            // Adjust loan totals
            var amountDifference = payment.Amount - existingPayment.Amount;
            loan.TotalPaid += amountDifference;
            loan.RemainingAmount = loan.Amount - loan.TotalPaid;

            if (loan.RemainingAmount <= 0)
            {
                loan.IsSettled = true;
                loan.SettledDate = loan.SettledDate ?? DateTime.UtcNow;
                loan.RemainingAmount = 0;
            }
            else
            {
                loan.IsSettled = false;
                loan.SettledDate = null;
            }

            // Update payment properties
            existingPayment.Amount = payment.Amount;
            existingPayment.PrincipalAmount = payment.PrincipalAmount;
            existingPayment.InterestAmount = payment.InterestAmount;
            existingPayment.Notes = payment.Notes;
            existingPayment.PaymentDate = NormalizeToUtc(payment.PaymentDate);

            loan.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return existingPayment;
        }

        public async Task<bool> DeleteLoanPaymentAsync(Guid userId, Guid paymentId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var payment = await _dbContext.LoanPayments
                .FirstOrDefaultAsync(p => p.Id == paymentId && allUserIds.Contains(p.UserId));

            if (payment == null)
            {
                return false;
            }

            var loan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == payment.LoanId);

            if (loan != null)
            {
                loan.TotalPaid -= payment.Amount;
                loan.RemainingAmount = loan.Amount - loan.TotalPaid;

                if (loan.RemainingAmount > 0)
                {
                    loan.IsSettled = false;
                    loan.SettledDate = null;
                }

                loan.UpdatedAt = DateTime.UtcNow;
            }

            _dbContext.LoanPayments.Remove(payment);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<object?> GetLoanPaymentSummaryAsync(Guid userId, Guid loanId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var loan = await _dbContext.Loans
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

            if (loan == null)
            {
                return null;
            }

            var payments = await _dbContext.LoanPayments
                .Where(p => p.LoanId == loanId && allUserIds.Contains(p.UserId))
                .AsNoTracking()
                .ToListAsync();

            var orderedPayments = payments
                .OrderByDescending(p => p.PaymentDate)
                .ToList();

            var summary = new
            {
                loanId,
                loanAmount = loan.Amount,
                totalPaid = loan.TotalPaid,
                remainingAmount = loan.RemainingAmount,
                isSettled = loan.IsSettled,
                paymentCount = payments.Count,
                totalPrincipal = payments.Sum(p => p.PrincipalAmount),
                totalInterest = payments.Sum(p => p.InterestAmount),
                averagePayment = payments.Count > 0 ? payments.Average(p => p.Amount) : 0,
                lastPaymentDate = orderedPayments.FirstOrDefault()?.PaymentDate,
                nextPaymentDate = loan.NextPaymentDate,
                payments = orderedPayments
            };

            return summary;
        }

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

        private static DateTime NormalizeToUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
                _ => value.ToUniversalTime()
            };
        }

        private async Task SafeCheckLoanAchievementsAsync(Guid userId)
        {
            try
            {
                await _achievementService.CheckLoanAchievementsAsync(userId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking achievements after loan payment for user {UserId}", userId);
            }
        }
    }
}

