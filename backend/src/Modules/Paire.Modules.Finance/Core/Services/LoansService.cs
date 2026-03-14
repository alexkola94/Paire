using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Finance.Core.Services;

public class LoansService : ILoansService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    // TODO: Wire IAchievementService via integration event in Phase 6+
    private readonly ILogger<LoansService> _logger;

    public LoansService(FinanceDbContext dbContext, IPartnershipResolver partnershipResolver, ILogger<LoansService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<IReadOnlyList<object>> GetLoansAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());

        var loans = await _dbContext.Loans
            .Where(l => allUserIds.Contains(l.UserId))
            .OrderByDescending(l => l.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var userIds = loans.Select(l => l.UserId).Distinct().ToList();
        var userProfiles = await _dbContext.UserProfiles
            .Where(up => userIds.Contains(up.Id.ToString()))
            .AsNoTracking()
            .ToListAsync();

        var profileDict = userProfiles.ToDictionary(
            p => p.Id.ToString(),
            p => new { id = p.Id, email = p.Email, display_name = p.DisplayName, avatar_url = p.AvatarUrl });

        return loans.Select(l => new
        {
            id = l.Id, userId = l.UserId, lentBy = l.LentBy, borrowedBy = l.BorrowedBy,
            amount = l.Amount, description = l.Description, date = l.Date,
            durationYears = l.DurationYears, durationMonths = l.DurationMonths,
            interestRate = l.InterestRate, hasInstallments = l.HasInstallments,
            installmentAmount = l.InstallmentAmount, installmentFrequency = l.InstallmentFrequency,
            totalPaid = l.TotalPaid, remainingAmount = l.RemainingAmount,
            nextPaymentDate = l.NextPaymentDate, dueDate = l.DueDate,
            isSettled = l.IsSettled, settledDate = l.SettledDate,
            category = l.Category, notes = l.Notes,
            createdAt = l.CreatedAt, updatedAt = l.UpdatedAt,
            user_profiles = profileDict.ContainsKey(l.UserId) ? profileDict[l.UserId] : null
        }).Cast<object>().ToList();
    }

    public async Task<Loan?> GetLoanAsync(Guid userId, Guid loanId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        return await _dbContext.Loans.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));
    }

    public async Task<Loan> CreateLoanAsync(Guid userId, Loan loan)
    {
        loan.Id = Guid.NewGuid();
        loan.UserId = userId.ToString();
        loan.CreatedAt = DateTime.UtcNow;
        loan.UpdatedAt = DateTime.UtcNow;
        NormalizeLoanDates(loan);
        loan.TotalPaid = 0;
        loan.RemainingAmount = loan.Amount - loan.TotalPaid;

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
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var existingLoan = await _dbContext.Loans
            .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

        if (existingLoan == null) return null;

        existingLoan.Amount = updatedLoan.Amount;
        existingLoan.LentBy = updatedLoan.LentBy ?? existingLoan.LentBy;
        existingLoan.BorrowedBy = updatedLoan.BorrowedBy ?? existingLoan.BorrowedBy;
        existingLoan.Description = updatedLoan.Description ?? existingLoan.Description;

        if (updatedLoan.Date != default && updatedLoan.Date != existingLoan.Date)
            existingLoan.Date = NormalizeToUtc(updatedLoan.Date);

        if (updatedLoan.DueDate.HasValue)
            existingLoan.DueDate = NormalizeToUtc(updatedLoan.DueDate.Value);

        if (updatedLoan.NextPaymentDate.HasValue)
            existingLoan.NextPaymentDate = NormalizeToUtc(updatedLoan.NextPaymentDate.Value);

        existingLoan.RemainingAmount = existingLoan.Amount - existingLoan.TotalPaid;

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

        // TODO: Wire IAchievementService.CheckLoanAchievementsAsync via integration event in Phase 6+

        return existingLoan;
    }

    public async Task<bool> DeleteLoanAsync(Guid userId, Guid loanId)
    {
        var loan = await _dbContext.Loans
            .FirstOrDefaultAsync(l => l.Id == loanId && l.UserId == userId.ToString());
        if (loan == null) return false;

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

        var summary = loans.Where(l => !l.IsSettled)
            .GroupBy(l => new { l.LentBy, l.BorrowedBy })
            .Select(g => new { lentBy = g.Key.LentBy, borrowedBy = g.Key.BorrowedBy, totalAmount = g.Sum(l => l.Amount), count = g.Count() })
            .ToList();

        return new
        {
            summary, totalLoans = loans.Count,
            activeLoans = loans.Count(l => !l.IsSettled),
            settledLoans = loans.Count(l => l.IsSettled)
        };
    }

    public async Task<(Loan? loan, bool alreadySettled)> SettleLoanAsync(Guid userId, Guid loanId)
    {
        var loan = await _dbContext.Loans
            .FirstOrDefaultAsync(l => l.Id == loanId && l.UserId == userId.ToString());
        if (loan == null) return (null, false);
        if (loan.IsSettled) return (loan, true);

        loan.IsSettled = true;
        loan.SettledDate = DateTime.UtcNow;
        loan.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        // TODO: Wire IAchievementService.CheckLoanAchievementsAsync via integration event in Phase 6+

        return (loan, false);
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

    private static void NormalizeLoanDates(Loan loan)
    {
        loan.Date = NormalizeToUtc(loan.Date);
        if (loan.DueDate.HasValue) loan.DueDate = NormalizeToUtc(loan.DueDate.Value);
        if (loan.NextPaymentDate.HasValue) loan.NextPaymentDate = NormalizeToUtc(loan.NextPaymentDate.Value);
        if (loan.SettledDate.HasValue) loan.SettledDate = NormalizeToUtc(loan.SettledDate.Value);
    }

    private static void NormalizeSettledDate(Loan loan)
    {
        if (loan.SettledDate.HasValue) loan.SettledDate = NormalizeToUtc(loan.SettledDate.Value);
    }

    private static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        _ => value.ToUniversalTime()
    };
}
