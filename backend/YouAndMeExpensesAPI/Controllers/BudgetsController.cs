using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing budgets.
    /// Business logic is delegated to <see cref="IBudgetsAppService"/>.
    /// </summary>
    [Route("api/[controller]")]
    public class BudgetsController : BaseApiController
    {
        private readonly IBudgetsAppService _budgetsAppService;
        private readonly ILogger<BudgetsController> _logger;

        public BudgetsController(
            IBudgetsAppService budgetsAppService,
            ILogger<BudgetsController> logger)
        {
            _budgetsAppService = budgetsAppService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all budgets for the authenticated user and their partner (if partnership exists).
        /// Includes user profile information to show who created each budget.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBudgets()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var enrichedBudgets = await _budgetsAppService.GetBudgetsWithProfilesAsync(userId);
                return Ok(enrichedBudgets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting budgets for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving budgets", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific budget by ID (must belong to user or partner).
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBudget(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var budget = await _budgetsAppService.GetBudgetAsync(userId, id);
                if (budget == null)
                {
                    return NotFound(new { message = $"Budget {id} not found" });
                }

                return Ok(budget);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting budget {Id}", id);
                return StatusCode(500, new { message = "Error retrieving budget", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new budget.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateBudget([FromBody] Budget budget)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (budget.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            if (string.IsNullOrEmpty(budget.Category))
            {
                return BadRequest(new { message = "Category is required" });
            }

            try
            {
                var created = await _budgetsAppService.CreateBudgetAsync(userId, budget);

                return CreatedAtAction(
                    nameof(GetBudget),
                    new { id = created.Id },
                    created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating budget");
                return StatusCode(500, new { message = "Error creating budget", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing budget.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBudget(
            Guid id,
            [FromBody] Budget budget)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (id != budget.Id)
            {
                return BadRequest(new { message = "Budget ID mismatch" });
            }

            try
            {
                var updated = await _budgetsAppService.UpdateBudgetAsync(userId, id, budget);
                if (updated == null)
                {
                    return NotFound(new { message = $"Budget {id} not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating budget {Id}", id);
                return StatusCode(500, new { message = "Error updating budget", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a budget.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBudget(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _budgetsAppService.DeleteBudgetAsync(userId, id);
                if (!deleted)
                {
                    return NotFound(new { message = $"Budget {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting budget {Id}", id);
                return StatusCode(500, new { message = "Error deleting budget", error = ex.Message });
            }
        }
    }
}

