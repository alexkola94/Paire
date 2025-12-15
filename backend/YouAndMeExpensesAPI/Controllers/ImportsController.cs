using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ImportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ImportsController> _logger;

        public ImportsController(AppDbContext context, ILogger<ImportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ImportHistory>>> GetImportHistory()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var history = await _context.ImportHistories
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.ImportDate)
                .ToListAsync();

            return Ok(history);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RevertImport(Guid id)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var import = await _context.ImportHistories
                .Include(h => h.Transactions)
                .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId);

            if (import == null) return NotFound();

            try
            {
                // Delete associated transactions
                if (import.Transactions != null && import.Transactions.Any())
                {
                    _context.Transactions.RemoveRange(import.Transactions);
                }

                // Delete the history record
                _context.ImportHistories.Remove(import);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Reverted import {ImportId} for user {UserId}", id, userId);
                return Ok(new { message = "Import reverted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reverting import {ImportId}", id);
                return StatusCode(500, "An error occurred while reverting the import.");
            }
        }
    }
}
