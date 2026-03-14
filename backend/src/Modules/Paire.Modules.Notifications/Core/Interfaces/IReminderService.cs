using Paire.Modules.Notifications.Core.Entities;

namespace Paire.Modules.Notifications.Core.Interfaces;

public interface IReminderService
{
    Task<int> SendBillRemindersAsync(Guid userId);
    Task<int> SendLoanPaymentRemindersAsync(Guid userId);
    Task<int> SendBudgetAlertsAsync(Guid userId);
    Task<int> SendSavingsGoalRemindersAsync(Guid userId);
    Task<ReminderPreferences> GetReminderSettingsAsync(Guid userId);
    Task<ReminderPreferences> UpdateReminderSettingsAsync(Guid userId, ReminderPreferences preferences);
    Task<int> CheckAndSendAllRemindersAsync(Guid userId);
    Task<int> CheckAndSendAllUsersRemindersAsync();
}
