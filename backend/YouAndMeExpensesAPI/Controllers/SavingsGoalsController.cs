using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing savings goals
    /// Helps users track financial goals and savings progress
    /// Uses Entity Framework Core for data access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SavingsGoalsController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<SavingsGoalsController> _logger;

        public SavingsGoalsController(AppDbContext dbContext, ILogger<SavingsGoalsController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Gets all savings goals for the authenticated user
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<SavingsGoal>>> GetSavingsGoals([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var goals = await _dbContext.SavingsGoals
                    .Where(g => g.UserId == userId)
                    .OrderByDescending(g => g.Priority == "high")
                    .ThenByDescending(g => g.Priority == "medium")
                    .ThenBy(g => g.TargetDate)
                    .ToListAsync();

                return Ok(goals);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting savings goals for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving savings goals", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific savings goal by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SavingsGoal>> GetSavingsGoal(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

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
        public async Task<ActionResult<SavingsGoal>> CreateSavingsGoal(
            [FromBody] SavingsGoal goal,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

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
                // Set goal properties
                goal.Id = Guid.NewGuid();
                goal.UserId = userId;
                goal.CreatedAt = DateTime.UtcNow;
                goal.UpdatedAt = DateTime.UtcNow;
                goal.IsAchieved = false; // New goals are not achieved

                // Ensure TargetDate is UTC if provided
                if (goal.TargetDate.HasValue)
                {
                    if (goal.TargetDate.Value.Kind == DateTimeKind.Unspecified)
                    {
                        goal.TargetDate = DateTime.SpecifyKind(goal.TargetDate.Value, DateTimeKind.Utc);
                    }
                    else if (goal.TargetDate.Value.Kind == DateTimeKind.Local)
                    {
                        goal.TargetDate = goal.TargetDate.Value.ToUniversalTime();
                    }
                }

                // Set default priority if not provided
                if (string.IsNullOrEmpty(goal.Priority))
                {
                    goal.Priority = "medium";
                }

                _dbContext.SavingsGoals.Add(goal);
                await _dbContext.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetSavingsGoal),
                    new { id = goal.Id },
                    goal);
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
        public async Task<ActionResult<SavingsGoal>> UpdateSavingsGoal(
            Guid id,
            [FromBody] SavingsGoal goal,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            if (id != goal.Id)
            {
                return BadRequest(new { message = "Savings goal ID mismatch" });
            }

            try
            {
                var existingGoal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

                if (existingGoal == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                // Update properties
                existingGoal.Name = goal.Name;
                existingGoal.TargetAmount = goal.TargetAmount;
                existingGoal.CurrentAmount = goal.CurrentAmount;
                existingGoal.Priority = goal.Priority;
                existingGoal.Category = goal.Category;
                existingGoal.Icon = goal.Icon;
                existingGoal.Color = goal.Color;
                existingGoal.Notes = goal.Notes;
                existingGoal.UpdatedAt = DateTime.UtcNow;

                // Check if goal is achieved (current amount >= target amount)
                if (existingGoal.CurrentAmount >= existingGoal.TargetAmount)
                {
                    existingGoal.IsAchieved = true;
                }
                else
                {
                    existingGoal.IsAchieved = goal.IsAchieved; // Allow manual override
                }

                // Ensure TargetDate is UTC if provided
                if (goal.TargetDate.HasValue)
                {
                    if (goal.TargetDate.Value.Kind == DateTimeKind.Unspecified)
                    {
                        existingGoal.TargetDate = DateTime.SpecifyKind(goal.TargetDate.Value, DateTimeKind.Utc);
                    }
                    else if (goal.TargetDate.Value.Kind == DateTimeKind.Local)
                    {
                        existingGoal.TargetDate = goal.TargetDate.Value.ToUniversalTime();
                    }
                    else
                    {
                        existingGoal.TargetDate = goal.TargetDate;
                    }
                }
                else
                {
                    existingGoal.TargetDate = null;
                }

                await _dbContext.SaveChangesAsync();

                return Ok(existingGoal);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating savings goal {Id}", id);
                return StatusCode(500, new { message = "Error updating savings goal", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a savings goal
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteSavingsGoal(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

                if (goal == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                _dbContext.SavingsGoals.Remove(goal);
                await _dbContext.SaveChangesAsync();

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
        public async Task<ActionResult<SavingsGoal>> AddDeposit(
            Guid id,
            [FromBody] DepositRequest request,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Deposit amount must be greater than zero" });
            }

            try
            {
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

                if (goal == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                // Add deposit to current amount
                goal.CurrentAmount += request.Amount;
                goal.UpdatedAt = DateTime.UtcNow;

                // Check if goal is now achieved
                if (goal.CurrentAmount >= goal.TargetAmount)
                {
                    goal.IsAchieved = true;
                }

                await _dbContext.SaveChangesAsync();

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
        public async Task<ActionResult<SavingsGoal>> Withdraw(
            Guid id,
            [FromBody] WithdrawRequest request,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Withdrawal amount must be greater than zero" });
            }

            try
            {
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);

                if (goal == null)
                {
                    return NotFound(new { message = $"Savings goal {id} not found" });
                }

                // Check if withdrawal would make current amount negative
                if (goal.CurrentAmount - request.Amount < 0)
                {
                    return BadRequest(new { message = "Insufficient funds in savings goal" });
                }

                // Subtract withdrawal from current amount
                goal.CurrentAmount -= request.Amount;
                goal.UpdatedAt = DateTime.UtcNow;

                // Update achieved status
                if (goal.CurrentAmount < goal.TargetAmount)
                {
                    goal.IsAchieved = false;
                }

                await _dbContext.SaveChangesAsync();

                return Ok(goal);
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
        public async Task<ActionResult> GetSummary([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var goals = await _dbContext.SavingsGoals
                    .Where(g => g.UserId == userId)
                    .ToListAsync();

                var summary = new
                {
                    totalGoals = goals.Count,
                    activeGoals = goals.Count(g => !g.IsAchieved),
                    achievedGoals = goals.Count(g => g.IsAchieved),
                    totalTargetAmount = goals.Sum(g => g.TargetAmount),
                    totalCurrentAmount = goals.Sum(g => g.CurrentAmount),
                    totalRemaining = goals.Where(g => !g.IsAchieved).Sum(g => g.TargetAmount - g.CurrentAmount),
                    overallProgress = goals.Sum(g => g.TargetAmount) > 0 
                        ? Math.Round((goals.Sum(g => g.CurrentAmount) / goals.Sum(g => g.TargetAmount)) * 100, 2)
                        : 0,
                    highPriorityGoals = goals.Count(g => g.Priority == "high" && !g.IsAchieved),
                    mediumPriorityGoals = goals.Count(g => g.Priority == "medium" && !g.IsAchieved),
                    lowPriorityGoals = goals.Count(g => g.Priority == "low" && !g.IsAchieved)
                };

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

