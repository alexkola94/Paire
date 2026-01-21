using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing loan payment history
    /// Tracks individual payments made towards loans
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class LoanPaymentsController : BaseApiController
    {
        private readonly ILoanPaymentsService _loanPaymentsService;
        private readonly ILogger<LoanPaymentsController> _logger;

        public LoanPaymentsController(
            ILoanPaymentsService loanPaymentsService,
            ILogger<LoanPaymentsController> logger)
        {
            _loanPaymentsService = loanPaymentsService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all loan payments for a specific loan (loan must belong to user or partner)
        /// </summary>
        [HttpGet("by-loan/{loanId}")]
        public async Task<IActionResult> GetLoanPayments(Guid loanId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var payments = await _loanPaymentsService.GetLoanPaymentsAsync(userId, loanId);

                if (payments.Count == 0)
                {
                    // Preserve original behavior: 404 when loan not found.
                    return NotFound(new { message = $"Loan {loanId} not found" });
                }

                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan payments for loan {LoanId}", loanId);
                return StatusCode(500, new { message = "Error retrieving loan payments", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets all loan payments for the authenticated user and their partner (if partnership exists)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllPayments()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var payments = await _loanPaymentsService.GetAllPaymentsAsync(userId);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all loan payments for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loan payments", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific loan payment by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetLoanPayment(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var payment = await _loanPaymentsService.GetLoanPaymentAsync(userId, id);

                if (payment == null)
                {
                    return NotFound(new { message = $"Loan payment {id} not found" });
                }

                return Ok(payment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan payment {Id}", id);
                return StatusCode(500, new { message = "Error retrieving loan payment", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new loan payment and updates the loan
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateLoanPayment([FromBody] LoanPayment payment)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Validate payment
            if (payment.Amount <= 0)
            {
                return BadRequest(new { message = "Payment amount must be greater than zero" });
            }

            try
            {
                var created = await _loanPaymentsService.CreateLoanPaymentAsync(userId, payment);

                return CreatedAtAction(
                    nameof(GetLoanPayment),
                    new { id = created.Id },
                    created);
            }
            catch (InvalidOperationException ex)
            {
                // Preserve original semantics for missing loan
                if (ex.Message.Contains("Loan") && ex.Message.Contains("not found"))
                {
                    return NotFound(new { message = ex.Message });
                }

                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating loan payment");
                return StatusCode(500, new { message = "Error creating loan payment", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing loan payment
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLoanPayment(
            Guid id,
            [FromBody] LoanPayment payment)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (id != payment.Id)
            {
                return BadRequest(new { message = "Loan payment ID mismatch" });
            }

            try
            {
                var updated = await _loanPaymentsService.UpdateLoanPaymentAsync(userId, id, payment);

                if (updated == null)
                {
                    return NotFound(new { message = $"Loan payment {id} not found" });
                }

                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                if (ex.Message.Contains("Associated loan not found"))
                {
                    return NotFound(new { message = "Associated loan not found" });
                }

                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating loan payment {Id}", id);
                return StatusCode(500, new { message = "Error updating loan payment", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a loan payment and updates the loan
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLoanPayment(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _loanPaymentsService.DeleteLoanPaymentAsync(userId, id);

                if (!deleted)
                {
                    return NotFound(new { message = $"Loan payment {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting loan payment {Id}", id);
                return StatusCode(500, new { message = "Error deleting loan payment", error = ex.Message });
            }
        }

        /// <summary>
        /// Get payment summary for a specific loan
        /// </summary>
        [HttpGet("summary/{loanId}")]
        public async Task<IActionResult> GetLoanPaymentSummary(Guid loanId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var summary = await _loanPaymentsService.GetLoanPaymentSummaryAsync(userId, loanId);

                if (summary == null)
                {
                    return NotFound(new { message = $"Loan {loanId} not found" });
                }

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan payment summary for loan {LoanId}", loanId);
                return StatusCode(500, new { message = "Error retrieving payment summary", error = ex.Message });
            }
        }
    }
}

