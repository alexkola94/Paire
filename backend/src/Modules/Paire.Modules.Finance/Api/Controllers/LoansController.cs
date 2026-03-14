using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Finance.Api.Controllers;

[Route("api/[controller]")]
public class LoansController : BaseApiController
{
    private readonly ILoansService _loansService;
    private readonly ILogger<LoansController> _logger;

    public LoansController(ILoansService loansService, ILogger<LoansController> logger)
    {
        _loansService = loansService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetLoans()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _loansService.GetLoansAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loans for user: {UserId}", userId); return StatusCode(500, new { message = "Error retrieving loans", error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetLoan(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var loan = await _loansService.GetLoanAsync(userId, id);
            return loan == null ? NotFound(new { message = $"Loan {id} not found" }) : Ok(loan);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loan {Id}", id); return StatusCode(500, new { message = "Error retrieving loan", error = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateLoan([FromBody] Loan loan)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (loan.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero" });
        if (string.IsNullOrEmpty(loan.Description)) return BadRequest(new { message = "Description is required" });
        if (string.IsNullOrEmpty(loan.LentBy) || string.IsNullOrEmpty(loan.BorrowedBy)) return BadRequest(new { message = "LentBy and BorrowedBy are required" });

        try
        {
            var created = await _loansService.CreateLoanAsync(userId, loan);
            return CreatedAtAction(nameof(GetLoan), new { id = created.Id }, created);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error creating loan"); return StatusCode(500, new { message = "Error creating loan", error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLoan(Guid id, [FromBody] Loan loan)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (loan == null) return BadRequest(new { message = "Loan data is required" });
        if (loan.Id == Guid.Empty) loan.Id = id;
        if (id != loan.Id) return BadRequest(new { message = "ID mismatch" });
        if (loan.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero" });

        try
        {
            var updated = await _loansService.UpdateLoanAsync(userId, id, loan);
            return updated == null ? NotFound(new { message = $"Loan {id} not found" }) : Ok(updated);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error updating loan {Id}", id); return StatusCode(500, new { message = "Error updating loan", error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLoan(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var deleted = await _loansService.DeleteLoanAsync(userId, id);
            return !deleted ? NotFound(new { message = $"Loan {id} not found" }) : NoContent();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error deleting loan {Id}", id); return StatusCode(500, new { message = "Error deleting loan", error = ex.Message }); }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetLoanSummary()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _loansService.GetLoanSummaryAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loan summary for user: {UserId}", userId); return StatusCode(500, new { message = "Error retrieving loan summary", error = ex.Message }); }
    }

    [HttpPost("{id}/settle")]
    public async Task<IActionResult> SettleLoan(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var (loan, alreadySettled) = await _loansService.SettleLoanAsync(userId, id);
            if (loan == null) return NotFound(new { message = $"Loan {id} not found" });
            if (alreadySettled) return BadRequest(new { message = "Loan is already settled" });
            return Ok(loan);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error settling loan {Id}", id); return StatusCode(500, new { message = "Error settling loan", error = ex.Message }); }
    }
}
