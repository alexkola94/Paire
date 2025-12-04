using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing budgets
    /// Uses Entity Framework Core for data access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class BudgetsController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<BudgetsController> _logger;

        public BudgetsController(AppDbContext dbContext, ILogger<BudgetsController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Gets all budgets for the authenticated user
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<Budget>>> GetBudgets([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var budgets = await _dbContext.Budgets
                    .Where(b => b.UserId == userId)
                    .OrderByDescending(b => b.CreatedAt)
                    .ToListAsync();

                return Ok(budgets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting budgets for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving budgets", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific budget by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Budget>> GetBudget(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var budget = await _dbContext.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

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
        /// Creates a new budget
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Budget>> CreateBudget(
            [FromBody] Budget budget,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            // Validate budget
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
                // Set budget properties
                budget.Id = Guid.NewGuid();
                budget.UserId = userId;
                budget.CreatedAt = DateTime.UtcNow;
                budget.UpdatedAt = DateTime.UtcNow;

                // Ensure StartDate is UTC
                if (budget.StartDate.Kind == DateTimeKind.Unspecified)
                {
                    budget.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
                }
                else if (budget.StartDate.Kind == DateTimeKind.Local)
                {
                    budget.StartDate = budget.StartDate.ToUniversalTime();
                }

                // Ensure EndDate is UTC if provided
                if (budget.EndDate.HasValue)
                {
                    if (budget.EndDate.Value.Kind == DateTimeKind.Unspecified)
                    {
                        budget.EndDate = DateTime.SpecifyKind(budget.EndDate.Value, DateTimeKind.Utc);
                    }
                    else if (budget.EndDate.Value.Kind == DateTimeKind.Local)
                    {
                        budget.EndDate = budget.EndDate.Value.ToUniversalTime();
                    }
                }

                _dbContext.Budgets.Add(budget);
                await _dbContext.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetBudget),
                    new { id = budget.Id },
                    budget);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating budget");
                return StatusCode(500, new { message = "Error creating budget", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing budget
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<Budget>> UpdateBudget(
            Guid id,
            [FromBody] Budget budget,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            if (id != budget.Id)
            {
                return BadRequest(new { message = "Budget ID mismatch" });
            }

            try
            {
                var existingBudget = await _dbContext.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

                if (existingBudget == null)
                {
                    return NotFound(new { message = $"Budget {id} not found" });
                }

                // Update properties
                existingBudget.Category = budget.Category;
                existingBudget.Amount = budget.Amount;
                existingBudget.Period = budget.Period;
                existingBudget.SpentAmount = budget.SpentAmount;
                existingBudget.IsActive = budget.IsActive;
                existingBudget.UpdatedAt = DateTime.UtcNow;

                // Ensure StartDate is UTC
                if (budget.StartDate.Kind == DateTimeKind.Unspecified)
                {
                    existingBudget.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
                }
                else if (budget.StartDate.Kind == DateTimeKind.Local)
                {
                    existingBudget.StartDate = budget.StartDate.ToUniversalTime();
                }
                else
                {
                    existingBudget.StartDate = budget.StartDate;
                }

                // Ensure EndDate is UTC if provided
                if (budget.EndDate.HasValue)
                {
                    if (budget.EndDate.Value.Kind == DateTimeKind.Unspecified)
                    {
                        existingBudget.EndDate = DateTime.SpecifyKind(budget.EndDate.Value, DateTimeKind.Utc);
                    }
                    else if (budget.EndDate.Value.Kind == DateTimeKind.Local)
                    {
                        existingBudget.EndDate = budget.EndDate.Value.ToUniversalTime();
                    }
                    else
                    {
                        existingBudget.EndDate = budget.EndDate;
                    }
                }
                else
                {
                    existingBudget.EndDate = null;
                }

                await _dbContext.SaveChangesAsync();

                return Ok(existingBudget);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating budget {Id}", id);
                return StatusCode(500, new { message = "Error updating budget", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a budget
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteBudget(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var budget = await _dbContext.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

                if (budget == null)
                {
                    return NotFound(new { message = $"Budget {id} not found" });
                }

                _dbContext.Budgets.Remove(budget);
                await _dbContext.SaveChangesAsync();

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

