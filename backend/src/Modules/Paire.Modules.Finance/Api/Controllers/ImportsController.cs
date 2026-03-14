using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;

namespace Paire.Modules.Finance.Api.Controllers;

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
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return Ok(await _importsService.GetImportHistoryAsync(userId));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RevertImport(Guid id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var (found, errorMessage) = await _importsService.RevertImportAsync(userId, id);
        if (!found) return NotFound();
        if (!string.IsNullOrEmpty(errorMessage)) return StatusCode(500, errorMessage);
        return Ok(new { message = "Import reverted successfully." });
    }
}
