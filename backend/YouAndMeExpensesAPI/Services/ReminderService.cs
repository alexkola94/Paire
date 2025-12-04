using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Reminder service implementation
    /// Checks database for upcoming bills, loans, budget alerts, etc. and sends email reminders
    /// </summary>
    public class ReminderService : IReminderService
    {
        private readonly ISupabaseService _supabaseService;
        private readonly IEmailService _emailService;
        private readonly ILogger<ReminderService> _logger;

        public ReminderService(
            ISupabaseService supabaseService,
            IEmailService emailService,
            ILogger<ReminderService> logger)
        {
            _supabaseService = supabaseService;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// Sends bill payment reminders for upcoming bills
        /// </summary>
        public async Task<int> SendBillRemindersAsync(Guid userId)
        {
            try
            {
                // Get user's reminder preferences
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null || !preferences.EmailEnabled || !preferences.BillRemindersEnabled)
                {
                    return 0;
                }

                // Get upcoming bills (within reminder days threshold)
                var reminderDate = DateTime.UtcNow.AddDays(preferences.BillReminderDays);
                
                // TODO: Query recurring_bills table for bills due within reminder window
                // For now, returning 0 as database table needs to be created via migration
                _logger.LogInformation($"Bill reminders check completed for user {userId}");
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending bill reminders for user {userId}");
                return 0;
            }
        }

        /// <summary>
        /// Sends loan payment reminder emails
        /// </summary>
        public async Task<int> SendLoanPaymentRemindersAsync(Guid userId)
        {
            try
            {
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null || !preferences.EmailEnabled || !preferences.LoanRemindersEnabled)
                {
                    return 0;
                }

                // Get loans with upcoming payment dates
                var loans = await _supabaseService.GetLoansAsync(userId.ToString());
                var reminderDate = DateTime.UtcNow.AddDays(preferences.LoanReminderDays);
                
                var upcomingLoans = loans.Where(l => 
                    l.DueDate.HasValue && 
                    l.DueDate.Value <= reminderDate &&
                    l.DueDate.Value >= DateTime.UtcNow &&
                    l.RemainingAmount > 0 // Active loans have remaining amount
                ).ToList();

                if (!upcomingLoans.Any())
                {
                    return 0;
                }

                // Send reminders
                var emailsSent = 0;
                foreach (var loan in upcomingLoans)
                {
                    var daysUntilDue = (loan.DueDate.Value - DateTime.UtcNow).Days;
                    var message = $@"
                        <p>Hi there!</p>
                        <div class='alert-box'>
                            <h3>💰 Loan Payment Reminder</h3>
                            <p><strong>Lent By:</strong> {loan.LentBy}</p>
                            <p><strong>Borrowed By:</strong> {loan.BorrowedBy}</p>
                            <p><strong>Amount Due:</strong> ${loan.RemainingAmount:N2}</p>
                            <p><strong>Due Date:</strong> {loan.DueDate.Value:MMMM dd, yyyy} ({daysUntilDue} days)</p>
                        </div>
                        <p>Don't forget to make your payment on time!</p>";

                    var emailMessage = new EmailMessage
                    {
                        ToEmail = "user@example.com", // TODO: Get user email from auth
                        ToName = "User",
                        Subject = $"💰 Loan Payment Due in {daysUntilDue} Days",
                        Body = EmailService.CreateReminderEmailTemplate("Loan Payment Reminder", message),
                        IsHtml = true
                    };

                    if (await _emailService.SendEmailAsync(emailMessage))
                    {
                        emailsSent++;
                    }
                }

                _logger.LogInformation($"Sent {emailsSent} loan reminders for user {userId}");
                return emailsSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending loan reminders for user {userId}");
                return 0;
            }
        }

        /// <summary>
        /// Sends budget alert emails when spending exceeds threshold
        /// </summary>
        public async Task<int> SendBudgetAlertsAsync(Guid userId)
        {
            try
            {
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null || !preferences.EmailEnabled || !preferences.BudgetAlertsEnabled)
                {
                    return 0;
                }

                // TODO: Query budgets table and check spending against budgets
                // For now, returning 0 as database table needs to be created via migration
                _logger.LogInformation($"Budget alerts check completed for user {userId}");
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending budget alerts for user {userId}");
                return 0;
            }
        }

        /// <summary>
        /// Sends savings goal milestone notifications
        /// </summary>
        public async Task<int> SendSavingsGoalRemindersAsync(Guid userId)
        {
            try
            {
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null || !preferences.EmailEnabled || !preferences.SavingsMilestonesEnabled)
                {
                    return 0;
                }

                // TODO: Query savings_goals table and check for milestone achievements
                // For now, returning 0 as database table needs to be created via migration
                _logger.LogInformation($"Savings goal reminders check completed for user {userId}");
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending savings goal reminders for user {userId}");
                return 0;
            }
        }

        /// <summary>
        /// Checks and sends all reminders for a user
        /// </summary>
        public async Task<int> CheckAndSendAllRemindersAsync(Guid userId)
        {
            int totalSent = 0;

            totalSent += await SendBillRemindersAsync(userId);
            totalSent += await SendLoanPaymentRemindersAsync(userId);
            totalSent += await SendBudgetAlertsAsync(userId);
            totalSent += await SendSavingsGoalRemindersAsync(userId);

            _logger.LogInformation($"Sent {totalSent} total reminders for user {userId}");
            return totalSent;
        }

        /// <summary>
        /// Checks and sends reminders for all users (called by background service)
        /// </summary>
        public async Task<int> CheckAndSendAllUsersRemindersAsync()
        {
            try
            {
                // TODO: Get all users from Supabase auth
                // For now, this would need to query auth.users table
                _logger.LogInformation("All users reminder check completed");
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CheckAndSendAllUsersRemindersAsync");
                return 0;
            }
        }

        /// <summary>
        /// Gets user reminder preferences from database
        /// </summary>
        private async Task<ReminderPreferences?> GetUserPreferencesAsync(Guid userId)
        {
            try
            {
                // TODO: Query reminder_preferences table
                // For now, return default preferences
                return new ReminderPreferences
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    EmailEnabled = true,
                    BillRemindersEnabled = true,
                    BillReminderDays = 3,
                    LoanRemindersEnabled = true,
                    LoanReminderDays = 7,
                    BudgetAlertsEnabled = true,
                    BudgetAlertThreshold = 90,
                    SavingsMilestonesEnabled = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting preferences for user {userId}");
                return null;
            }
        }
    }
}

