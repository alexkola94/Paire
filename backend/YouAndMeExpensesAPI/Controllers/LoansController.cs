using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing loans between couple
    /// All endpoints require authentication and user context
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class LoansController : BaseApiController
    {
        private readonly ILoansService _loansService;
        private readonly ILogger<LoansController> _logger;

        public LoansController(
            ILoansService loansService,
            ILogger<LoansController> logger)
        {
            _loansService = loansService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all loans for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each loan
        /// </summary>
        /// <returns>List of loans with user profile data</returns>
        [HttpGet]
        public async Task<IActionResult> GetLoans()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var loans = await _loansService.GetLoansAsync(userId);
                return Ok(loans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loans for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loans", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific loan by ID (must belong to user or partner)
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Loan details</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetLoan(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var loan = await _loansService.GetLoanAsync(userId, id);

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                return Ok(loan);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan {Id}", id);
                return StatusCode(500, new { message = "Error retrieving loan", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new loan
        /// </summary>
        /// <param name="loan">Loan data</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Created loan</returns>
        [HttpPost]
        public async Task<IActionResult> CreateLoan([FromBody] Loan loan)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Validate loan (simple input checks stay in the controller)
            if (loan.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            if (string.IsNullOrEmpty(loan.Description))
            {
                return BadRequest(new { message = "Description is required" });
            }

            if (string.IsNullOrEmpty(loan.LentBy) || string.IsNullOrEmpty(loan.BorrowedBy))
            {
                return BadRequest(new { message = "LentBy and BorrowedBy are required" });
            }

            try
            {
                var created = await _loansService.CreateLoanAsync(userId, loan);

                return CreatedAtAction(
                    nameof(GetLoan),
                    new { id = created.Id },
                    created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating loan");
                return StatusCode(500, new { message = "Error creating loan", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing loan
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="loan">Updated loan data</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Updated loan</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLoan(
            Guid id,
            [FromBody] Loan loan)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Set the loan ID from route parameter if not provided in body
            if (loan == null)
            {
                return BadRequest(new { message = "Loan data is required" });
            }

            if (loan.Id == Guid.Empty)
            {
                loan.Id = id;
            }

            if (id != loan.Id)
            {
                return BadRequest(new { message = "ID mismatch" });
            }

            // Validate loan
            if (loan.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            try
            {
                var updated = await _loansService.UpdateLoanAsync(userId, id, loan);

                if (updated == null)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating loan {Id}", id);
                return StatusCode(500, new { message = "Error updating loan", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a loan
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Success status</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLoan(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _loansService.DeleteLoanAsync(userId, id);

                if (!deleted)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting loan {Id}", id);
                return StatusCode(500, new { message = "Error deleting loan", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets summary of loans (total owed by each person)
        /// </summary>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Loan summary</returns>
        [HttpGet("summary")]
        public async Task<IActionResult> GetLoanSummary()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var summary = await _loansService.GetLoanSummaryAsync(userId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan summary for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loan summary", error = ex.Message });
            }
        }

        /// <summary>
        /// Marks a loan as settled
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Updated loan</returns>
        [HttpPost("{id}/settle")]
        public async Task<IActionResult> SettleLoan(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var (loan, alreadySettled) = await _loansService.SettleLoanAsync(userId, id);

                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                if (alreadySettled)
                {
                    return BadRequest(new { message = "Loan is already settled" });
                }

                return Ok(loan);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling loan {Id}", id);
                return StatusCode(500, new { message = "Error settling loan", error = ex.Message });
            }
        }
    }
}

