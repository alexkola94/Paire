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
    [Route("api/[controller]")]
    public class LoanPaymentsController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<LoanPaymentsController> _logger;

        public LoanPaymentsController(AppDbContext dbContext, ILogger<LoanPaymentsController> logger)
        {
            _dbContext = dbContext;
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify loan belongs to user or partner
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {loanId} not found" });
                }

                // Get payments for this loan (from both user and partner)
                var payments = await _dbContext.LoanPayments
                    .Where(p => p.LoanId == loanId && allUserIds.Contains(p.UserId))
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
        /// Gets all loan payments for the authenticated user and their partner (if partnership exists)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllPayments()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var payments = await _dbContext.LoanPayments
                    .Where(p => allUserIds.Contains(p.UserId))
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
        /// Gets a specific loan payment by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetLoanPayment(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var payment = await _dbContext.LoanPayments
                    .FirstOrDefaultAsync(p => p.Id == id && allUserIds.Contains(p.UserId));

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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify the loan exists and belongs to the user or partner
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == payment.LoanId && allUserIds.Contains(l.UserId));

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {payment.LoanId} not found" });
                }

                // Set payment properties
                payment.Id = Guid.NewGuid();
                payment.UserId = userId.ToString();
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var existingPayment = await _dbContext.LoanPayments
                    .FirstOrDefaultAsync(p => p.Id == id && allUserIds.Contains(p.UserId));

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
        public async Task<IActionResult> DeleteLoanPayment(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var payment = await _dbContext.LoanPayments
                    .FirstOrDefaultAsync(p => p.Id == id && allUserIds.Contains(p.UserId));

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
        public async Task<IActionResult> GetLoanPaymentSummary(Guid loanId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == loanId && allUserIds.Contains(l.UserId));

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {loanId} not found" });
                }

                var payments = await _dbContext.LoanPayments
                    .Where(p => p.LoanId == loanId && allUserIds.Contains(p.UserId))
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

        /// <summary>
        /// Helper method to get partner user IDs for the current user
        /// </summary>
        /// <param name="userId">Current user ID</param>
        /// <returns>List of partner user IDs as strings</returns>
        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userId || p.User2Id == userId) &&
                        p.Status == "active");

                if (partnership == null)
                {
                    return new List<string>();
                }

                // Return the partner's ID
                var partnerId = partnership.User1Id == userId
                    ? partnership.User2Id
                    : partnership.User1Id;

                return new List<string> { partnerId.ToString() };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
                return new List<string>();
            }
        }
    }
}

