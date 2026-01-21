using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            IAdminService adminService,
            ILogger<AdminController> logger)
        {
            _adminService = adminService;
            _logger = logger;
        }

        // 1. Dashboard Stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            var stats = await _adminService.GetSystemStatsAsync();
            return Ok(stats);
        }

        // 2. Health Check
        [AllowAnonymous]
        [HttpGet("health")]
        public async Task<IActionResult> GetHealth()
        {
            var health = await _adminService.GetHealthAsync();
            return Ok(health);
        }

        // 3. Users List
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] string? search = null)
        {
            var result = await _adminService.GetUsersAsync(search);
            return Ok(result);
        }

        // 4. System Logs
        [HttpGet("system-logs")]
        public async Task<IActionResult> GetSystemLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? level = null)
        {
            var result = await _adminService.GetSystemLogsAsync(page, pageSize, level);
            return Ok(result);
        }

        // 5. Background Jobs Stats
        [HttpGet("jobs/stats")]
        public IActionResult GetJobStats()
        {
            var result = _adminService.GetJobStatsAsync().Result;
            return Ok(result);
        }

        // 6. Tenant Features
        [AllowAnonymous]
        [HttpGet("features")]
        public IActionResult GetFeatures()
        {
            var apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = _adminService.GetFeatures(apiBaseUrl);
            return Ok(result);
        }

        // 7. User Actions
        [HttpPost("users/{id}/lock")]
        public async Task<IActionResult> LockUser(string id)
        {
            var actingUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var actingUserName = User.Identity?.Name;

            var result = await _adminService.LockUserAsync(id, actingUserId, actingUserName);

            // Preserve 404 when user not found
            var notFoundProp = result.GetType().GetProperty("NotFound");
            if (notFoundProp != null && (bool)(notFoundProp.GetValue(result) ?? false))
            {
                return NotFound(new { error = "NotFound", message = "User not found" });
            }

            return Ok(result);
        }

        [HttpPost("users/{id}/unlock")]
        public async Task<IActionResult> UnlockUser(string id)
        {
            var actingUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var actingUserName = User.Identity?.Name;

            var result = await _adminService.UnlockUserAsync(id, actingUserId, actingUserName);

            if (result == null)
            {
                return NotFound(new { error = "NotFound", message = "User not found" });
            }

            return Ok(result);
        }

        // 8. Version Info
        [HttpGet("version")]
        public IActionResult GetVersion()
        {
            var result = _adminService.GetVersion();
            return Ok(result);
        }

        // --- Legacy / Utility Endpoints ---

        [HttpPost("jobs/{name}/trigger")]
        public async Task<IActionResult> TriggerJob(string name, [FromServices] IReminderService reminderService)
        {
            if (name.Equals("ReminderService", StringComparison.OrdinalIgnoreCase))
            {
                var result = await _adminService.TriggerReminderJobAsync();
                return Ok(result);
            }

            return BadRequest(new { error = "BadRequest", message = $"Job '{name}' is not supported for manual triggering." });
        }

        [HttpPost("jobs/{name}/retry")]
            public async Task<IActionResult> RetryJob(string name, [FromServices] IReminderService reminderService)
            {
                // Maps to TriggerJob logic for now as 'Retrying' a scheduled job usually means running it immediately.
                return await TriggerJob(name, reminderService);
            }

        [HttpDelete("jobs/{name}")]
        public IActionResult DeleteJob(string name)
        {
             var result = _adminService.DeleteJobAsync(name).Result;
             return Ok(result);
        }
        
        [HttpPost("jobs/trigger")]
        public async Task<IActionResult> TriggerGenericJob([FromBody] string name, [FromServices] IReminderService reminderService)
        {
            return await TriggerJob(name, reminderService);
        }
        
        [HttpGet("audit/logs")]
        public async Task<IActionResult> GetAuditLogs([FromServices] IAuditService auditService, [FromQuery] string? userId = null, [FromQuery] string? action = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
             var (logs, totalCount) = await _adminService.GetAuditLogsAsync(userId, action, startDate, endDate, page, pageSize);
             return Ok(new { Logs = logs, TotalCount = totalCount, Page = page, PageSize = pageSize, TotalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }
        
        [HttpGet("audit/security-alerts")]
        public async Task<IActionResult> GetSecurityAlerts([FromServices] IAuditService auditService)
        {
             var alerts = await _adminService.GetSecurityAlertsAsync();
             return Ok(alerts);
        }
        [HttpPost("maintenance")]
        public async Task<IActionResult> SetMaintenanceMode([FromBody] YouAndMeExpensesAPI.Models.Admin.MaintenanceModeRequest model)
        {
            string token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            if (string.IsNullOrEmpty(token)) return Unauthorized();

            var result = await _adminService.SetMaintenanceModeAsync(model, token);

            var invalidPasswordProp = result.GetType().GetProperty("InvalidPassword");
            if (invalidPasswordProp != null && (bool)(invalidPasswordProp.GetValue(result) ?? false))
            {
                return BadRequest(new { Message = "Invalid password" });
            }

             return Ok(result);
        }

        [HttpPost("broadcast")]
        public async Task<IActionResult> BroadcastMessage([FromBody] YouAndMeExpensesAPI.Models.Admin.BroadcastRequest model)
        {
            string token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            if (string.IsNullOrEmpty(token)) return Unauthorized();

            var result = await _adminService.BroadcastMessageAsync(model, token);

            var invalidPasswordProp = result.GetType().GetProperty("InvalidPassword");
            if (invalidPasswordProp != null && (bool)(invalidPasswordProp.GetValue(result) ?? false))
            {
                return BadRequest(new { Message = "Invalid password" });
            }

            return Ok(result);
        }

        [HttpPost("cache/clear")]
        public IActionResult ClearCache()
        {
             var result = _adminService.ClearCache();
             return Ok(result);
        }
    }
}
