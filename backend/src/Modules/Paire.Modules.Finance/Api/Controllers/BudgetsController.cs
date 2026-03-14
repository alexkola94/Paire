using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Finance.Api.Controllers;

[Route("api/[controller]")]
public class BudgetsController : BaseApiController
{
    private readonly IBudgetsAppService _budgetsAppService;
    private readonly ILogger<BudgetsController> _logger;

    public BudgetsController(IBudgetsAppService budgetsAppService, ILogger<BudgetsController> logger)
    {
        _budgetsAppService = budgetsAppService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetBudgets()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _budgetsAppService.GetBudgetsWithProfilesAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting budgets for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving budgets", error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBudget(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var budget = await _budgetsAppService.GetBudgetAsync(userId, id);
            return budget == null ? NotFound(new { message = $"Budget {id} not found" }) : Ok(budget);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting budget {Id}", id); return StatusCode(500, new { message = "Error retrieving budget", error = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateBudget([FromBody] Budget budget)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (budget.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero" });
        if (string.IsNullOrEmpty(budget.Category)) return BadRequest(new { message = "Category is required" });

        try
        {
            var created = await _budgetsAppService.CreateBudgetAsync(userId, budget);
            return CreatedAtAction(nameof(GetBudget), new { id = created.Id }, created);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error creating budget"); return StatusCode(500, new { message = "Error creating budget", error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBudget(Guid id, [FromBody] Budget budget)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (id != budget.Id) return BadRequest(new { message = "Budget ID mismatch" });

        try
        {
            var updated = await _budgetsAppService.UpdateBudgetAsync(userId, id, budget);
            return updated == null ? NotFound(new { message = $"Budget {id} not found" }) : Ok(updated);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error updating budget {Id}", id); return StatusCode(500, new { message = "Error updating budget", error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudget(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var deleted = await _budgetsAppService.DeleteBudgetAsync(userId, id);
            return !deleted ? NotFound(new { message = $"Budget {id} not found" }) : NoContent();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error deleting budget {Id}", id); return StatusCode(500, new { message = "Error deleting budget", error = ex.Message }); }
    }
}
