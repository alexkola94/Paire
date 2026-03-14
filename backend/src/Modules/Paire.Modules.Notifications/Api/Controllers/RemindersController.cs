using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Notifications.Core.Entities;
using Paire.Modules.Notifications.Core.Interfaces;
using Paire.Shared.Infrastructure.Email;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Notifications.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RemindersController : BaseApiController
{
    private readonly IReminderService _reminderService;
    private readonly IEmailService _emailService;
    private readonly ILogger<RemindersController> _logger;

    public RemindersController(
        IReminderService reminderService,
        IEmailService emailService,
        ILogger<RemindersController> logger)
    {
        _reminderService = reminderService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("check")]
    [ProducesResponseType(typeof(ReminderCheckResult), 200)]
    public async Task<IActionResult> CheckReminders()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            _logger.LogInformation("Manual reminder check triggered for user {UserId}", userId);
            var remindersSent = await _reminderService.CheckAndSendAllRemindersAsync(userId);
            return Ok(new ReminderCheckResult
            {
                Success = true,
                RemindersSent = remindersSent,
                Message = $"Sent {remindersSent} reminder(s) successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking reminders for user {UserId}", userId);
            return StatusCode(500, new ReminderCheckResult { Success = false, RemindersSent = 0, Message = "Failed to check reminders" });
        }
    }

    [HttpGet("settings")]
    [ProducesResponseType(typeof(ReminderPreferences), 200)]
    public async Task<IActionResult> GetReminderSettings()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var preferences = await _reminderService.GetReminderSettingsAsync(userId);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting reminder settings for user {UserId}", userId);
            return StatusCode(500, "Failed to retrieve reminder settings");
        }
    }

    [HttpPut("settings")]
    [ProducesResponseType(typeof(ReminderPreferences), 200)]
    public async Task<IActionResult> UpdateReminderSettings([FromBody] ReminderPreferences preferences)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var updated = await _reminderService.UpdateReminderSettingsAsync(userId, preferences);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating reminder settings for user {UserId}", userId);
            return StatusCode(500, "Failed to update reminder settings");
        }
    }

    [HttpPost("test-email")]
    [ProducesResponseType(typeof(TestEmailResult), 200)]
    public async Task<IActionResult> SendTestEmail([FromQuery] string email)
    {
        try
        {
            _logger.LogInformation("Sending test email to {Email}", email);
            var success = await _emailService.SendTestEmailAsync(email);
            return Ok(new TestEmailResult
            {
                Success = success,
                Message = success ? "Test email sent successfully!" : "Failed to send test email"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending test email to {Email}", email);
            return StatusCode(500, new TestEmailResult { Success = false, Message = "Failed to send test email" });
        }
    }

    [HttpPost("check-bills")]
    public async Task<IActionResult> CheckBillReminders()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        var sent = await _reminderService.SendBillRemindersAsync(userId);
        return Ok(new { remindersSent = sent });
    }

    [HttpPost("check-loans")]
    public async Task<IActionResult> CheckLoanReminders()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        var sent = await _reminderService.SendLoanPaymentRemindersAsync(userId);
        return Ok(new { remindersSent = sent });
    }

    [HttpPost("check-budgets")]
    public async Task<IActionResult> CheckBudgetAlerts()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        var sent = await _reminderService.SendBudgetAlertsAsync(userId);
        return Ok(new { remindersSent = sent });
    }

    [HttpPost("check-savings")]
    public async Task<IActionResult> CheckSavingsReminders()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        var sent = await _reminderService.SendSavingsGoalRemindersAsync(userId);
        return Ok(new { remindersSent = sent });
    }
}

public class ReminderCheckResult
{
    public bool Success { get; set; }
    public int RemindersSent { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class TestEmailResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
