using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Reminder service interface for financial notifications
    /// </summary>
    public interface IReminderService
    {
        /// <summary>
        /// Sends bill payment reminder emails
        /// </summary>
        /// <param name="userId">User ID to check bills for</param>
        /// <returns>Number of reminders sent</returns>
        Task<int> SendBillRemindersAsync(Guid userId);

        /// <summary>
        /// Sends loan payment reminder emails
        /// </summary>
        /// <param name="userId">User ID to check loans for</param>
        /// <returns>Number of reminders sent</returns>
        Task<int> SendLoanPaymentRemindersAsync(Guid userId);

        /// <summary>
        /// Sends budget alert emails when user is over budget
        /// </summary>
        /// <param name="userId">User ID to check budgets for</param>
        /// <returns>Number of alerts sent</returns>
        Task<int> SendBudgetAlertsAsync(Guid userId);

        /// <summary>
        /// Sends savings goal milestone notifications
        /// </summary>
        /// <param name="userId">User ID to check savings goals for</param>
        /// <returns>Number of notifications sent</returns>
        Task<int> SendSavingsGoalRemindersAsync(Guid userId);

        /// <summary>
        /// Get or initialize reminder settings for a user.
        /// </summary>
        Task<ReminderPreferences> GetReminderSettingsAsync(Guid userId);

        /// <summary>
        /// Update or create reminder settings for a user.
        /// </summary>
        Task<ReminderPreferences> UpdateReminderSettingsAsync(Guid userId, ReminderPreferences preferences);

        /// <summary>
        /// Checks and sends all reminders for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>Total number of reminders sent</returns>
        Task<int> CheckAndSendAllRemindersAsync(Guid userId);

        /// <summary>
        /// Checks and sends reminders for all users (called by background service)
        /// </summary>
        /// <returns>Total number of reminders sent across all users</returns>
        Task<int> CheckAndSendAllUsersRemindersAsync();
    }
}

