using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Finance.Api.Controllers;

[Route("api/[controller]")]
public class SavingsGoalsController : BaseApiController
{
    private readonly ISavingsGoalsService _savingsGoalsService;
    private readonly ILogger<SavingsGoalsController> _logger;

    public SavingsGoalsController(ISavingsGoalsService savingsGoalsService, ILogger<SavingsGoalsController> logger)
    {
        _savingsGoalsService = savingsGoalsService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetSavingsGoals()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _savingsGoalsService.GetSavingsGoalsAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting savings goals for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving savings goals", error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSavingsGoal(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var goal = await _savingsGoalsService.GetSavingsGoalAsync(userId, id);
            return goal == null ? NotFound(new { message = $"Savings goal {id} not found" }) : Ok(goal);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting savings goal {Id}", id); return StatusCode(500, new { message = "Error retrieving savings goal", error = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateSavingsGoal([FromBody] SavingsGoal goal)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (goal.TargetAmount <= 0) return BadRequest(new { message = "Target amount must be greater than zero" });
        if (string.IsNullOrEmpty(goal.Name)) return BadRequest(new { message = "Goal name is required" });
        if (goal.CurrentAmount < 0) return BadRequest(new { message = "Current amount cannot be negative" });

        try
        {
            var created = await _savingsGoalsService.CreateSavingsGoalAsync(userId, goal);
            return CreatedAtAction(nameof(GetSavingsGoal), new { id = created.Id }, created);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error creating savings goal"); return StatusCode(500, new { message = "Error creating savings goal", error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSavingsGoal(Guid id, [FromBody] SavingsGoal goal)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (id != goal.Id) return BadRequest(new { message = "Savings goal ID mismatch" });

        try
        {
            var updated = await _savingsGoalsService.UpdateSavingsGoalAsync(userId, id, goal);
            return updated == null ? NotFound(new { message = $"Savings goal {id} not found" }) : Ok(updated);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error updating savings goal {Id}", id); return StatusCode(500, new { message = "Error updating savings goal", error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSavingsGoal(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var deleted = await _savingsGoalsService.DeleteSavingsGoalAsync(userId, id);
            return !deleted ? NotFound(new { message = $"Savings goal {id} not found" }) : NoContent();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error deleting savings goal {Id}", id); return StatusCode(500, new { message = "Error deleting savings goal", error = ex.Message }); }
    }

    [HttpPost("{id}/deposit")]
    public async Task<IActionResult> AddDeposit(Guid id, [FromBody] DepositRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (request.Amount <= 0) return BadRequest(new { message = "Deposit amount must be greater than zero" });

        try
        {
            var goal = await _savingsGoalsService.AddDepositAsync(userId, id, request.Amount);
            return goal == null ? NotFound(new { message = $"Savings goal {id} not found" }) : Ok(goal);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error adding deposit to savings goal {Id}", id); return StatusCode(500, new { message = "Error adding deposit", error = ex.Message }); }
    }

    [HttpPost("{id}/withdraw")]
    public async Task<IActionResult> Withdraw(Guid id, [FromBody] WithdrawRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (request.Amount <= 0) return BadRequest(new { message = "Withdrawal amount must be greater than zero" });

        try
        {
            try
            {
                var goal = await _savingsGoalsService.WithdrawAsync(userId, id, request.Amount);
                return goal == null ? NotFound(new { message = $"Savings goal {id} not found" }) : Ok(goal);
            }
            catch (InvalidOperationException ex)
            {
                if (ex.Message.Contains("Insufficient funds")) return BadRequest(new { message = "Insufficient funds in savings goal" });
                return BadRequest(new { message = ex.Message });
            }
        }
        catch (Exception ex) { _logger.LogError(ex, "Error withdrawing from savings goal {Id}", id); return StatusCode(500, new { message = "Error withdrawing", error = ex.Message }); }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _savingsGoalsService.GetSummaryAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting savings goals summary for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving summary", error = ex.Message }); }
    }
}

public class DepositRequest { public decimal Amount { get; set; } }
public class WithdrawRequest { public decimal Amount { get; set; } }
