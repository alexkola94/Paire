using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing loans between couple
    /// All endpoints require authentication and user context
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class LoansController : ControllerBase
    {
        private readonly ISupabaseService _supabaseService;
        private readonly ILogger<LoansController> _logger;

        public LoansController(
            ISupabaseService supabaseService,
            ILogger<LoansController> logger)
        {
            _supabaseService = supabaseService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all loans for the authenticated user
        /// </summary>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>List of loans</returns>
        [HttpGet]
        public async Task<ActionResult<List<Loan>>> GetLoans([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetLoans called without user ID");
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var loans = await _supabaseService.GetLoansAsync(userId);
                return Ok(loans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loans for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loans", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific loan by ID
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Loan details</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Loan>> GetLoan(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var loan = await _supabaseService.GetLoanByIdAsync(id, userId);
                
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
        public async Task<ActionResult<Loan>> CreateLoan(
            [FromBody] Loan loan,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            // Validate loan
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
                // Ensure user ID matches
                loan.UserId = userId;

                var createdLoan = await _supabaseService.CreateLoanAsync(loan);
                
                return CreatedAtAction(
                    nameof(GetLoan),
                    new { id = createdLoan.Id },
                    createdLoan);
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
        public async Task<ActionResult<Loan>> UpdateLoan(
            Guid id,
            [FromBody] Loan loan,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
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
                // Ensure user ID matches
                loan.UserId = userId;

                var updatedLoan = await _supabaseService.UpdateLoanAsync(loan);
                return Ok(updatedLoan);
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
        public async Task<IActionResult> DeleteLoan(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var deleted = await _supabaseService.DeleteLoanAsync(id, userId);
                
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
        public async Task<ActionResult> GetLoanSummary([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var loans = await _supabaseService.GetLoansAsync(userId);

                // Calculate totals by person
                var summary = loans
                    .Where(l => !l.IsSettled)
                    .GroupBy(l => new { l.LentBy, l.BorrowedBy })
                    .Select(g => new
                    {
                        lentBy = g.Key.LentBy,
                        borrowedBy = g.Key.BorrowedBy,
                        totalAmount = g.Sum(l => l.Amount),
                        count = g.Count()
                    })
                    .ToList();

                return Ok(new
                {
                    summary = summary,
                    totalLoans = loans.Count,
                    activeLoans = loans.Count(l => !l.IsSettled),
                    settledLoans = loans.Count(l => l.IsSettled)
                });
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
        public async Task<ActionResult<Loan>> SettleLoan(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var loan = await _supabaseService.GetLoanByIdAsync(id, userId);
                
                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                if (loan.IsSettled)
                {
                    return BadRequest(new { message = "Loan is already settled" });
                }

                loan.IsSettled = true;
                loan.SettledDate = DateTime.UtcNow;

                var updatedLoan = await _supabaseService.UpdateLoanAsync(loan);
                return Ok(updatedLoan);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling loan {Id}", id);
                return StatusCode(500, new { message = "Error settling loan", error = ex.Message });
            }
        }
    }
}

