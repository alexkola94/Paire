using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Finance.Api.Controllers;

[Route("api/[controller]")]
public class LoanPaymentsController : BaseApiController
{
    private readonly ILoanPaymentsService _loanPaymentsService;
    private readonly ILogger<LoanPaymentsController> _logger;

    public LoanPaymentsController(ILoanPaymentsService loanPaymentsService, ILogger<LoanPaymentsController> logger)
    {
        _loanPaymentsService = loanPaymentsService;
        _logger = logger;
    }

    [HttpGet("by-loan/{loanId}")]
    public async Task<IActionResult> GetLoanPayments(Guid loanId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _loanPaymentsService.GetLoanPaymentsAsync(userId, loanId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loan payments for loan {LoanId}", loanId); return StatusCode(500, new { message = "Error retrieving loan payments", error = ex.Message }); }
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPayments()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _loanPaymentsService.GetAllPaymentsAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting all loan payments for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving loan payments", error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetLoanPayment(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var payment = await _loanPaymentsService.GetLoanPaymentAsync(userId, id);
            return payment == null ? NotFound(new { message = $"Loan payment {id} not found" }) : Ok(payment);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loan payment {Id}", id); return StatusCode(500, new { message = "Error retrieving loan payment", error = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateLoanPayment([FromBody] LoanPayment payment)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (payment.Amount <= 0) return BadRequest(new { message = "Payment amount must be greater than zero" });

        try
        {
            var created = await _loanPaymentsService.CreateLoanPaymentAsync(userId, payment);
            return CreatedAtAction(nameof(GetLoanPayment), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("Loan") && ex.Message.Contains("not found")) return NotFound(new { message = ex.Message });
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error creating loan payment"); return StatusCode(500, new { message = "Error creating loan payment", error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLoanPayment(Guid id, [FromBody] LoanPayment payment)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (id != payment.Id) return BadRequest(new { message = "Loan payment ID mismatch" });

        try
        {
            var updated = await _loanPaymentsService.UpdateLoanPaymentAsync(userId, id, payment);
            return updated == null ? NotFound(new { message = $"Loan payment {id} not found" }) : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("Associated loan not found")) return NotFound(new { message = "Associated loan not found" });
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error updating loan payment {Id}", id); return StatusCode(500, new { message = "Error updating loan payment", error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLoanPayment(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var deleted = await _loanPaymentsService.DeleteLoanPaymentAsync(userId, id);
            return !deleted ? NotFound(new { message = $"Loan payment {id} not found" }) : NoContent();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error deleting loan payment {Id}", id); return StatusCode(500, new { message = "Error deleting loan payment", error = ex.Message }); }
    }

    [HttpGet("summary/{loanId}")]
    public async Task<IActionResult> GetLoanPaymentSummary(Guid loanId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var summary = await _loanPaymentsService.GetLoanPaymentSummaryAsync(userId, loanId);
            return summary == null ? NotFound(new { message = $"Loan {loanId} not found" }) : Ok(summary);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loan payment summary for loan {LoanId}", loanId); return StatusCode(500, new { message = "Error retrieving payment summary", error = ex.Message }); }
    }
}
