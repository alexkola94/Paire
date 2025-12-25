using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JobMonitorService _jobMonitor;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            AppDbContext context,
            UserManager<ApplicationUser> userManager,
            JobMonitorService jobMonitor,
            ILogger<AdminController> logger)
        {
            _context = context;
            _userManager = userManager;
            _jobMonitor = jobMonitor;
            _logger = logger;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            var totalUsers = await _userManager.Users.CountAsync();
            var totalTransactions = await _context.Transactions.CountAsync();
            var recentErrors = await _context.SystemLogs
                .Where(l => l.Level == "Error" && l.Timestamp > DateTime.UtcNow.AddHours(-24))
                .CountAsync();
            
            // Basic health check of DB
            var dbHealthy = await _context.Database.CanConnectAsync();

            return Ok(new
            {
                TotalUsers = totalUsers,
                TotalTransactions = totalTransactions,
                RecentErrors24h = recentErrors,
                SystemHealth = dbHealthy ? "Healthy" : "Unhealthy",
                ServerTime = DateTime.UtcNow,
                Version = GetType().Assembly.GetName().Version?.ToString() ?? "2.0.0"
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        {
            var query = _userManager.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(u => 
                    u.Email.ToLower().Contains(search) || 
                    (u.DisplayName != null && u.DisplayName.ToLower().Contains(search)));
            }

            var totalItems = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.DisplayName,
                    u.CreatedAt,
                    u.EmailConfirmed,
                    u.LockoutEnd
                })
                .ToListAsync();

            return Ok(new
            {
                Items = users,
                TotalItems = totalItems,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            });
        }

        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs([FromQuery] int count = 50)
        {
            var logs = await _context.SystemLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(count)
                .ToListAsync();

            return Ok(logs);
        }

        [HttpPost("users/{id}/lock")]
        public async Task<IActionResult> LockUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound("User not found");

            // Prevent locking self or other admins (optional safety)
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains("Admin"))
            {
                // Simple safety check - in real app might want super-admin
                // return BadRequest("Cannot lock an Admin user");
            }

            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100)); // Permanent lock
            
            _logger.LogWarning($"User {user.Email} locked by Admin {User.Identity?.Name}");
            return Ok(new { message = $"User {user.Email} has been locked." });
        }

        [HttpPost("users/{id}/unlock")]
        public async Task<IActionResult> UnlockUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound("User not found");

            await _userManager.SetLockoutEndDateAsync(user, null);
            
            _logger.LogInformation($"User {user.Email} unlocked by Admin {User.Identity?.Name}");
            return Ok(new { message = $"User {user.Email} has been unlocked." });
        }

        [HttpPost("users/{id}/reset-2fa")]
        public async Task<IActionResult> ResetTwoFactor(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound("User not found");

            await _userManager.SetTwoFactorEnabledAsync(user, false);
            await _userManager.ResetAuthenticatorKeyAsync(user);
            
            _logger.LogWarning($"2FA reset for user {user.Email} by Admin {User.Identity?.Name}");
            return Ok(new { message = $"2FA has been disabled and reset for {user.Email}." });
        }

        [HttpPost("jobs/{name}/trigger")]
        public async Task<IActionResult> TriggerJob(string name, [FromServices] IReminderService reminderService)
        {
            // Simple mapping for now
            if (name.Equals("ReminderService", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation($"Manual trigger of ReminderService by Admin {User.Identity?.Name}");
                _jobMonitor.ReportStart("ReminderService");
                
                // Run in background to not block response? 
                // Alternatively, run inline to give immediate feedback. 
                // For "Control", user likely wants to know if it SUCCEEDED.
                // Given it's sending emails, it might take time, but let's await it for clear feedback.
                
                try 
                {
                    var count = await reminderService.CheckAndSendAllUsersRemindersAsync();
                    _jobMonitor.ReportSuccess("ReminderService", $"Manual Run: Sent {count} reminders.");
                    return Ok(new { message = $"Job '{name}' executed successfully. Sent {count} reminders." });
                }
                catch (Exception ex)
                {
                    _jobMonitor.ReportFailure("ReminderService", ex);
                    return StatusCode(500, new { message = $"Job failed: {ex.Message}" });
                }
            }

            return BadRequest($"Job '{name}' is not supported for manual triggering.");
        }

        [HttpGet("jobs")]
        public IActionResult GetJobs()
        {
            var jobs = _jobMonitor.GetAllJobs();
            return Ok(jobs);
        }

        [HttpGet("monitoring/metrics")]
        public IActionResult GetPerformanceMetrics([FromServices] MetricsService metricsService)
        {
            var metrics = metricsService.GetMetrics();
            return Ok(metrics);
        }

        [HttpGet("monitoring/database")]
        public async Task<IActionResult> GetDatabaseHealth()
        {
            try
            {
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                var canConnect = await _context.Database.CanConnectAsync();
                stopwatch.Stop();

                var stats = new
                {
                    Status = canConnect ? "Healthy" : "Unhealthy",
                    ConnectionTimeMs = stopwatch.ElapsedMilliseconds,
                    TotalUsers = canConnect ? await _userManager.Users.CountAsync() : 0,
                    TotalTransactions = canConnect ? await _context.Transactions.CountAsync() : 0,
                    TotalPartnerships = canConnect ? await _context.Partnerships.CountAsync() : 0,
                    TotalLoans = canConnect ? await _context.Loans.CountAsync() : 0
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database health check failed");
                return Ok(new
                {
                    Status = "Error",
                    Error = ex.Message
                });
            }
        }

        [HttpGet("monitoring/sessions")]
        public async Task<IActionResult> GetActiveSessions([FromServices] ISessionService sessionService)
        {
            try
            {
                var allSessions = await sessionService.GetAllSessionsAsync();
                var activeSessions = allSessions.Where(s => s.IsActive && !s.RevokedAt.HasValue).ToList();

                return Ok(new
                {
                    TotalSessions = allSessions.Count,
                    ActiveSessions = activeSessions.Count,
                    Sessions = activeSessions.Select(s => new
                    {
                        s.TokenId,
                        DeviceInfo = s.UserAgent,
                        s.IpAddress,
                        s.CreatedAt,
                        s.LastAccessedAt,
                        ActiveMinutes = (DateTime.UtcNow - s.LastAccessedAt).TotalMinutes
                    }).OrderByDescending(s => s.LastAccessedAt).Take(10)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get active sessions");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
