using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using Paire.Modules.Finance.Contracts;
using Paire.Modules.Identity.Contracts;
using Paire.Modules.Notifications.Core.Entities;
using Paire.Modules.Notifications.Core.Interfaces;
using Paire.Modules.Notifications.Infrastructure;
using Paire.Modules.Partnership.Contracts;
using Paire.Shared.Infrastructure.Email;

namespace Paire.Modules.Notifications.Core.Services;

public class ReminderService : IReminderService
{
    private readonly NotificationsDbContext _context;
    private readonly IReminderDataProvider _reminderData;
    private readonly IUserProfileProvider _userProfile;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReminderService> _logger;

    public ReminderService(
        NotificationsDbContext context,
        IReminderDataProvider reminderData,
        IUserProfileProvider userProfile,
        IPartnershipResolver partnershipResolver,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<ReminderService> logger)
    {
        _context = context;
        _reminderData = reminderData;
        _userProfile = userProfile;
        _partnershipResolver = partnershipResolver;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    private string GetFrontendUrl()
    {
        var url = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
        if (url.Contains(';')) url = url.Split(';')[0].Trim();
        else if (url.Contains(',')) url = url.Split(',')[0].Trim();
        return url;
    }

    private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
    {
        try
        {
            var partnerId = await _partnershipResolver.GetPartnerUserIdAsync(userId.ToString());
            return partnerId != null ? new List<string> { partnerId } : new List<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting partner IDs for user {UserId}", userId);
            return new List<string>();
        }
    }

    private async Task<(string? Email, string? DisplayName)> GetUserEmailAsync(Guid userId)
    {
        var profile = await _userProfile.GetProfileInfoAsync(userId);
        return (profile?.Email, profile?.DisplayName);
    }

    public async Task<ReminderPreferences> GetReminderSettingsAsync(Guid userId)
    {
        var prefs = await _context.ReminderPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs != null) return prefs;

        prefs = new ReminderPreferences
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
            PrivacyHideNumbers = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        return prefs;
    }

    public async Task<ReminderPreferences> UpdateReminderSettingsAsync(Guid userId, ReminderPreferences preferences)
    {
        var existing = await _context.ReminderPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (existing != null)
        {
            existing.EmailEnabled = preferences.EmailEnabled;
            existing.BillRemindersEnabled = preferences.BillRemindersEnabled;
            existing.BillReminderDays = preferences.BillReminderDays;
            existing.LoanRemindersEnabled = preferences.LoanRemindersEnabled;
            existing.LoanReminderDays = preferences.LoanReminderDays;
            existing.BudgetAlertsEnabled = preferences.BudgetAlertsEnabled;
            existing.BudgetAlertThreshold = preferences.BudgetAlertThreshold;
            existing.SavingsMilestonesEnabled = preferences.SavingsMilestonesEnabled;
            existing.PrivacyHideNumbers = preferences.PrivacyHideNumbers;
            if (!string.IsNullOrWhiteSpace(preferences.DashboardOverviewMode)) existing.DashboardOverviewMode = preferences.DashboardOverviewMode;
            if (!string.IsNullOrWhiteSpace(preferences.ChatbotPersonality)) existing.ChatbotPersonality = preferences.ChatbotPersonality;
            existing.WeeklyRecapEnabled = preferences.WeeklyRecapEnabled;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return existing;
        }

        preferences.Id = Guid.NewGuid();
        preferences.UserId = userId;
        preferences.CreatedAt = DateTime.UtcNow;
        preferences.UpdatedAt = DateTime.UtcNow;
        _context.ReminderPreferences.Add(preferences);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23503")
        {
            _logger.LogError(ex, "Database constraint violation saving reminder preferences for user {UserId}", userId);
            throw;
        }
        return preferences;
    }

