using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing loan payment history
    /// Tracks individual payments made towards loans
    /// Uses Entity Framework Core for data access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class LoanPaymentsController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<LoanPaymentsController> _logger;

        public LoanPaymentsController(AppDbContext dbContext, ILogger<LoanPaymentsController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Gets all loan payments for a specific loan
        /// </summary>
        [HttpGet("by-loan/{loanId}")]
        public async Task<ActionResult<List<LoanPayment>>> GetLoanPayments(
            Guid loanId,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var payments = await _dbContext.LoanPayments
                    .Where(p => p.LoanId == loanId && p.UserId == userId)
                    .OrderByDescending(p => p.PaymentDate)
                    .ToListAsync();

                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan payments for loan {LoanId}", loanId);
                return StatusCode(500, new { message = "Error retrieving loan payments", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets all loan payments for the authenticated user
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<LoanPayment>>> GetAllPayments([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var payments = await _dbContext.LoanPayments
                    .Where(p => p.UserId == userId)
                    .OrderByDescending(p => p.PaymentDate)
                    .ToListAsync();

                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all loan payments for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loan payments", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific loan payment by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<LoanPayment>> GetLoanPayment(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var payment = await _dbContext.LoanPayments
                    .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

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
        public async Task<ActionResult<LoanPayment>> CreateLoanPayment(
            [FromBody] LoanPayment payment,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            // Validate payment
            if (payment.Amount <= 0)
            {
                return BadRequest(new { message = "Payment amount must be greater than zero" });
            }

            try
            {
                // Verify the loan exists and belongs to the user
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == payment.LoanId && l.UserId == userId);

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {payment.LoanId} not found" });
                }

                // Set payment properties
                payment.Id = Guid.NewGuid();
                payment.UserId = userId;
                payment.CreatedAt = DateTime.UtcNow;

                // Ensure PaymentDate is UTC
                if (payment.PaymentDate.Kind == DateTimeKind.Unspecified)
                {
                    payment.PaymentDate = DateTime.SpecifyKind(payment.PaymentDate, DateTimeKind.Utc);
                }
                else if (payment.PaymentDate.Kind == DateTimeKind.Local)
                {
                    payment.PaymentDate = payment.PaymentDate.ToUniversalTime();
                }

                // Update loan totals
                loan.TotalPaid += payment.Amount;
                loan.RemainingAmount = loan.Amount - loan.TotalPaid;

                // If remaining amount is zero or negative, mark as settled
                if (loan.RemainingAmount <= 0)
                {
                    loan.IsSettled = true;
                    loan.SettledDate = DateTime.UtcNow;
                    loan.RemainingAmount = 0; // Ensure it doesn't go negative
                }

                loan.UpdatedAt = DateTime.UtcNow;

                _dbContext.LoanPayments.Add(payment);
                await _dbContext.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetLoanPayment),
                    new { id = payment.Id },
                    payment);
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
        public async Task<ActionResult<LoanPayment>> UpdateLoanPayment(
            Guid id,
            [FromBody] LoanPayment payment,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            if (id != payment.Id)
            {
                return BadRequest(new { message = "Loan payment ID mismatch" });
            }

            try
            {
                var existingPayment = await _dbContext.LoanPayments
                    .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

                if (existingPayment == null)
                {
                    return NotFound(new { message = $"Loan payment {id} not found" });
                }

                // Get the loan to update totals
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == existingPayment.LoanId);

                if (loan == null)
                {
                    return NotFound(new { message = "Associated loan not found" });
                }

                // Calculate difference to adjust loan totals
                var amountDifference = payment.Amount - existingPayment.Amount;
                loan.TotalPaid += amountDifference;
                loan.RemainingAmount = loan.Amount - loan.TotalPaid;

                // Update settled status
                if (loan.RemainingAmount <= 0)
                {
                    loan.IsSettled = true;
                    loan.SettledDate = loan.SettledDate ?? DateTime.UtcNow;
                    loan.RemainingAmount = 0;
                }
                else
                {
                    loan.IsSettled = false;
                    loan.SettledDate = null;
                }

                // Update payment properties
                existingPayment.Amount = payment.Amount;
                existingPayment.PrincipalAmount = payment.PrincipalAmount;
                existingPayment.InterestAmount = payment.InterestAmount;
                existingPayment.Notes = payment.Notes;

                // Ensure PaymentDate is UTC
                if (payment.PaymentDate.Kind == DateTimeKind.Unspecified)
                {
                    existingPayment.PaymentDate = DateTime.SpecifyKind(payment.PaymentDate, DateTimeKind.Utc);
                }
                else if (payment.PaymentDate.Kind == DateTimeKind.Local)
                {
                    existingPayment.PaymentDate = payment.PaymentDate.ToUniversalTime();
                }
                else
                {
                    existingPayment.PaymentDate = payment.PaymentDate;
                }

                loan.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                return Ok(existingPayment);
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
        public async Task<ActionResult> DeleteLoanPayment(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var payment = await _dbContext.LoanPayments
                    .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

                if (payment == null)
                {
                    return NotFound(new { message = $"Loan payment {id} not found" });
                }

                // Get the loan to update totals
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == payment.LoanId);

                if (loan != null)
                {
                    // Subtract payment from loan totals
                    loan.TotalPaid -= payment.Amount;
                    loan.RemainingAmount = loan.Amount - loan.TotalPaid;

                    // Update settled status
                    if (loan.RemainingAmount > 0)
                    {
                        loan.IsSettled = false;
                        loan.SettledDate = null;
                    }

                    loan.UpdatedAt = DateTime.UtcNow;
                }

                _dbContext.LoanPayments.Remove(payment);
                await _dbContext.SaveChangesAsync();

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
        public async Task<ActionResult> GetLoanPaymentSummary(
            Guid loanId,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == loanId && l.UserId == userId);

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {loanId} not found" });
                }

                var payments = await _dbContext.LoanPayments
                    .Where(p => p.LoanId == loanId && p.UserId == userId)
                    .ToListAsync();

                var summary = new
                {
                    loanId = loanId,
                    loanAmount = loan.Amount,
                    totalPaid = loan.TotalPaid,
                    remainingAmount = loan.RemainingAmount,
                    isSettled = loan.IsSettled,
                    paymentCount = payments.Count,
                    totalPrincipal = payments.Sum(p => p.PrincipalAmount),
                    totalInterest = payments.Sum(p => p.InterestAmount),
                    averagePayment = payments.Count > 0 ? payments.Average(p => p.Amount) : 0,
                    lastPaymentDate = payments.OrderByDescending(p => p.PaymentDate).FirstOrDefault()?.PaymentDate,
                    nextPaymentDate = loan.NextPaymentDate,
                    payments = payments.OrderByDescending(p => p.PaymentDate).ToList()
                };

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

