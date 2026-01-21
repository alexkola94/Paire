using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ImportsController : ControllerBase
    {
        private readonly IImportsService _importsService;
        private readonly ILogger<ImportsController> _logger;

        public ImportsController(IImportsService importsService, ILogger<ImportsController> logger)
        {
            _importsService = importsService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ImportHistory>>> GetImportHistory()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var history = await _importsService.GetImportHistoryAsync(userId);
            return Ok(history);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RevertImport(Guid id)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var (found, errorMessage) = await _importsService.RevertImportAsync(userId, id);

            if (!found) return NotFound();

            if (!string.IsNullOrEmpty(errorMessage))
            {
                return StatusCode(500, errorMessage);
            }

            return Ok(new { message = "Import reverted successfully." });
        }
    }
}
