using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Finance.Core.Services;

public class LoanPaymentsService : ILoanPaymentsService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    // TODO: Wire IAchievementService via integration event in Phase 6+
    private readonly ILogger<LoanPaymentsService> _logger;

    public LoanPaymentsService(FinanceDbContext dbContext, IPartnershipResolver partnershipResolver, ILogger<LoanPaymentsService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<IReadOnlyList<LoanPayment>> GetLoanPaymentsAsync(Guid userId, Guid loanId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var loan = await _dbContext.Loans.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

        if (loan == null) return Array.Empty<LoanPayment>();

        return await _dbContext.LoanPayments
            .Where(p => p.LoanId == loanId && allUserIds.Contains(p.UserId))
            .OrderByDescending(p => p.PaymentDate)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IReadOnlyList<LoanPayment>> GetAllPaymentsAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        return await _dbContext.LoanPayments
            .Where(p => allUserIds.Contains(p.UserId))
            .OrderByDescending(p => p.PaymentDate)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<LoanPayment?> GetLoanPaymentAsync(Guid userId, Guid paymentId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        return await _dbContext.LoanPayments.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == paymentId && allUserIds.Contains(p.UserId));
    }

    public async Task<LoanPayment> CreateLoanPaymentAsync(Guid userId, LoanPayment payment)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var loan = await _dbContext.Loans
            .FirstOrDefaultAsync(l => l.Id == payment.LoanId && allUserIds.Contains(l.UserId));

        if (loan == null) throw new InvalidOperationException($"Loan {payment.LoanId} not found");

        payment.Id = Guid.NewGuid();
        payment.UserId = userId.ToString();
        payment.CreatedAt = DateTime.UtcNow;
        payment.PaymentDate = NormalizeToUtc(payment.PaymentDate);

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

        // TODO: Wire IAchievementService.CheckLoanAchievementsAsync via integration event in Phase 6+

        return payment;
    }

    public async Task<LoanPayment?> UpdateLoanPaymentAsync(Guid userId, Guid paymentId, LoanPayment payment)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var existingPayment = await _dbContext.LoanPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId && allUserIds.Contains(p.UserId));

        if (existingPayment == null) return null;

        var loan = await _dbContext.Loans.FirstOrDefaultAsync(l => l.Id == existingPayment.LoanId);
        if (loan == null) throw new InvalidOperationException("Associated loan not found");

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
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var payment = await _dbContext.LoanPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId && allUserIds.Contains(p.UserId));

        if (payment == null) return false;

        var loan = await _dbContext.Loans.FirstOrDefaultAsync(l => l.Id == payment.LoanId);
        if (loan != null)
        {
            loan.TotalPaid -= payment.Amount;
            loan.RemainingAmount = loan.Amount - loan.TotalPaid;
            if (loan.RemainingAmount > 0) { loan.IsSettled = false; loan.SettledDate = null; }
            loan.UpdatedAt = DateTime.UtcNow;
        }

        _dbContext.LoanPayments.Remove(payment);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<object?> GetLoanPaymentSummaryAsync(Guid userId, Guid loanId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var loan = await _dbContext.Loans.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

        if (loan == null) return null;

        var payments = await _dbContext.LoanPayments
            .Where(p => p.LoanId == loanId && allUserIds.Contains(p.UserId))
            .AsNoTracking()
            .ToListAsync();

        var orderedPayments = payments.OrderByDescending(p => p.PaymentDate).ToList();

        return new
        {
            loanId, loanAmount = loan.Amount, totalPaid = loan.TotalPaid,
            remainingAmount = loan.RemainingAmount, isSettled = loan.IsSettled,
            paymentCount = payments.Count,
            totalPrincipal = payments.Sum(p => p.PrincipalAmount),
            totalInterest = payments.Sum(p => p.InterestAmount),
            averagePayment = payments.Count > 0 ? payments.Average(p => p.Amount) : 0,
            lastPaymentDate = orderedPayments.FirstOrDefault()?.PaymentDate,
            nextPaymentDate = loan.NextPaymentDate,
            payments = orderedPayments
        };
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

    private static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        _ => value.ToUniversalTime()
    };
}
