using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Controller for managing email reminders and notifications
    /// All endpoints require authentication via JWT token
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RemindersController : BaseApiController
    {
        private readonly IReminderService _reminderService;
        private readonly IEmailService _emailService;
        private readonly AppDbContext _dbContext;
        private readonly ILogger<RemindersController> _logger;

        public RemindersController(
            IReminderService reminderService,
            IEmailService emailService,
            AppDbContext dbContext,
            ILogger<RemindersController> logger)
        {
            _reminderService = reminderService;
            _emailService = emailService;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Manually trigger reminder check for the authenticated user
        /// </summary>
        /// <returns>Number of reminders sent</returns>
        [HttpPost("check")]
        [ProducesResponseType(typeof(ReminderCheckResult), 200)]
        public async Task<IActionResult> CheckReminders()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                _logger.LogInformation($"Manual reminder check triggered for user {userId}");
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
                _logger.LogError(ex, $"Error checking reminders for user {userId}");
                return StatusCode(500, new ReminderCheckResult
                {
                    Success = false,
                    RemindersSent = 0,
                    Message = "Failed to check reminders"
                });
            }
        }

        /// <summary>
        /// Get authenticated user's reminder preferences
        /// </summary>
        /// <returns>Reminder preferences</returns>
        [HttpGet("settings")]
        [ProducesResponseType(typeof(ReminderPreferences), 200)]
        public async Task<IActionResult> GetReminderSettings()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Try to get existing preferences from database
                var preferences = await _dbContext.ReminderPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                // If none exist, create default settings
                if (preferences == null)
                {
                    preferences = new ReminderPreferences
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

                return Ok(preferences);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting reminder settings for user {userId}");
                return StatusCode(500, "Failed to retrieve reminder settings");
            }
        }

        /// <summary>
        /// Update authenticated user's reminder preferences
        /// </summary>
        /// <param name="preferences">Updated preferences</param>
        /// <returns>Updated preferences</returns>
        [HttpPut("settings")]
        [ProducesResponseType(typeof(ReminderPreferences), 200)]
        public async Task<IActionResult> UpdateReminderSettings([FromBody] ReminderPreferences preferences)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Check if preferences already exist
                var existing = await _dbContext.ReminderPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (existing != null)
                {
                    // Update existing
                    existing.EmailEnabled = preferences.EmailEnabled;
                    existing.BillRemindersEnabled = preferences.BillRemindersEnabled;
                    existing.BillReminderDays = preferences.BillReminderDays;
                    existing.LoanRemindersEnabled = preferences.LoanRemindersEnabled;
                    existing.LoanReminderDays = preferences.LoanReminderDays;
                    existing.BudgetAlertsEnabled = preferences.BudgetAlertsEnabled;
                    existing.BudgetAlertThreshold = preferences.BudgetAlertThreshold;
                    existing.SavingsMilestonesEnabled = preferences.SavingsMilestonesEnabled;
                    existing.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync();

                    _logger.LogInformation($"Reminder settings updated for user {userId}");
                    return Ok(existing);
                }
                else
                {
                    // Try to create new preferences
                    try
                    {
                        preferences.Id = Guid.NewGuid();
                        preferences.UserId = userId;
                        preferences.CreatedAt = DateTime.UtcNow;
                        preferences.UpdatedAt = DateTime.UtcNow;

                        _dbContext.ReminderPreferences.Add(preferences);
                        await _dbContext.SaveChangesAsync();

                        _logger.LogInformation($"Reminder settings created for user {userId}");
                        return Ok(preferences);
                    }
                    catch (DbUpdateException dbEx) when (dbEx.InnerException is PostgresException pgEx && pgEx.SqlState == "23503")
                    {
                        // Foreign key constraint violation (23503) - This should no longer occur after migration
                        // but kept as a safety measure for any other foreign key issues
                        // The foreign key constraint to auth.users(id) has been removed via migration
                        
                        // Detach the entity to prevent it from being tracked
                        try
                        {
                            var entry = _dbContext.Entry(preferences);
                            if (entry != null && entry.State != EntityState.Detached)
                            {
                                entry.State = EntityState.Detached;
                            }
                        }
                        catch
                        {
                            // Entry might not exist, ignore
                        }
                        
                        _logger.LogError(dbEx, $"Database constraint violation when saving reminder preferences for user {userId}");
                        return StatusCode(500, new { message = "Failed to save reminder settings due to database constraint" });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating reminder settings for user {userId}");
                return StatusCode(500, "Failed to update reminder settings");
            }
        }

        /// <summary>
        /// Send a test email to verify email configuration
        /// </summary>
        /// <param name="email">Email address to send test to</param>
        /// <returns>Success status</returns>
        [HttpPost("test-email")]
        [ProducesResponseType(typeof(TestEmailResult), 200)]
        public async Task<IActionResult> SendTestEmail([FromQuery] string email)
        {
            try
            {
                _logger.LogInformation($"Sending test email to {email}");
                var success = await _emailService.SendTestEmailAsync(email);

                return Ok(new TestEmailResult
                {
                    Success = success,
                    Message = success ? "Test email sent successfully!" : "Failed to send test email"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending test email to {email}");
                return StatusCode(500, new TestEmailResult
                {
                    Success = false,
                    Message = "Failed to send test email"
                });
            }
        }

        /// <summary>
        /// Check specific reminder types
        /// </summary>
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

    /// <summary>
    /// Result model for reminder check
    /// </summary>
    public class ReminderCheckResult
    {
        public bool Success { get; set; }
        public int RemindersSent { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Result model for test email
    /// </summary>
    public class TestEmailResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}

