using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing budgets
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class BudgetsController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<BudgetsController> _logger;

        public BudgetsController(
            AppDbContext dbContext,
            IAchievementService achievementService,
            ILogger<BudgetsController> logger)
        {
            _dbContext = dbContext;
            _achievementService = achievementService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all budgets for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each budget
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBudgets()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get budgets from user and partner(s)
                var budgets = await _dbContext.Budgets
                    .Where(b => allUserIds.Contains(b.UserId))
                    .OrderByDescending(b => b.CreatedAt)
                    .ToListAsync();

                // Get user profiles for all budget creators
                var userIds = budgets.Select(b => b.UserId).Distinct().ToList();
                var userProfiles = await _dbContext.UserProfiles
                    .Where(up => userIds.Contains(up.Id.ToString()))
                    .ToListAsync();

                // Create a dictionary for quick lookup
                var profileDict = userProfiles.ToDictionary(
                    p => p.Id.ToString(),
                    p => new
                    {
                        id = p.Id,
                        email = p.Email,
                        display_name = p.DisplayName,
                        avatar_url = p.AvatarUrl
                    }
                );

                // Enrich budgets with user profile data
                var enrichedBudgets = budgets.Select(b => new
                {
                    id = b.Id,
                    user_id = b.UserId,
                    category = b.Category,
                    amount = b.Amount,
                    period = b.Period,
                    spent_amount = b.SpentAmount,
                    is_active = b.IsActive,
                    start_date = b.StartDate,
                    end_date = b.EndDate,
                    created_at = b.CreatedAt,
                    updated_at = b.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(b.UserId) ? profileDict[b.UserId] : null
                }).ToList();

                return Ok(enrichedBudgets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting budgets for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving budgets", error = ex.Message });
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

        /// <summary>
        /// Gets a specific budget by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBudget(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var budget = await _dbContext.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

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
        public async Task<IActionResult> CreateBudget([FromBody] Budget budget)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

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
                budget.UserId = userId.ToString();
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

                // Check for new achievements after creating budget
                try
                {
                    await _achievementService.CheckBudgetAchievementsAsync(userId.ToString());
                }
                catch (Exception ex)
                {
                    // Log but don't fail the budget creation if achievement check fails
                    _logger.LogWarning(ex, "Error checking achievements after budget creation");
                }

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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to update the budget
                var existingBudget = await _dbContext.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

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
        public async Task<IActionResult> DeleteBudget(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to delete the budget
                var budget = await _dbContext.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

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

