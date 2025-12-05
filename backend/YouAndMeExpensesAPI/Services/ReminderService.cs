using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Reminder service implementation
    /// Checks database for upcoming bills, loans, budget alerts, etc. and sends email reminders
    /// </summary>
    public class ReminderService : IReminderService
    {
        private readonly AppDbContext _dbContext;
        private readonly IEmailService _emailService;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<ReminderService> _logger;

        public ReminderService(
            AppDbContext dbContext,
            IEmailService emailService,
            UserManager<ApplicationUser> userManager,
            ILogger<ReminderService> logger)
        {
            _dbContext = dbContext;
            _emailService = emailService;
            _userManager = userManager;
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

                // Get user email
                var (userEmail, displayName) = await GetUserEmailAsync(userId);
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning($"No email found for user {userId}, skipping bill reminders");
                    return 0;
                }

                // Get upcoming bills (within reminder days threshold)
                var reminderDate = DateTime.UtcNow.AddDays(preferences.BillReminderDays);
                var today = DateTime.UtcNow.Date;
                
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var upcomingBills = await _dbContext.RecurringBills
                    .Where(b => allUserIds.Contains(b.UserId) 
                        && b.IsActive 
                        && b.NextDueDate >= today 
                        && b.NextDueDate <= reminderDate)
                    .ToListAsync();

                if (!upcomingBills.Any())
                {
                    return 0;
                }

                // Send reminders
                var emailsSent = 0;
                foreach (var bill in upcomingBills)
                {
                    var daysUntilDue = (bill.NextDueDate.Date - today).Days;
                    var message = $@"
                        <p>Hi {displayName}!</p>
                        <div class='alert-box'>
                            <h3>📅 Bill Payment Reminder</h3>
                            <p><strong>Bill:</strong> {bill.Name}</p>
                            <p><strong>Amount:</strong> ${bill.Amount:N2}</p>
                            <p><strong>Category:</strong> {bill.Category}</p>
                            <p><strong>Due Date:</strong> {bill.NextDueDate:MMMM dd, yyyy} ({daysUntilDue} day{(daysUntilDue == 1 ? "" : "s")})</p>
                            {(bill.AutoPay ? "<p><em>This bill is set to auto-pay</em></p>" : "")}
                        </div>
                        <p>Don't forget to make your payment on time!</p>";

                    var emailMessage = new EmailMessage
                    {
                        ToEmail = userEmail,
                        ToName = displayName ?? userEmail,
                        Subject = $"📅 {bill.Name} Due in {daysUntilDue} Day{(daysUntilDue == 1 ? "" : "s")}",
                        Body = EmailService.CreateReminderEmailTemplate("Bill Payment Reminder", message),
                        IsHtml = true
                    };

                    if (await _emailService.SendEmailAsync(emailMessage))
                    {
                        emailsSent++;
                    }
                }

                _logger.LogInformation($"Sent {emailsSent} bill reminders for user {userId}");
                return emailsSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending bill reminders for user {userId}");
                return 0;
            }
        }

        /// <summary>
        /// Helper method to get partner user IDs for the current user
        /// </summary>
        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
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
                _logger.LogError(ex, $"Error getting partner IDs for user {userId}");
                return new List<string>();
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

                // Get user email
                var (userEmail, displayName) = await GetUserEmailAsync(userId);
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning($"No email found for user {userId}, skipping loan reminders");
                    return 0;
                }

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var reminderDate = DateTime.UtcNow.AddDays(preferences.LoanReminderDays);
                var today = DateTime.UtcNow.Date;

                // Get loans with upcoming payment dates
                var upcomingLoans = await _dbContext.Loans
                    .Where(l => allUserIds.Contains(l.UserId)
                        && l.DueDate.HasValue
                        && l.DueDate.Value.Date >= today
                        && l.DueDate.Value.Date <= reminderDate
                        && l.RemainingAmount > 0
                        && !l.IsSettled)
                    .ToListAsync();

                if (!upcomingLoans.Any())
                {
                    return 0;
                }

                // Send reminders
                var emailsSent = 0;
                foreach (var loan in upcomingLoans)
                {
                    if (!loan.DueDate.HasValue) continue;
                    var daysUntilDue = (loan.DueDate.Value.Date - today).Days;
                    var message = $@"
                        <p>Hi {displayName}!</p>
                        <div class='alert-box'>
                            <h3>💰 Loan Payment Reminder</h3>
                            <p><strong>Lent By:</strong> {loan.LentBy}</p>
                            <p><strong>Borrowed By:</strong> {loan.BorrowedBy}</p>
                            <p><strong>Amount Due:</strong> ${loan.RemainingAmount:N2}</p>
                            <p><strong>Due Date:</strong> {loan.DueDate.Value:MMMM dd, yyyy} ({daysUntilDue} day{(daysUntilDue == 1 ? "" : "s")})</p>
                            {(loan.Description != null ? $"<p><strong>Description:</strong> {loan.Description}</p>" : "")}
                        </div>
                        <p>Don't forget to make your payment on time!</p>";

                    var emailMessage = new EmailMessage
                    {
                        ToEmail = userEmail,
                        ToName = displayName ?? userEmail,
                        Subject = $"💰 Loan Payment Due in {daysUntilDue} Day{(daysUntilDue == 1 ? "" : "s")}",
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

                // Get user email
                var (userEmail, displayName) = await GetUserEmailAsync(userId);
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning($"No email found for user {userId}, skipping budget alerts");
                    return 0;
                }

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get active budgets
                var activeBudgets = await _dbContext.Budgets
                    .Where(b => allUserIds.Contains(b.UserId) && b.IsActive)
                    .ToListAsync();

                if (!activeBudgets.Any())
                {
                    return 0;
                }

                // Check each budget for threshold violations
                var alertsSent = 0;
                foreach (var budget in activeBudgets)
                {
                    if (budget.Amount <= 0) continue;

                    var spendingPercentage = (budget.SpentAmount / budget.Amount) * 100;
                    
                    if (spendingPercentage >= preferences.BudgetAlertThreshold)
                    {
                        var message = $@"
                            <p>Hi {displayName}!</p>
                            <div class='alert-box'>
                                <h3>⚠️ Budget Alert</h3>
                                <p><strong>Category:</strong> {budget.Category}</p>
                                <p><strong>Budget Amount:</strong> ${budget.Amount:N2}</p>
                                <p><strong>Spent:</strong> ${budget.SpentAmount:N2}</p>
                                <p><strong>Percentage Used:</strong> {spendingPercentage:F1}%</p>
                                <p><strong>Remaining:</strong> ${(budget.Amount - budget.SpentAmount):N2}</p>
                                <p><strong>Period:</strong> {budget.Period}</p>
                            </div>
                            <p>You've reached {spendingPercentage:F1}% of your {budget.Category} budget. Consider reviewing your spending!</p>";

                        var emailMessage = new EmailMessage
                        {
                            ToEmail = userEmail,
                            ToName = displayName ?? userEmail,
                            Subject = $"⚠️ Budget Alert: {budget.Category} at {spendingPercentage:F1}%",
                            Body = EmailService.CreateReminderEmailTemplate("Budget Alert", message),
                            IsHtml = true
                        };

                        if (await _emailService.SendEmailAsync(emailMessage))
                        {
                            alertsSent++;
                        }
                    }
                }

                _logger.LogInformation($"Sent {alertsSent} budget alerts for user {userId}");
                return alertsSent;
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

                // Get user email
                var (userEmail, displayName) = await GetUserEmailAsync(userId);
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning($"No email found for user {userId}, skipping savings goal reminders");
                    return 0;
                }

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get active savings goals
                var activeGoals = await _dbContext.SavingsGoals
                    .Where(g => allUserIds.Contains(g.UserId) && !g.IsAchieved)
                    .ToListAsync();

                if (!activeGoals.Any())
                {
                    return 0;
                }

                // Check for milestone achievements (25%, 50%, 75%, 100%)
                var notificationsSent = 0;
                foreach (var goal in activeGoals)
                {
                    if (goal.TargetAmount <= 0) continue;

                    var progressPercentage = (goal.CurrentAmount / goal.TargetAmount) * 100;
                    var milestones = new[] { 25, 50, 75, 100 };
                    
                    // Check if we've crossed a milestone threshold
                    foreach (var milestone in milestones)
                    {
                        if (progressPercentage >= milestone && progressPercentage < milestone + 5) // Within 5% of milestone
                        {
                            var message = $@"
                                <p>Hi {displayName}!</p>
                                <div class='alert-box'>
                                    <h3>🎯 Savings Goal Milestone Achieved!</h3>
                                    <p><strong>Goal:</strong> {goal.Name}</p>
                                    <p><strong>Target:</strong> ${goal.TargetAmount:N2}</p>
                                    <p><strong>Current:</strong> ${goal.CurrentAmount:N2}</p>
                                    <p><strong>Progress:</strong> {progressPercentage:F1}%</p>
                                    <p><strong>Remaining:</strong> ${(goal.TargetAmount - goal.CurrentAmount):N2}</p>
                                </div>
                                <p>Congratulations! You've reached {milestone}% of your savings goal! 🎉</p>";

                            var emailMessage = new EmailMessage
                            {
                                ToEmail = userEmail,
                                ToName = displayName ?? userEmail,
                                Subject = $"🎯 {goal.Name}: {milestone}% Milestone Achieved!",
                                Body = EmailService.CreateReminderEmailTemplate("Savings Goal Milestone", message),
                                IsHtml = true
                            };

                            if (await _emailService.SendEmailAsync(emailMessage))
                            {
                                notificationsSent++;
                                break; // Only send one notification per goal
                            }
                        }
                    }
                }

                _logger.LogInformation($"Sent {notificationsSent} savings goal reminders for user {userId}");
                return notificationsSent;
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
                // Get all users who have reminder preferences enabled
                var usersWithPreferences = await _dbContext.ReminderPreferences
                    .Where(p => p.EmailEnabled)
                    .Select(p => p.UserId)
                    .Distinct()
                    .ToListAsync();

                int totalSent = 0;
                foreach (var userId in usersWithPreferences)
                {
                    try
                    {
                        totalSent += await CheckAndSendAllRemindersAsync(userId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error sending reminders for user {userId}");
                    }
                }

                _logger.LogInformation($"Sent {totalSent} total reminders across all users");
                return totalSent;
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
                var preferences = await _dbContext.ReminderPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                // If no preferences exist, return default
                if (preferences == null)
                {
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
                        SavingsMilestonesEnabled = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }

                return preferences;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting preferences for user {userId}");
                return null;
            }
        }

        /// <summary>
        /// Gets user email from database
        /// </summary>
        private async Task<(string? email, string? displayName)> GetUserEmailAsync(Guid userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    return (user.Email, user.DisplayName ?? user.Email);
                }

                // Fallback to UserProfile
                var profile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == userId);
                
                if (profile != null && !string.IsNullOrEmpty(profile.Email))
                {
                    return (profile.Email, profile.DisplayName ?? profile.Email);
                }

                return (null, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting user email for user {userId}");
                return (null, null);
            }
        }
    }
}

