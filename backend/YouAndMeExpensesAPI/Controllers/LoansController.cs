using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

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
        private readonly AppDbContext _dbContext;
        private readonly ILogger<LoansController> _logger;

        public LoansController(
            AppDbContext dbContext,
            ILogger<LoansController> logger)
        {
            _dbContext = dbContext;
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get loans from user and partner(s)
                var loans = await _dbContext.Loans
                    .Where(l => allUserIds.Contains(l.UserId))
                    .OrderByDescending(l => l.CreatedAt)
                    .ToListAsync();

                // Get user profiles for all loan creators
                var userIds = loans.Select(l => l.UserId).Distinct().ToList();
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

                // Enrich loans with user profile data (using camelCase for frontend compatibility)
                var enrichedLoans = loans.Select(l => new
                {
                    id = l.Id,
                    userId = l.UserId,
                    lentBy = l.LentBy,
                    borrowedBy = l.BorrowedBy,
                    amount = l.Amount,
                    description = l.Description,
                    date = l.Date,
                    durationYears = l.DurationYears,
                    durationMonths = l.DurationMonths,
                    interestRate = l.InterestRate,
                    hasInstallments = l.HasInstallments,
                    installmentAmount = l.InstallmentAmount,
                    installmentFrequency = l.InstallmentFrequency,
                    totalPaid = l.TotalPaid,
                    remainingAmount = l.RemainingAmount,
                    nextPaymentDate = l.NextPaymentDate,
                    dueDate = l.DueDate,
                    isSettled = l.IsSettled,
                    settledDate = l.SettledDate,
                    category = l.Category,
                    notes = l.Notes,
                    createdAt = l.CreatedAt,
                    updatedAt = l.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(l.UserId) ? profileDict[l.UserId] : null
                }).ToList();

                return Ok(enrichedLoans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loans for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loans", error = ex.Message });
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == id && allUserIds.Contains(l.UserId));
                
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
                // Set loan properties
                loan.Id = Guid.NewGuid();
                loan.UserId = userId.ToString();
                loan.CreatedAt = DateTime.UtcNow;
                loan.UpdatedAt = DateTime.UtcNow;
                
                // Convert all DateTime values to UTC to avoid PostgreSQL timestamp issues
                // PostgreSQL requires DateTime values to be UTC when using timestamp with time zone
                if (loan.Date.Kind != DateTimeKind.Utc)
                {
                    loan.Date = loan.Date.Kind == DateTimeKind.Unspecified 
                        ? DateTime.SpecifyKind(loan.Date, DateTimeKind.Utc) 
                        : loan.Date.ToUniversalTime();
                }
                
                if (loan.DueDate.HasValue && loan.DueDate.Value.Kind != DateTimeKind.Utc)
                {
                    loan.DueDate = loan.DueDate.Value.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(loan.DueDate.Value, DateTimeKind.Utc)
                        : loan.DueDate.Value.ToUniversalTime();
                }
                
                if (loan.NextPaymentDate.HasValue && loan.NextPaymentDate.Value.Kind != DateTimeKind.Utc)
                {
                    loan.NextPaymentDate = loan.NextPaymentDate.Value.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(loan.NextPaymentDate.Value, DateTimeKind.Utc)
                        : loan.NextPaymentDate.Value.ToUniversalTime();
                }
                
                // Initialize TotalPaid to 0 for new loans
                loan.TotalPaid = 0;
                
                // Calculate RemainingAmount based on Amount and TotalPaid
                // This ensures consistency regardless of what the frontend sends
                loan.RemainingAmount = loan.Amount - loan.TotalPaid;
                
                // If loan is marked as settled, ensure RemainingAmount is 0
                if (loan.IsSettled)
                {
                    loan.RemainingAmount = 0;
                    loan.SettledDate = loan.SettledDate.HasValue 
                        ? (loan.SettledDate.Value.Kind != DateTimeKind.Utc
                            ? (loan.SettledDate.Value.Kind == DateTimeKind.Unspecified
                                ? DateTime.SpecifyKind(loan.SettledDate.Value, DateTimeKind.Utc)
                                : loan.SettledDate.Value.ToUniversalTime())
                            : loan.SettledDate)
                        : DateTime.UtcNow;
                }
                else
                {
                    loan.SettledDate = null;
                }

                _dbContext.Loans.Add(loan);
                await _dbContext.SaveChangesAsync();
                
                return CreatedAtAction(
                    nameof(GetLoan),
                    new { id = loan.Id },
                    loan);
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
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to update the loan
                var existingLoan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == id && allUserIds.Contains(l.UserId));

                if (existingLoan == null)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                // Update properties
                existingLoan.Amount = loan.Amount;
                existingLoan.LentBy = loan.LentBy ?? existingLoan.LentBy;
                existingLoan.BorrowedBy = loan.BorrowedBy ?? existingLoan.BorrowedBy;
                existingLoan.Description = loan.Description ?? existingLoan.Description;
                
                // Convert Date to UTC if provided
                if (loan.Date != default && loan.Date.Kind != DateTimeKind.Utc)
                {
                    existingLoan.Date = loan.Date.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(loan.Date, DateTimeKind.Utc)
                        : loan.Date.ToUniversalTime();
                }
                
                // Handle due date if provided - convert to UTC
                if (loan.DueDate.HasValue)
                {
                    existingLoan.DueDate = loan.DueDate.Value.Kind != DateTimeKind.Utc
                        ? (loan.DueDate.Value.Kind == DateTimeKind.Unspecified
                            ? DateTime.SpecifyKind(loan.DueDate.Value, DateTimeKind.Utc)
                            : loan.DueDate.Value.ToUniversalTime())
                        : loan.DueDate;
                }
                
                // Handle next payment date if provided - convert to UTC
                if (loan.NextPaymentDate.HasValue && loan.NextPaymentDate.Value.Kind != DateTimeKind.Utc)
                {
                    existingLoan.NextPaymentDate = loan.NextPaymentDate.Value.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(loan.NextPaymentDate.Value, DateTimeKind.Utc)
                        : loan.NextPaymentDate.Value.ToUniversalTime();
                }
                
                // Update settled status
                existingLoan.IsSettled = loan.IsSettled;
                if (loan.IsSettled && !existingLoan.SettledDate.HasValue)
                {
                    existingLoan.SettledDate = DateTime.UtcNow;
                }
                else if (!loan.IsSettled)
                {
                    existingLoan.SettledDate = null;
                }
                else if (loan.SettledDate.HasValue)
                {
                    existingLoan.SettledDate = loan.SettledDate.Value.Kind != DateTimeKind.Utc
                        ? (loan.SettledDate.Value.Kind == DateTimeKind.Unspecified
                            ? DateTime.SpecifyKind(loan.SettledDate.Value, DateTimeKind.Utc)
                            : loan.SettledDate.Value.ToUniversalTime())
                        : loan.SettledDate;
                }
                
                // Recalculate RemainingAmount based on Amount and TotalPaid
                // This ensures consistency when the loan amount is updated
                existingLoan.RemainingAmount = existingLoan.Amount - existingLoan.TotalPaid;
                
                // Update settled status based on remaining amount (override if needed)
                if (existingLoan.RemainingAmount <= 0)
                {
                    existingLoan.IsSettled = true;
                    existingLoan.RemainingAmount = 0;
                    existingLoan.SettledDate = existingLoan.SettledDate ?? DateTime.UtcNow;
                }
                
                existingLoan.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                
                return Ok(existingLoan);
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
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId.ToString());
                
                if (loan == null)
                {
                    return NotFound(new { message = $"Loan {id} not found" });
                }

                _dbContext.Loans.Remove(loan);
                await _dbContext.SaveChangesAsync();

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
                var loans = await _dbContext.Loans
                    .Where(l => l.UserId == userId.ToString())
                    .ToListAsync();

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
        public async Task<IActionResult> SettleLoan(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var loan = await _dbContext.Loans
                    .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId.ToString());
                
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
                loan.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                
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

