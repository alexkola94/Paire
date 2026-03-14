using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Contracts;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Finance.Core.Services;

public class ReminderDataService : IReminderDataProvider
{
    private readonly FinanceDbContext _db;
    private readonly IPartnershipResolver _partnershipResolver;

    public ReminderDataService(FinanceDbContext db, IPartnershipResolver partnershipResolver)
    {
        _db = db;
        _partnershipResolver = partnershipResolver;
    }

    public async Task<IReadOnlyList<BillReminderDto>> GetUpcomingBillsAsync(Guid userId, int days, IReadOnlyList<string> partnerIds)
    {
        var allUserIds = new List<string> { userId.ToString() };
        allUserIds.AddRange(partnerIds);
        var today = DateTime.UtcNow.Date;
        var reminderDate = today.AddDays(days);
        var overdueCutoff = today.AddDays(-7);

        var bills = await _db.RecurringBills
            .AsNoTracking()
            .Where(b => allUserIds.Contains(b.UserId) && b.IsActive &&
                ((b.NextDueDate >= today && b.NextDueDate <= reminderDate) ||
                 (b.NextDueDate < today && b.NextDueDate >= overdueCutoff)))
            .Select(b => new BillReminderDto(b.Name, b.Amount, b.Category, b.NextDueDate, b.AutoPay))
            .ToListAsync();

        return bills;
    }

    public async Task<IReadOnlyList<LoanReminderDto>> GetUpcomingLoansAsync(Guid userId, int days, IReadOnlyList<string> partnerIds)
    {
        var allUserIds = new List<string> { userId.ToString() };
        allUserIds.AddRange(partnerIds);
        var today = DateTime.UtcNow.Date;
        var reminderDate = today.AddDays(days);
        var overdueCutoff = today.AddDays(-7);

        var loans = await _db.Loans
            .AsNoTracking()
            .Where(l => allUserIds.Contains(l.UserId) && l.DueDate.HasValue &&
                ((l.DueDate!.Value.Date >= today && l.DueDate.Value.Date <= reminderDate) ||
                 (l.DueDate.Value.Date < today && l.DueDate.Value.Date >= overdueCutoff)) &&
                l.RemainingAmount > 0 && !l.IsSettled)
            .Select(l => new LoanReminderDto(l.LentBy, l.BorrowedBy, l.RemainingAmount, l.DueDate!.Value, l.Description))
            .ToListAsync();

        return loans;
    }

    public async Task<IReadOnlyList<BudgetAlertDto>> GetBudgetAlertsAsync(Guid userId, decimal thresholdPercent, IReadOnlyList<string> partnerIds)
    {
        var allUserIds = new List<string> { userId.ToString() };
        allUserIds.AddRange(partnerIds);

        var budgets = await _db.Budgets
            .AsNoTracking()
            .Where(b => allUserIds.Contains(b.UserId) && b.IsActive && b.Amount > 0)
            .ToListAsync();

        var alerts = budgets
            .Where(b => (b.SpentAmount / b.Amount) * 100 >= thresholdPercent)
            .Select(b => new BudgetAlertDto(b.Category, b.Amount, b.SpentAmount, b.Period))
            .ToList();

        return alerts;
    }

    public async Task<IReadOnlyList<SavingsGoalReminderDto>> GetSavingsGoalsForRemindersAsync(Guid userId, IReadOnlyList<string> partnerIds)
    {
        var allUserIds = new List<string> { userId.ToString() };
        allUserIds.AddRange(partnerIds);

        var goals = await _db.SavingsGoals
            .AsNoTracking()
            .Where(g => allUserIds.Contains(g.UserId) && !g.IsAchieved && g.TargetAmount > 0)
            .Select(g => new SavingsGoalReminderDto(g.Name, g.TargetAmount, g.CurrentAmount))
            .ToListAsync();

        return goals;
    }
}
