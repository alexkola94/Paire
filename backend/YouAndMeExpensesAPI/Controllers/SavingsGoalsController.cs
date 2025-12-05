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
    [Route("api/[controller]")]
    public class SavingsGoalsController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<SavingsGoalsController> _logger;

        public SavingsGoalsController(AppDbContext dbContext, ILogger<SavingsGoalsController> logger)
        {
            _dbContext = dbContext;
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get savings goals from user and partner(s)
                var goals = await _dbContext.SavingsGoals
                    .Where(g => allUserIds.Contains(g.UserId))
                    .OrderByDescending(g => g.Priority == "high")
                    .ThenByDescending(g => g.Priority == "medium")
                    .ThenBy(g => g.TargetDate)
                    .ToListAsync();

                // Get user profiles for all goal creators
                var userIds = goals.Select(g => g.UserId).Distinct().ToList();
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

                // Enrich goals with user profile data (using camelCase for frontend compatibility)
                var enrichedGoals = goals.Select(g => new
                {
                    id = g.Id,
                    userId = g.UserId,
                    name = g.Name,
                    targetAmount = g.TargetAmount,
                    currentAmount = g.CurrentAmount,
                    priority = g.Priority,
                    category = g.Category,
                    icon = g.Icon,
                    color = g.Color,
                    notes = g.Notes,
                    targetDate = g.TargetDate,
                    isAchieved = g.IsAchieved,
                    createdAt = g.CreatedAt,
                    updatedAt = g.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(g.UserId) ? profileDict[g.UserId] : null
                }).ToList();

                return Ok(enrichedGoals);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting savings goals for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving savings goals", error = ex.Message });
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
        /// Gets a specific savings goal by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSavingsGoal(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && allUserIds.Contains(g.UserId));

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
                // Set goal properties
                goal.Id = Guid.NewGuid();
                goal.UserId = userId.ToString();
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to update the savings goal
                var existingGoal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && allUserIds.Contains(g.UserId));

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
        /// Deletes a savings goal (must belong to user or partner)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSavingsGoal(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to delete the savings goal
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && allUserIds.Contains(g.UserId));

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
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId.ToString());

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
                var goal = await _dbContext.SavingsGoals
                    .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId.ToString());

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
        public async Task<IActionResult> GetSummary()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var goals = await _dbContext.SavingsGoals
                    .Where(g => allUserIds.Contains(g.UserId))
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

