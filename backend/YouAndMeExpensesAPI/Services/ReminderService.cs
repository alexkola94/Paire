using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
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
        private readonly IConfiguration _configuration;

        public ReminderService(
            AppDbContext dbContext,
            IEmailService emailService,
            UserManager<ApplicationUser> userManager,
            ILogger<ReminderService> logger,
            IConfiguration configuration)
        {
            _dbContext = dbContext;
            _emailService = emailService;
            _userManager = userManager;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Gets the frontend URL from configuration
        /// </summary>
        private string GetFrontendUrl()
        {
            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
            // Extract first URL if multiple are provided (comma or semicolon separated)
            if (frontendUrl.Contains(';'))
            {
                frontendUrl = frontendUrl.Split(';')[0].Trim();
            }
            else if (frontendUrl.Contains(','))
            {
                frontendUrl = frontendUrl.Split(',')[0].Trim();
            }
            return frontendUrl;
        }

        /// <summary>
        /// Sends bill payment reminders for upcoming bills
        /// Respects user's EmailEnabled, BillRemindersEnabled, and BillReminderDays settings
        /// </summary>
        public async Task<int> SendBillRemindersAsync(Guid userId)
        {
            try
            {
                // Get user's reminder preferences
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null)
                {
                    _logger.LogWarning($"No preferences found for user {userId}, skipping bill reminders");
                    return 0;
                }

                // Check master email toggle and bill reminders toggle
                if (!preferences.EmailEnabled)
                {
                    _logger.LogDebug($"Email notifications disabled for user {userId}, skipping bill reminders");
                    return 0;
                }

                if (!preferences.BillRemindersEnabled)
                {
                    _logger.LogDebug($"Bill reminders disabled for user {userId}, skipping bill reminders");
                    return 0;
                }

                // Validate and normalize BillReminderDays (ensure it's between 1-30)
                var reminderDays = Math.Max(1, Math.Min(30, preferences.BillReminderDays));
                if (reminderDays != preferences.BillReminderDays)
                {
                    _logger.LogWarning($"BillReminderDays for user {userId} was {preferences.BillReminderDays}, normalized to {reminderDays}");
                }

                // Get user email
                var (userEmail, displayName) = await GetUserEmailAsync(userId);
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning($"No email found for user {userId}, skipping bill reminders");
                    return 0;
                }

                // Calculate reminder date range
                // Include bills due today and within the reminder window
                // Also include overdue bills (up to 7 days past due) to remind about missed payments
                var today = DateTime.UtcNow.Date;
                var reminderDate = today.AddDays(reminderDays);
                var overdueCutoff = today.AddDays(-7); // Include bills up to 7 days overdue
                
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get bills: upcoming (within reminder window) OR overdue (up to 7 days)
                var upcomingBills = await _dbContext.RecurringBills
                    .Where(b => allUserIds.Contains(b.UserId) 
                        && b.IsActive 
                        && ((b.NextDueDate >= today && b.NextDueDate <= reminderDate) // Upcoming bills
                            || (b.NextDueDate < today && b.NextDueDate >= overdueCutoff))) // Overdue bills (up to 7 days)
                    .ToListAsync();

                _logger.LogDebug($"Found {upcomingBills.Count} bills for user {userId} (reminder days: {reminderDays})");

                if (!upcomingBills.Any())
                {
                    return 0;
                }

                // Send reminders
                var emailsSent = 0;
                foreach (var bill in upcomingBills)
                {
                    var daysUntilDue = (bill.NextDueDate.Date - today).Days;
                    var isOverdue = daysUntilDue < 0;
                    var urgencyText = isOverdue 
                        ? $"⚠️ OVERDUE by {Math.Abs(daysUntilDue)} day{(Math.Abs(daysUntilDue) == 1 ? "" : "s")}"
                        : $"{daysUntilDue} day{(daysUntilDue == 1 ? "" : "s")} remaining";
                    
                    var message = $@"
                        <p>Hi {displayName}!</p>
                        <div class='alert-box'>
                            <h3>📅 Bill Payment Reminder</h3>
                            <p><strong>Bill:</strong> {bill.Name}</p>
                            <p><strong>Amount:</strong> ${bill.Amount:N2}</p>
                            <p><strong>Category:</strong> {bill.Category}</p>
                            <p><strong>Due Date:</strong> {bill.NextDueDate:MMMM dd, yyyy}</p>
                            <p><strong>Status:</strong> {urgencyText}</p>
                            {(bill.AutoPay ? "<p><em>This bill is set to auto-pay</em></p>" : "")}
                        </div>
                        <p>{(isOverdue ? "⚠️ This bill is overdue! Please make your payment as soon as possible." : "Don't forget to make your payment on time!")}</p>";

                    var subject = isOverdue
                        ? $"⚠️ OVERDUE: {bill.Name} (Due {Math.Abs(daysUntilDue)} day{(Math.Abs(daysUntilDue) == 1 ? "" : "s")} ago)"
                        : $"📅 {bill.Name} Due in {daysUntilDue} Day{(daysUntilDue == 1 ? "" : "s")}";

                    var emailMessage = new EmailMessage
                    {
                        ToEmail = userEmail,
                        ToName = displayName ?? userEmail,
                        Subject = subject,
                        Body = EmailService.CreateReminderEmailTemplate("Bill Payment Reminder", message, GetFrontendUrl()),
                        IsHtml = true
                    };

                    if (await _emailService.SendEmailAsync(emailMessage))
                    {
                        emailsSent++;
                        _logger.LogDebug($"Sent bill reminder for '{bill.Name}' to user {userId} (due: {bill.NextDueDate:yyyy-MM-dd}, days: {daysUntilDue})");
                    }
                }

                _logger.LogInformation($"Sent {emailsSent} bill reminder(s) for user {userId} (settings: enabled={preferences.BillRemindersEnabled}, days={reminderDays})");
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
        /// Respects user's EmailEnabled, LoanRemindersEnabled, and LoanReminderDays settings
        /// </summary>
        public async Task<int> SendLoanPaymentRemindersAsync(Guid userId)
        {
            try
            {
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null)
                {
                    _logger.LogWarning($"No preferences found for user {userId}, skipping loan reminders");
                    return 0;
                }

                // Check master email toggle and loan reminders toggle
                if (!preferences.EmailEnabled)
                {
                    _logger.LogDebug($"Email notifications disabled for user {userId}, skipping loan reminders");
                    return 0;
                }

                if (!preferences.LoanRemindersEnabled)
                {
                    _logger.LogDebug($"Loan reminders disabled for user {userId}, skipping loan reminders");
                    return 0;
                }

                // Validate and normalize LoanReminderDays (ensure it's between 1-30)
                var reminderDays = Math.Max(1, Math.Min(30, preferences.LoanReminderDays));
                if (reminderDays != preferences.LoanReminderDays)
                {
                    _logger.LogWarning($"LoanReminderDays for user {userId} was {preferences.LoanReminderDays}, normalized to {reminderDays}");
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

                // Calculate reminder date range
                // Include loans due today and within the reminder window
                // Also include overdue loans (up to 7 days past due)
                var today = DateTime.UtcNow.Date;
                var reminderDate = today.AddDays(reminderDays);
                var overdueCutoff = today.AddDays(-7); // Include loans up to 7 days overdue

                // Get loans with upcoming payment dates OR overdue (up to 7 days)
                var upcomingLoans = await _dbContext.Loans
                    .Where(l => allUserIds.Contains(l.UserId)
                        && l.DueDate.HasValue
                        && ((l.DueDate.Value.Date >= today && l.DueDate.Value.Date <= reminderDate) // Upcoming loans
                            || (l.DueDate.Value.Date < today && l.DueDate.Value.Date >= overdueCutoff)) // Overdue loans (up to 7 days)
                        && l.RemainingAmount > 0
                        && !l.IsSettled)
                    .ToListAsync();

                _logger.LogDebug($"Found {upcomingLoans.Count} loans for user {userId} (reminder days: {reminderDays})");

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
                    var isOverdue = daysUntilDue < 0;
                    var urgencyText = isOverdue 
                        ? $"⚠️ OVERDUE by {Math.Abs(daysUntilDue)} day{(Math.Abs(daysUntilDue) == 1 ? "" : "s")}"
                        : $"{daysUntilDue} day{(daysUntilDue == 1 ? "" : "s")} remaining";
                    
                    var message = $@"
                        <p>Hi {displayName}!</p>
                        <div class='alert-box'>
                            <h3>💰 Loan Payment Reminder</h3>
                            <p><strong>Lent By:</strong> {loan.LentBy}</p>
                            <p><strong>Borrowed By:</strong> {loan.BorrowedBy}</p>
                            <p><strong>Amount Due:</strong> ${loan.RemainingAmount:N2}</p>
                            <p><strong>Due Date:</strong> {loan.DueDate.Value:MMMM dd, yyyy}</p>
                            <p><strong>Status:</strong> {urgencyText}</p>
                            {(loan.Description != null ? $"<p><strong>Description:</strong> {loan.Description}</p>" : "")}
                        </div>
                        <p>{(isOverdue ? "⚠️ This loan payment is overdue! Please make your payment as soon as possible." : "Don't forget to make your payment on time!")}</p>";

                    var subject = isOverdue
                        ? $"⚠️ OVERDUE: Loan Payment (Due {Math.Abs(daysUntilDue)} day{(Math.Abs(daysUntilDue) == 1 ? "" : "s")} ago)"
                        : $"💰 Loan Payment Due in {daysUntilDue} Day{(daysUntilDue == 1 ? "" : "s")}";

                    var emailMessage = new EmailMessage
                    {
                        ToEmail = userEmail,
                        ToName = displayName ?? userEmail,
                        Subject = subject,
                        Body = EmailService.CreateReminderEmailTemplate("Loan Payment Reminder", message, GetFrontendUrl()),
                        IsHtml = true
                    };

                    if (await _emailService.SendEmailAsync(emailMessage))
                    {
                        emailsSent++;
                        _logger.LogDebug($"Sent loan reminder for loan ID {loan.Id} to user {userId} (due: {loan.DueDate.Value:yyyy-MM-dd}, days: {daysUntilDue})");
                    }
                }

                _logger.LogInformation($"Sent {emailsSent} loan reminder(s) for user {userId} (settings: enabled={preferences.LoanRemindersEnabled}, days={reminderDays})");
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
        /// Respects user's EmailEnabled, BudgetAlertsEnabled, and BudgetAlertThreshold settings
        /// </summary>
        public async Task<int> SendBudgetAlertsAsync(Guid userId)
        {
            try
            {
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null)
                {
                    _logger.LogWarning($"No preferences found for user {userId}, skipping budget alerts");
                    return 0;
                }

                // Check master email toggle and budget alerts toggle
                if (!preferences.EmailEnabled)
                {
                    _logger.LogDebug($"Email notifications disabled for user {userId}, skipping budget alerts");
                    return 0;
                }

                if (!preferences.BudgetAlertsEnabled)
                {
                    _logger.LogDebug($"Budget alerts disabled for user {userId}, skipping budget alerts");
                    return 0;
                }

                // Validate and normalize BudgetAlertThreshold (ensure it's between 0-100)
                var threshold = Math.Max(0, Math.Min(100, (int)preferences.BudgetAlertThreshold));
                if (threshold != (int)preferences.BudgetAlertThreshold)
                {
                    _logger.LogWarning($"BudgetAlertThreshold for user {userId} was {preferences.BudgetAlertThreshold}, normalized to {threshold}");
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
                    _logger.LogDebug($"No active budgets found for user {userId}");
                    return 0;
                }

                // Check each budget for threshold violations
                // Note: This will send alerts daily if the budget remains above threshold
                // This is intentional behavior to keep users informed of ongoing budget issues
                var alertsSent = 0;
                foreach (var budget in activeBudgets)
                {
                    if (budget.Amount <= 0) continue;

                    var spendingPercentage = (budget.SpentAmount / budget.Amount) * 100;
                    
                    // Send alert if spending has reached or exceeded the user's configured threshold
                    if (spendingPercentage >= threshold)
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
                            Body = EmailService.CreateReminderEmailTemplate("Budget Alert", message, GetFrontendUrl()),
                            IsHtml = true
                        };

                        if (await _emailService.SendEmailAsync(emailMessage))
                        {
                            alertsSent++;
                            _logger.LogDebug($"Sent budget alert for '{budget.Category}' to user {userId} (spent: {spendingPercentage:F1}%, threshold: {threshold}%)");
                        }
                    }
                    else
                    {
                        _logger.LogDebug($"Budget '{budget.Category}' for user {userId} is at {spendingPercentage:F1}%, below threshold of {threshold}%");
                    }
                }

                _logger.LogInformation($"Sent {alertsSent} budget alert(s) for user {userId} (settings: enabled={preferences.BudgetAlertsEnabled}, threshold={threshold}%)");
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
        /// Respects user's EmailEnabled and SavingsMilestonesEnabled settings
        /// </summary>
        public async Task<int> SendSavingsGoalRemindersAsync(Guid userId)
        {
            try
            {
                var preferences = await GetUserPreferencesAsync(userId);
                if (preferences == null)
                {
                    _logger.LogWarning($"No preferences found for user {userId}, skipping savings goal reminders");
                    return 0;
                }

                // Check master email toggle and savings milestones toggle
                if (!preferences.EmailEnabled)
                {
                    _logger.LogDebug($"Email notifications disabled for user {userId}, skipping savings goal reminders");
                    return 0;
                }

                if (!preferences.SavingsMilestonesEnabled)
                {
                    _logger.LogDebug($"Savings milestones disabled for user {userId}, skipping savings goal reminders");
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
                    _logger.LogDebug($"No active savings goals found for user {userId}");
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
                    // Note: This checks if progress is within 5% of a milestone to prevent
                    // sending notifications too frequently, but may send once per day if progress stays in range
                    bool milestoneFound = false;
                    foreach (var milestone in milestones)
                    {
                        // Send notification when progress is at or just past a milestone (within 5% window)
                        if (progressPercentage >= milestone && progressPercentage < milestone + 5)
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
                                Body = EmailService.CreateReminderEmailTemplate("Savings Goal Milestone", message, GetFrontendUrl()),
                                IsHtml = true
                            };

                            if (await _emailService.SendEmailAsync(emailMessage))
                            {
                                notificationsSent++;
                                _logger.LogDebug($"Sent savings milestone notification for '{goal.Name}' to user {userId} (progress: {progressPercentage:F1}%, milestone: {milestone}%)");
                                milestoneFound = true;
                                break; // Only send one notification per goal
                            }
                        }
                    }
                    
                    if (!milestoneFound)
                    {
                        _logger.LogDebug($"Savings goal '{goal.Name}' for user {userId} is at {progressPercentage:F1}%, not at any milestone threshold");
                    }
                }

                _logger.LogInformation($"Sent {notificationsSent} savings goal reminder(s) for user {userId} (settings: enabled={preferences.SavingsMilestonesEnabled})");
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
        /// Each reminder type respects the user's settings:
        /// - EmailEnabled: Master toggle (checked by all reminder types)
        /// - BillRemindersEnabled + BillReminderDays: Controls bill reminders
        /// - LoanRemindersEnabled + LoanReminderDays: Controls loan reminders
        /// - BudgetAlertsEnabled + BudgetAlertThreshold: Controls budget alerts
        /// - SavingsMilestonesEnabled: Controls savings goal milestone notifications
        /// </summary>
        public async Task<int> CheckAndSendAllRemindersAsync(Guid userId)
        {
            int totalSent = 0;

            // Each method checks EmailEnabled and its specific toggle before sending
            totalSent += await SendBillRemindersAsync(userId);
            totalSent += await SendLoanPaymentRemindersAsync(userId);
            totalSent += await SendBudgetAlertsAsync(userId);
            totalSent += await SendSavingsGoalRemindersAsync(userId);

            _logger.LogInformation($"Sent {totalSent} total reminder(s) for user {userId}");
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