    public async Task<int> SendBillRemindersAsync(Guid userId)
    {
        var prefs = await GetReminderSettingsAsync(userId);
        if (!prefs.EmailEnabled || !prefs.BillRemindersEnabled) return 0;

        var days = Math.Max(1, Math.Min(30, prefs.BillReminderDays));
        var (email, displayName) = await GetUserEmailAsync(userId);
        if (string.IsNullOrEmpty(email)) return 0;

        var partnerIds = await GetPartnerIdsAsync(userId);
        var bills = await _reminderData.GetUpcomingBillsAsync(userId, days, partnerIds);
        if (bills.Count == 0) return 0;

        var today = DateTime.UtcNow.Date;
        var frontendUrl = GetFrontendUrl();
        var sent = 0;
        foreach (var bill in bills)
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
                ToEmail = email,
                ToName = displayName ?? email,
                Subject = subject,
                Body = _emailService.CreateReminderEmailTemplate("Bill Payment Reminder", message, frontendUrl),
                IsHtml = true
            };

            if (await _emailService.SendEmailAsync(emailMessage)) sent++;
        }
        return sent;
    }

    public async Task<int> SendLoanPaymentRemindersAsync(Guid userId)
    {
        var prefs = await GetReminderSettingsAsync(userId);
        if (!prefs.EmailEnabled || !prefs.LoanRemindersEnabled) return 0;

        var days = Math.Max(1, Math.Min(30, prefs.LoanReminderDays));
        var (email, displayName) = await GetUserEmailAsync(userId);
        if (string.IsNullOrEmpty(email)) return 0;

        var partnerIds = await GetPartnerIdsAsync(userId);
        var loans = await _reminderData.GetUpcomingLoansAsync(userId, days, partnerIds);
        if (loans.Count == 0) return 0;

        var today = DateTime.UtcNow.Date;
        var frontendUrl = GetFrontendUrl();
        var sent = 0;
        foreach (var loan in loans)
        {
            var daysUntilDue = (loan.DueDate.Date - today).Days;
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
                    <p><strong>Due Date:</strong> {loan.DueDate:MMMM dd, yyyy}</p>
                    <p><strong>Status:</strong> {urgencyText}</p>
                    {(loan.Description != null ? $"<p><strong>Description:</strong> {loan.Description}</p>" : "")}
                </div>
                <p>{(isOverdue ? "⚠️ This loan payment is overdue! Please make your payment as soon as possible." : "Don't forget to make your payment on time!")}</p>";

            var subject = isOverdue
                ? $"⚠️ OVERDUE: Loan Payment (Due {Math.Abs(daysUntilDue)} day{(Math.Abs(daysUntilDue) == 1 ? "" : "s")} ago)"
                : $"💰 Loan Payment Due in {daysUntilDue} Day{(daysUntilDue == 1 ? "" : "s")}";

            var emailMessage = new EmailMessage
            {
                ToEmail = email,
                ToName = displayName ?? email,
                Subject = subject,
                Body = _emailService.CreateReminderEmailTemplate("Loan Payment Reminder", message, frontendUrl),
                IsHtml = true
            };

            if (await _emailService.SendEmailAsync(emailMessage)) sent++;
        }
        return sent;
    }

    public async Task<int> SendBudgetAlertsAsync(Guid userId)
    {
        var prefs = await GetReminderSettingsAsync(userId);
        if (!prefs.EmailEnabled || !prefs.BudgetAlertsEnabled) return 0;

        var threshold = Math.Max(0, Math.Min(100, (int)prefs.BudgetAlertThreshold));
        var (email, displayName) = await GetUserEmailAsync(userId);
        if (string.IsNullOrEmpty(email)) return 0;

        var partnerIds = await GetPartnerIdsAsync(userId);
        var alerts = await _reminderData.GetBudgetAlertsAsync(userId, threshold, partnerIds);
        if (alerts.Count == 0) return 0;

        var frontendUrl = GetFrontendUrl();
        var sent = 0;
        foreach (var budget in alerts)
        {
            var pct = (budget.SpentAmount / budget.Amount) * 100;
            var message = $@"
                <p>Hi {displayName}!</p>
                <div class='alert-box'>
                    <h3>⚠️ Budget Alert</h3>
                    <p><strong>Category:</strong> {budget.Category}</p>
                    <p><strong>Budget Amount:</strong> ${budget.Amount:N2}</p>
                    <p><strong>Spent:</strong> ${budget.SpentAmount:N2}</p>
                    <p><strong>Percentage Used:</strong> {pct:F1}%</p>
                    <p><strong>Remaining:</strong> ${(budget.Amount - budget.SpentAmount):N2}</p>
                    <p><strong>Period:</strong> {budget.Period}</p>
                </div>
                <p>You've reached {pct:F1}% of your {budget.Category} budget. Consider reviewing your spending!</p>";

            var emailMessage = new EmailMessage
            {
                ToEmail = email,
                ToName = displayName ?? email,
                Subject = $"⚠️ Budget Alert: {budget.Category} at {pct:F1}%",
                Body = _emailService.CreateReminderEmailTemplate("Budget Alert", message, frontendUrl),
                IsHtml = true
            };

            if (await _emailService.SendEmailAsync(emailMessage)) sent++;
        }
        return sent;
    }

    public async Task<int> SendSavingsGoalRemindersAsync(Guid userId)
    {
        var prefs = await GetReminderSettingsAsync(userId);
        if (!prefs.EmailEnabled || !prefs.SavingsMilestonesEnabled) return 0;

        var (email, displayName) = await GetUserEmailAsync(userId);
        if (string.IsNullOrEmpty(email)) return 0;

        var partnerIds = await GetPartnerIdsAsync(userId);
        var goals = await _reminderData.GetSavingsGoalsForRemindersAsync(userId, partnerIds);
        if (goals.Count == 0) return 0;

        var frontendUrl = GetFrontendUrl();
        var sent = 0;
        foreach (var goal in goals)
        {
            if (goal.TargetAmount <= 0) continue;
            var pct = (goal.CurrentAmount / goal.TargetAmount) * 100;
            var milestones = new[] { 25, 50, 75, 100 };
            foreach (var m in milestones)
            {
                if (pct >= m && pct < m + 5)
                {
                    var message = $@"
                        <p>Hi {displayName}!</p>
                        <div class='alert-box'>
                            <h3>🎯 Savings Goal Milestone Achieved!</h3>
                            <p><strong>Goal:</strong> {goal.Name}</p>
                            <p><strong>Target:</strong> ${goal.TargetAmount:N2}</p>
                            <p><strong>Current:</strong> ${goal.CurrentAmount:N2}</p>
                            <p><strong>Progress:</strong> {pct:F1}%</p>
                            <p><strong>Remaining:</strong> ${(goal.TargetAmount - goal.CurrentAmount):N2}</p>
                        </div>
                        <p>Congratulations! You've reached {m}% of your {goal.Name} savings goal!</p>";

                    var emailMessage = new EmailMessage
                    {
                        ToEmail = email,
                        ToName = displayName ?? email,
                        Subject = $"🎯 {m}% Milestone: {goal.Name}",
                        Body = _emailService.CreateReminderEmailTemplate("Savings Milestone", message, frontendUrl),
                        IsHtml = true
                    };

                    if (await _emailService.SendEmailAsync(emailMessage)) sent++;
                    break;
                }
            }
        }
        return sent;
    }

    public async Task<int> CheckAndSendAllRemindersAsync(Guid userId)
    {
        var b = await SendBillRemindersAsync(userId);
        var l = await SendLoanPaymentRemindersAsync(userId);
        var bg = await SendBudgetAlertsAsync(userId);
        var s = await SendSavingsGoalRemindersAsync(userId);
        return b + l + bg + s;
    }

    public async Task<int> CheckAndSendAllUsersRemindersAsync()
    {
        var userIds = await _context.ReminderPreferences
            .Where(p => p.EmailEnabled)
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync();

        var total = 0;
        foreach (var uid in userIds)
        {
            try
            {
                total += await CheckAndSendAllRemindersAsync(uid);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending reminders for user {UserId}", uid);
            }
        }
        return total;
    }
}
