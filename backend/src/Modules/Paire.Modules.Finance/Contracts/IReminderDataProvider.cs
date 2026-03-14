namespace Paire.Modules.Finance.Contracts;

/// <summary>
/// Provides reminder-related data for the Notifications module.
/// Implemented by Finance module.
/// </summary>
public interface IReminderDataProvider
{
    Task<IReadOnlyList<BillReminderDto>> GetUpcomingBillsAsync(Guid userId, int days, IReadOnlyList<string> partnerIds);
    Task<IReadOnlyList<LoanReminderDto>> GetUpcomingLoansAsync(Guid userId, int days, IReadOnlyList<string> partnerIds);
    Task<IReadOnlyList<BudgetAlertDto>> GetBudgetAlertsAsync(Guid userId, decimal thresholdPercent, IReadOnlyList<string> partnerIds);
    Task<IReadOnlyList<SavingsGoalReminderDto>> GetSavingsGoalsForRemindersAsync(Guid userId, IReadOnlyList<string> partnerIds);
}

public record BillReminderDto(string Name, decimal Amount, string Category, DateTime NextDueDate, bool AutoPay);
public record LoanReminderDto(string LentBy, string BorrowedBy, decimal RemainingAmount, DateTime DueDate, string? Description);
public record BudgetAlertDto(string Category, decimal Amount, decimal SpentAmount, string Period);
public record SavingsGoalReminderDto(string Name, decimal TargetAmount, decimal CurrentAmount);
