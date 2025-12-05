using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing recurring bills and subscriptions
    /// Helps users track and manage regular payments
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class RecurringBillsController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<RecurringBillsController> _logger;

        public RecurringBillsController(AppDbContext dbContext, ILogger<RecurringBillsController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Gets all recurring bills for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each bill
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRecurringBills()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get recurring bills from user and partner(s)
                var bills = await _dbContext.RecurringBills
                    .Where(b => allUserIds.Contains(b.UserId))
                    .OrderBy(b => b.NextDueDate)
                    .ToListAsync();

                // Get user profiles for all bill creators
                var userIds = bills.Select(b => b.UserId).Distinct().ToList();
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

                // Enrich bills with user profile data (using camelCase for frontend compatibility)
                var enrichedBills = bills.Select(b => new
                {
                    id = b.Id,
                    userId = b.UserId,
                    name = b.Name,
                    amount = b.Amount,
                    category = b.Category,
                    frequency = b.Frequency,
                    dueDay = b.DueDay,
                    nextDueDate = b.NextDueDate,
                    autoPay = b.AutoPay,
                    reminderDays = b.ReminderDays,
                    isActive = b.IsActive,
                    notes = b.Notes,
                    createdAt = b.CreatedAt,
                    updatedAt = b.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(b.UserId) ? profileDict[b.UserId] : null
                }).ToList();

                return Ok(enrichedBills);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recurring bills for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving recurring bills", error = ex.Message });
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
        /// Gets a specific recurring bill by ID (must belong to user or partner)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRecurringBill(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var bill = await _dbContext.RecurringBills
                    .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

                if (bill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                return Ok(bill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recurring bill {Id}", id);
                return StatusCode(500, new { message = "Error retrieving recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new recurring bill
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateRecurringBill([FromBody] RecurringBill bill)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Validate bill
            if (bill.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            if (string.IsNullOrEmpty(bill.Name))
            {
                return BadRequest(new { message = "Bill name is required" });
            }

            if (bill.DueDay < 1 || bill.DueDay > 31)
            {
                return BadRequest(new { message = "Due day must be between 1 and 31" });
            }

            try
            {
                // Set bill properties
                bill.Id = Guid.NewGuid();
                bill.UserId = userId.ToString();
                bill.CreatedAt = DateTime.UtcNow;
                bill.UpdatedAt = DateTime.UtcNow;
                bill.IsActive = true;

                // Calculate next due date based on frequency and due day
                bill.NextDueDate = CalculateNextDueDate(bill.Frequency, bill.DueDay);

                // Ensure NextDueDate is UTC
                if (bill.NextDueDate.Kind == DateTimeKind.Unspecified)
                {
                    bill.NextDueDate = DateTime.SpecifyKind(bill.NextDueDate, DateTimeKind.Utc);
                }
                else if (bill.NextDueDate.Kind == DateTimeKind.Local)
                {
                    bill.NextDueDate = bill.NextDueDate.ToUniversalTime();
                }

                // Set default frequency if not provided
                if (string.IsNullOrEmpty(bill.Frequency))
                {
                    bill.Frequency = "monthly";
                }

                // Set default reminder days if not provided
                if (bill.ReminderDays <= 0)
                {
                    bill.ReminderDays = 3;
                }

                _dbContext.RecurringBills.Add(bill);
                await _dbContext.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetRecurringBill),
                    new { id = bill.Id },
                    bill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating recurring bill");
                return StatusCode(500, new { message = "Error creating recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing recurring bill
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRecurringBill(
            Guid id,
            [FromBody] RecurringBill bill)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (id != bill.Id)
            {
                return BadRequest(new { message = "Recurring bill ID mismatch" });
            }

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to update the recurring bill
                var existingBill = await _dbContext.RecurringBills
                    .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

                if (existingBill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                // Update properties
                existingBill.Name = bill.Name;
                existingBill.Amount = bill.Amount;
                existingBill.Category = bill.Category;
                existingBill.Frequency = bill.Frequency;
                existingBill.DueDay = bill.DueDay;
                existingBill.AutoPay = bill.AutoPay;
                existingBill.ReminderDays = bill.ReminderDays;
                existingBill.IsActive = bill.IsActive;
                existingBill.Notes = bill.Notes;
                existingBill.UpdatedAt = DateTime.UtcNow;

                // Recalculate next due date if frequency or due day changed
                existingBill.NextDueDate = CalculateNextDueDate(existingBill.Frequency, existingBill.DueDay);

                // Ensure NextDueDate is UTC
                if (existingBill.NextDueDate.Kind == DateTimeKind.Unspecified)
                {
                    existingBill.NextDueDate = DateTime.SpecifyKind(existingBill.NextDueDate, DateTimeKind.Utc);
                }
                else if (existingBill.NextDueDate.Kind == DateTimeKind.Local)
                {
                    existingBill.NextDueDate = existingBill.NextDueDate.ToUniversalTime();
                }

                await _dbContext.SaveChangesAsync();

                return Ok(existingBill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating recurring bill {Id}", id);
                return StatusCode(500, new { message = "Error updating recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a recurring bill (must belong to user or partner)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRecurringBill(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to delete the recurring bill
                var bill = await _dbContext.RecurringBills
                    .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

                if (bill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                _dbContext.RecurringBills.Remove(bill);
                await _dbContext.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting recurring bill {Id}", id);
                return StatusCode(500, new { message = "Error deleting recurring bill", error = ex.Message });
            }
        }

        /// <summary>
        /// Mark a bill as paid for the current period
        /// </summary>
        [HttpPost("{id}/mark-paid")]
        public async Task<IActionResult> MarkBillPaid(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var bill = await _dbContext.RecurringBills
                    .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId.ToString());

                if (bill == null)
                {
                    return NotFound(new { message = $"Recurring bill {id} not found" });
                }

                // Calculate next due date based on frequency
                bill.NextDueDate = CalculateNextDueDate(bill.Frequency, bill.DueDay, bill.NextDueDate);
                bill.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                return Ok(bill);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking bill {Id} as paid", id);
                return StatusCode(500, new { message = "Error marking bill as paid", error = ex.Message });
            }
        }

        /// <summary>
        /// Get upcoming bills (due within specified days)
        /// </summary>
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcomingBills([FromQuery] int days = 30)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var today = DateTime.UtcNow.Date;
                var futureDate = today.AddDays(days);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var upcomingBills = await _dbContext.RecurringBills
                    .Where(b => allUserIds.Contains(b.UserId) && b.IsActive && b.NextDueDate <= futureDate)
                    .OrderBy(b => b.NextDueDate)
                    .ToListAsync();

                return Ok(upcomingBills);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming bills for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving upcoming bills", error = ex.Message });
            }
        }

        /// <summary>
        /// Get recurring bills summary statistics
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

                var bills = await _dbContext.RecurringBills
                    .Where(b => allUserIds.Contains(b.UserId))
                    .ToListAsync();

                var activeBills = bills.Where(b => b.IsActive).ToList();
                var today = DateTime.UtcNow.Date;

                var summary = new
                {
                    totalBills = bills.Count,
                    activeBills = activeBills.Count,
                    inactiveBills = bills.Count - activeBills.Count,
                    totalMonthlyAmount = CalculateTotalMonthlyAmount(activeBills),
                    totalYearlyAmount = CalculateTotalYearlyAmount(activeBills),
                    upcomingBills = activeBills.Count(b => b.NextDueDate <= today.AddDays(7)),
                    overdueBills = activeBills.Count(b => b.NextDueDate < today),
                    billsByCategory = activeBills
                        .GroupBy(b => b.Category)
                        .Select(g => new { category = g.Key, count = g.Count(), totalAmount = g.Sum(b => b.Amount) })
                        .ToList(),
                    billsByFrequency = activeBills
                        .GroupBy(b => b.Frequency)
                        .Select(g => new { frequency = g.Key, count = g.Count() })
                        .ToList()
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recurring bills summary for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving summary", error = ex.Message });
            }
        }

        /// <summary>
        /// Calculate next due date based on frequency and due day
        /// </summary>
        private DateTime CalculateNextDueDate(string frequency, int dueDay, DateTime? currentDueDate = null)
        {
            var baseDate = currentDueDate ?? DateTime.UtcNow.Date;

            switch (frequency.ToLower())
            {
                case "weekly":
                    // DueDay represents day of week (1=Monday, 7=Sunday)
                    var daysUntilDue = ((dueDay - (int)baseDate.DayOfWeek + 7) % 7);
                    return baseDate.AddDays(daysUntilDue == 0 ? 7 : daysUntilDue);

                case "monthly":
                    // DueDay represents day of month
                    var nextMonth = baseDate.AddMonths(currentDueDate.HasValue ? 1 : 0);
                    var daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                    var actualDay = Math.Min(dueDay, daysInMonth);
                    var nextDueDate = new DateTime(nextMonth.Year, nextMonth.Month, actualDay);
                    
                    // If the calculated date is in the past, move to next month
                    if (nextDueDate <= baseDate && !currentDueDate.HasValue)
                    {
                        nextMonth = nextMonth.AddMonths(1);
                        daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                        actualDay = Math.Min(dueDay, daysInMonth);
                        nextDueDate = new DateTime(nextMonth.Year, nextMonth.Month, actualDay);
                    }
                    return nextDueDate;

                case "quarterly":
                    // Every 3 months
                    var nextQuarter = baseDate.AddMonths(currentDueDate.HasValue ? 3 : 0);
                    var daysInQuarterMonth = DateTime.DaysInMonth(nextQuarter.Year, nextQuarter.Month);
                    var quarterDay = Math.Min(dueDay, daysInQuarterMonth);
                    var quarterDate = new DateTime(nextQuarter.Year, nextQuarter.Month, quarterDay);
                    
                    if (quarterDate <= baseDate && !currentDueDate.HasValue)
                    {
                        nextQuarter = nextQuarter.AddMonths(3);
                        daysInQuarterMonth = DateTime.DaysInMonth(nextQuarter.Year, nextQuarter.Month);
                        quarterDay = Math.Min(dueDay, daysInQuarterMonth);
                        quarterDate = new DateTime(nextQuarter.Year, nextQuarter.Month, quarterDay);
                    }
                    return quarterDate;

                case "yearly":
                    // DueDay represents day of year (1-365)
                    var nextYear = baseDate.AddYears(currentDueDate.HasValue ? 1 : 0);
                    var yearDate = new DateTime(nextYear.Year, 1, 1).AddDays(dueDay - 1);
                    
                    if (yearDate <= baseDate && !currentDueDate.HasValue)
                    {
                        yearDate = yearDate.AddYears(1);
                    }
                    return yearDate;

                default:
                    // Default to monthly if frequency is unknown
                    return CalculateNextDueDate("monthly", dueDay, currentDueDate);
            }
        }

        /// <summary>
        /// Calculate total monthly amount from all active bills
        /// </summary>
        private decimal CalculateTotalMonthlyAmount(List<RecurringBill> bills)
        {
            return bills.Sum(b =>
            {
                return b.Frequency.ToLower() switch
                {
                    "weekly" => b.Amount * 4.33m, // Average weeks per month
                    "monthly" => b.Amount,
                    "quarterly" => b.Amount / 3,
                    "yearly" => b.Amount / 12,
                    _ => b.Amount
                };
            });
        }

        /// <summary>
        /// Calculate total yearly amount from all active bills
        /// </summary>
        private decimal CalculateTotalYearlyAmount(List<RecurringBill> bills)
        {
            return bills.Sum(b =>
            {
                return b.Frequency.ToLower() switch
                {
                    "weekly" => b.Amount * 52,
                    "monthly" => b.Amount * 12,
                    "quarterly" => b.Amount * 4,
                    "yearly" => b.Amount,
                    _ => b.Amount * 12
                };
            });
        }
    }
}

