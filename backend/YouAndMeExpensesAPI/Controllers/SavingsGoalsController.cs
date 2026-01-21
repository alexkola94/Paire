using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing savings goals
    /// Helps users track financial goals and savings progress
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class SavingsGoalsController : BaseApiController
    {
        private readonly ISavingsGoalsService _savingsGoalsService;
        private readonly ILogger<SavingsGoalsController> _logger;

        public SavingsGoalsController(
            ISavingsGoalsService savingsGoalsService,
            ILogger<SavingsGoalsController> logger)
        {
            _savingsGoalsService = savingsGoalsService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all savings goals for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each goal
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSavingsGoals()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var goals = await _savingsGoalsService.GetSavingsGoalsAsync(userId);
                return Ok(goals);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting savings goals for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving savings goals", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific savings goal by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSavingsGoal(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var goal = await _savingsGoalsService.GetSavingsGoalAsync(userId, id);

                if (goal == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                return Ok(goal);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting savings goal {Id}", id);
                return StatusCode(500, new { message = "Error retrieving savings goal", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new savings goal
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateSavingsGoal([FromBody] SavingsGoal goal)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Validate goal
            if (goal.TargetAmount <= 0)
            {
                return BadRequest(new { message = "Target amount must be greater than zero" });
            }

            if (string.IsNullOrEmpty(goal.Name))
            {
                return BadRequest(new { message = "Goal name is required" });
            }

            // Validate current amount is not negative
            if (goal.CurrentAmount < 0)
            {
                return BadRequest(new { message = "Current amount cannot be negative" });
            }

            try
            {
                var created = await _savingsGoalsService.CreateSavingsGoalAsync(userId, goal);

                return CreatedAtAction(
                    nameof(GetSavingsGoal),
                    new { id = created.Id },
                    created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating savings goal");
                return StatusCode(500, new { message = "Error creating savings goal", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing savings goal
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSavingsGoal(
            Guid id,
            [FromBody] SavingsGoal goal)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (id != goal.Id)
            {
                return BadRequest(new { message = "Savings goal ID mismatch" });
            }

            try
            {
                var updated = await _savingsGoalsService.UpdateSavingsGoalAsync(userId, id, goal);

                if (updated == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating savings goal {Id}", id);
                return StatusCode(500, new { message = "Error updating savings goal", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a savings goal (must belong to user or partner)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSavingsGoal(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _savingsGoalsService.DeleteSavingsGoalAsync(userId, id);

                if (!deleted)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting savings goal {Id}", id);
                return StatusCode(500, new { message = "Error deleting savings goal", error = ex.Message });
            }
        }

        /// <summary>
        /// Add money to a savings goal (deposits)
        /// </summary>
        [HttpPost("{id}/deposit")]
        public async Task<IActionResult> AddDeposit(
            Guid id,
            [FromBody] DepositRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Deposit amount must be greater than zero" });
            }

            try
            {
                var goal = await _savingsGoalsService.AddDepositAsync(userId, id, request.Amount);

                if (goal == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                return Ok(goal);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding deposit to savings goal {Id}", id);
                return StatusCode(500, new { message = "Error adding deposit", error = ex.Message });
            }
        }

        /// <summary>
        /// Withdraw money from a savings goal
        /// </summary>
        [HttpPost("{id}/withdraw")]
        public async Task<IActionResult> Withdraw(
            Guid id,
            [FromBody] WithdrawRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Withdrawal amount must be greater than zero" });
            }

            try
            {
                try
                {
                    var goal = await _savingsGoalsService.WithdrawAsync(userId, id, request.Amount);

                    if (goal == null)
                    {
                        return NotFound(new { message = $"Savings goal {id} not found" });
                    }

                    return Ok(goal);
                }
                catch (InvalidOperationException ex)
                {
                    // Preserve original insufficient funds behavior
                    if (ex.Message.Contains("Insufficient funds"))
                    {
                        return BadRequest(new { message = "Insufficient funds in savings goal" });
                    }

                    return BadRequest(new { message = ex.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error withdrawing from savings goal {Id}", id);
                return StatusCode(500, new { message = "Error withdrawing", error = ex.Message });
            }
        }

        /// <summary>
        /// Get savings goals summary statistics
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var summary = await _savingsGoalsService.GetSummaryAsync(userId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting savings goals summary for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving summary", error = ex.Message });
            }
        }
    }

    /// <summary>
    /// Request model for deposits
    /// </summary>
    public class DepositRequest
    {
        public decimal Amount { get; set; }
    }

    /// <summary>
    /// Request model for withdrawals
    /// </summary>
    public class WithdrawRequest
    {
        public decimal Amount { get; set; }
    }
}

