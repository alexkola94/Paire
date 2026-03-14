using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Finance.Api.Controllers;

[Route("api/[controller]")]
public class RecurringBillsController : BaseApiController
{
    private readonly IRecurringBillsService _recurringBillsService;
    private readonly ILogger<RecurringBillsController> _logger;

    public RecurringBillsController(IRecurringBillsService recurringBillsService, ILogger<RecurringBillsController> logger)
    {
        _recurringBillsService = recurringBillsService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecurringBills()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _recurringBillsService.GetRecurringBillsAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting recurring bills for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving recurring bills", error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRecurringBill(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var bill = await _recurringBillsService.GetRecurringBillAsync(userId, id);
            return bill == null ? NotFound(new { message = $"Recurring bill {id} not found" }) : Ok(bill);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting recurring bill {Id}", id); return StatusCode(500, new { message = "Error retrieving recurring bill", error = ex.Message }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreateRecurringBill([FromBody] RecurringBill bill)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (bill.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero" });
        if (string.IsNullOrEmpty(bill.Name)) return BadRequest(new { message = "Bill name is required" });
        if (bill.DueDay < 1 || bill.DueDay > 31) return BadRequest(new { message = "Due day must be between 1 and 31" });

        try
        {
            var created = await _recurringBillsService.CreateRecurringBillAsync(userId, bill);
            return CreatedAtAction(nameof(GetRecurringBill), new { id = created.Id }, created);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error creating recurring bill"); return StatusCode(500, new { message = "Error creating recurring bill", error = ex.Message }); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRecurringBill(Guid id, [FromBody] RecurringBill bill)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (id != bill.Id) return BadRequest(new { message = "Recurring bill ID mismatch" });

        try
        {
            var updated = await _recurringBillsService.UpdateRecurringBillAsync(userId, id, bill);
            return updated == null ? NotFound(new { message = $"Recurring bill {id} not found" }) : Ok(updated);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error updating recurring bill {Id}", id); return StatusCode(500, new { message = "Error updating recurring bill", error = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRecurringBill(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var deleted = await _recurringBillsService.DeleteRecurringBillAsync(userId, id);
            return !deleted ? NotFound(new { message = $"Recurring bill {id} not found" }) : NoContent();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error deleting recurring bill {Id}", id); return StatusCode(500, new { message = "Error deleting recurring bill", error = ex.Message }); }
    }

    [HttpPost("{id}/mark-paid")]
    public async Task<IActionResult> MarkBillPaid(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var bill = await _recurringBillsService.MarkBillPaidAsync(userId, id);
            return bill == null ? NotFound(new { message = $"Recurring bill {id} not found" }) : Ok(bill);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error marking bill {Id} as paid", id); return StatusCode(500, new { message = "Error marking bill as paid", error = ex.Message }); }
    }

    [HttpPost("{id}/unmark-paid")]
    public async Task<IActionResult> UnmarkBillPaid(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var bill = await _recurringBillsService.UnmarkBillPaidAsync(userId, id);
            return bill == null ? NotFound(new { message = $"Recurring bill {id} not found" }) : Ok(bill);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error unmarking bill {Id}", id); return StatusCode(500, new { message = "Error unmarking bill", error = ex.Message }); }
    }

    [HttpGet("upcoming")]
    public async Task<IActionResult> GetUpcomingBills([FromQuery] int days = 30)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _recurringBillsService.GetUpcomingBillsAsync(userId, days)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting upcoming bills for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving upcoming bills", error = ex.Message }); }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _recurringBillsService.GetSummaryAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting recurring bills summary for user {UserId}", userId); return StatusCode(500, new { message = "Error retrieving summary", error = ex.Message }); }
    }

    [HttpPost("{id}/attachments")]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (file == null || file.Length == 0) return BadRequest(new { message = "No file uploaded" });

        try
        {
            var result = await _recurringBillsService.UploadAttachmentAsync(userId, id, file);
            return result == null ? NotFound(new { message = $"Recurring bill {id} not found" }) : Ok(result);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error uploading attachment for bill {Id}", id); return StatusCode(500, new { message = "Error uploading attachment", error = ex.Message }); }
    }

    [HttpDelete("{id}/attachments/{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(Guid id, Guid attachmentId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var deleted = await _recurringBillsService.DeleteAttachmentAsync(userId, id, attachmentId);
            return !deleted ? NotFound(new { message = "Attachment not found" }) : NoContent();
        }
        catch (Exception ex) { _logger.LogError(ex, "Error deleting attachment {AttachmentId}", attachmentId); return StatusCode(500, new { message = "Error deleting attachment", error = ex.Message }); }
    }
}
