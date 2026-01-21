using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing recurring bills and subscriptions
    /// Helps users track and manage regular payments
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class RecurringBillsController : BaseApiController
    {
        private readonly IRecurringBillsService _recurringBillsService;
        private readonly ILogger<RecurringBillsController> _logger;

        public RecurringBillsController(
            IRecurringBillsService recurringBillsService,
            ILogger<RecurringBillsController> logger)
        {
            _recurringBillsService = recurringBillsService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all recurring bills for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each bill
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRecurringBills()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var bills = await _recurringBillsService.GetRecurringBillsAsync(userId);
                return Ok(bills);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recurring bills for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving recurring bills", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific recurring bill by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRecurringBill(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var bill = await _recurringBillsService.GetRecurringBillAsync(userId, id);

                if (bill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return Ok(bill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recurring bill {Id}", id);
                return StatusCode(500, new { message = "Error retrieving recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new recurring bill
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateRecurringBill([FromBody] RecurringBill bill)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Validate bill
            if (bill.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            if (string.IsNullOrEmpty(bill.Name))
            {
                return BadRequest(new { message = "Bill name is required" });
            }

            if (bill.DueDay < 1 || bill.DueDay > 31)
            {
                return BadRequest(new { message = "Due day must be between 1 and 31" });
            }

            try
            {
                var created = await _recurringBillsService.CreateRecurringBillAsync(userId, bill);

                return CreatedAtAction(
                    nameof(GetRecurringBill),
                    new { id = created.Id },
                    created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating recurring bill");
                return StatusCode(500, new { message = "Error creating recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing recurring bill
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRecurringBill(
            Guid id,
            [FromBody] RecurringBill bill)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (id != bill.Id)
            {
                return BadRequest(new { message = "Recurring bill ID mismatch" });
            }

            try
            {
                var updated = await _recurringBillsService.UpdateRecurringBillAsync(userId, id, bill);

                if (updated == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating recurring bill {Id}", id);
                return StatusCode(500, new { message = "Error updating recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a recurring bill (must belong to user or partner)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRecurringBill(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _recurringBillsService.DeleteRecurringBillAsync(userId, id);

                if (!deleted)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting recurring bill {Id}", id);
                return StatusCode(500, new { message = "Error deleting recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Mark a bill as paid for the current period
        /// </summary>
        /// <summary>
        /// Mark a bill as paid for the current period and create an expense transaction
        /// </summary>
        [HttpPost("{id}/mark-paid")]
        public async Task<IActionResult> MarkBillPaid(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var bill = await _recurringBillsService.MarkBillPaidAsync(userId, id);

                if (bill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return Ok(bill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking bill {Id} as paid", id);
                return StatusCode(500, new { message = "Error marking bill as paid", error = ex.Message });
            }
        }

        /// <summary>
        /// Unmark a bill as paid (Revert) and remove the associated expense transaction
        /// </summary>
        [HttpPost("{id}/unmark-paid")]
        public async Task<IActionResult> UnmarkBillPaid(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var bill = await _recurringBillsService.UnmarkBillPaidAsync(userId, id);

                if (bill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return Ok(bill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unmarking bill {Id}", id);
                return StatusCode(500, new { message = "Error unmarking bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Get upcoming bills (due within specified days)
        /// </summary>
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcomingBills([FromQuery] int days = 30)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var upcomingBills = await _recurringBillsService.GetUpcomingBillsAsync(userId, days);
                return Ok(upcomingBills);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming bills for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving upcoming bills", error = ex.Message });
            }
        }

        /// <summary>
        /// Get recurring bills summary statistics
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var summary = await _recurringBillsService.GetSummaryAsync(userId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recurring bills summary for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving summary", error = ex.Message });
            }
        }
        /// <summary>
        /// Upload an attachment for a recurring bill
        /// </summary>
        [HttpPost("{id}/attachments")]
        public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            try
            {
                var result = await _recurringBillsService.UploadAttachmentAsync(userId, id, file);

                if (result == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading attachment for bill {Id}", id);
                return StatusCode(500, new { message = "Error uploading attachment", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete an attachment from a recurring bill
        /// </summary>
        [HttpDelete("{id}/attachments/{attachmentId}")]
        public async Task<IActionResult> DeleteAttachment(Guid id, Guid attachmentId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _recurringBillsService.DeleteAttachmentAsync(userId, id, attachmentId);

                if (!deleted)
                {
                    return NotFound(new { message = "Attachment not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting attachment {AttachmentId}", attachmentId);
                return StatusCode(500, new { message = "Error deleting attachment", error = ex.Message });
            }
        }
    }
}

