using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing transactions (expenses and income)
    /// All endpoints require authentication via JWT token
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class TransactionsController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly ISupabaseService _supabaseService; // For storage only
        private readonly IAchievementService _achievementService;
        private readonly ILogger<TransactionsController> _logger;

        public TransactionsController(
            AppDbContext dbContext,
            ISupabaseService supabaseService,
            IAchievementService achievementService,
            ILogger<TransactionsController> logger)
        {
            _dbContext = dbContext;
            _supabaseService = supabaseService;
            _achievementService = achievementService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all transactions for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each transaction
        /// Supports filtering by type (income/expense) and date range (startDate/endDate)
        /// </summary>
        /// <param name="type">Optional: Filter by transaction type (income or expense)</param>
        /// <param name="startDate">Optional: Filter transactions from this date (inclusive)</param>
        /// <param name="endDate">Optional: Filter transactions until this date (inclusive)</param>
        /// <returns>List of transactions with user profile data</returns>
[HttpGet]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] string? type = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Build query with filters
                var query = _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId));

                // Filter by transaction type if provided
                if (!string.IsNullOrEmpty(type))
                {
                    // Normalize type to lowercase for comparison
                    var normalizedType = type.ToLowerInvariant();
                    if (normalizedType == "income" || normalizedType == "expense")
                    {
                        // Use EF.Functions.ILike for case-insensitive comparison that can be translated to SQL
                        query = query.Where(t => EF.Functions.ILike(t.Type, normalizedType));
                    }
                    else
                    {
                        return BadRequest(new { message = "Invalid type parameter. Must be 'income' or 'expense'." });
                    }
                }

                // Filter by date range if provided
                if (startDate.HasValue)
                {
                    // Ensure UTC for PostgreSQL compatibility
                    var startDateUtc = startDate.Value.Kind == DateTimeKind.Utc 
                        ? startDate.Value 
                        : startDate.Value.ToUniversalTime();
                    query = query.Where(t => t.Date >= startDateUtc);
                }

                if (endDate.HasValue)
                {
                    // Include the entire end date (set to end of day) and ensure UTC
                    var endDateValue = endDate.Value.Kind == DateTimeKind.Utc 
                        ? endDate.Value 
                        : endDate.Value.ToUniversalTime();
                    var endOfDay = endDateValue.Date.AddDays(1).AddTicks(-1);
                    query = query.Where(t => t.Date <= endOfDay);
                }

                int totalCount = 0;
                // If pagination is requested, get total count first
                if (page.HasValue && pageSize.HasValue)
                {
                    totalCount = await query.CountAsync();
                }

                // Apply ordering
                var orderedQuery = query.OrderByDescending(t => t.Date);

                // Apply pagination if requested
                if (page.HasValue && pageSize.HasValue)
                {
                    orderedQuery = (IOrderedQueryable<Transaction>)orderedQuery
                        .Skip((page.Value - 1) * pageSize.Value)
                        .Take(pageSize.Value);
                }

                // Get transactions
                var transactions = await orderedQuery.ToListAsync();

                // Get user profiles for all transaction creators
                var userIds = transactions.Select(t => t.UserId).Distinct().ToList();
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

                // Enrich transactions with user profile data (using camelCase for frontend compatibility)
                var enrichedTransactions = transactions.Select(t => new
                {
                    id = t.Id,
                    userId = t.UserId,
                    type = t.Type,
                    amount = t.Amount,
                    category = t.Category,
                    description = t.Description,
                    date = t.Date,
                    attachmentUrl = t.AttachmentUrl,
                    attachmentPath = t.AttachmentPath,
                    isRecurring = t.IsRecurring,
                    recurrencePattern = t.RecurrencePattern,
                    recurrenceEndDate = t.RecurrenceEndDate,
                    paidBy = t.PaidBy,
                    splitType = t.SplitType,
                    splitPercentage = t.SplitPercentage,
                    tags = t.Tags,
                    notes = t.Notes,
                    createdAt = t.CreatedAt,
                    updatedAt = t.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(t.UserId) ? profileDict[t.UserId] : null
                }).ToList();

                // Return paged response if pagination was requested
                if (page.HasValue && pageSize.HasValue)
                {
                     return Ok(new
                     {
                         items = enrichedTransactions,
                         totalCount = totalCount,
                         page = page.Value,
                         pageSize = pageSize.Value,
                         totalPages = (int)Math.Ceiling(totalCount / (double)pageSize.Value)
                     });
                }

                return Ok(enrichedTransactions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving transactions", error = ex.Message });
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
        /// Gets a specific transaction by ID
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <returns>Transaction details</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Transaction>> GetTransaction(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            try
            {
                var transaction = await _dbContext.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId.ToString());
                
                if (transaction == null)
                {
                    return NotFound(new { message = $"Transaction {id} not found" });
                }

                return Ok(transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transaction {Id}", id);
                return StatusCode(500, new { message = "Error retrieving transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new transaction
        /// </summary>
        /// <param name="request">Transaction data</param>
        /// <returns>Created transaction</returns>
        [HttpPost]
        public async Task<ActionResult<Transaction>> CreateTransaction([FromBody] CreateTransactionRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            // Validate request object is not null
            if (request == null)
            {
                _logger.LogWarning("CreateTransaction: Received null request object");
                return BadRequest(new { message = "Transaction data is required" });
            }

            // Log received data for debugging
            _logger.LogInformation("CreateTransaction: Received request - Type: {Type}, Amount: {Amount}, Category: {Category}, Date: {Date}", 
                request.Type, request.Amount, request.Category, request.Date);

            // Validate request using model validation
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid transaction data", errors = ModelState });
            }

            try
            {
                // Convert DTO to Transaction model
                var transaction = request.ToTransaction();
                
                // Set transaction properties
                transaction.Id = Guid.NewGuid();
                transaction.UserId = userId.ToString();
                transaction.CreatedAt = DateTime.UtcNow;
                transaction.UpdatedAt = DateTime.UtcNow;

                _dbContext.Transactions.Add(transaction);
                await _dbContext.SaveChangesAsync();
                
                // Check for new achievements after creating transaction
                try
                {
                    await _achievementService.CheckTransactionAchievementsAsync(userId.ToString());
                    await _achievementService.CheckMilestoneAchievementsAsync(userId.ToString());
                }
                catch (Exception ex)
                {
                    // Log but don't fail the transaction creation if achievement check fails
                    _logger.LogWarning(ex, "Error checking achievements after transaction creation");
                }
                
                return CreatedAtAction(
                    nameof(GetTransaction),
                    new { id = transaction.Id },
                    transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating transaction for user {UserId}", userId);
                return StatusCode(500, new { message = "Error creating transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing transaction
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <param name="transaction">Updated transaction data</param>
        /// <returns>Updated transaction</returns>
        [HttpPut("{id}")]
        public async Task<ActionResult<Transaction>> UpdateTransaction(
            Guid id,
            [FromBody] Transaction transaction)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            if (id != transaction.Id)
            {
                return BadRequest(new { message = "ID mismatch" });
            }

            // Validate transaction
            if (transaction.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to update the transaction
                var existingTransaction = await _dbContext.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id && allUserIds.Contains(t.UserId));

                if (existingTransaction == null)
                {
                    return NotFound(new { message = $"Transaction {id} not found" });
                }

                // Update properties
                existingTransaction.Type = transaction.Type;
                existingTransaction.Amount = transaction.Amount;
                existingTransaction.Category = transaction.Category;
                existingTransaction.Description = transaction.Description;
                
                // Ensure Date is UTC for PostgreSQL compatibility
                existingTransaction.Date = transaction.Date.Kind == DateTimeKind.Utc 
                    ? transaction.Date 
                    : transaction.Date.ToUniversalTime();
                
                existingTransaction.PaidBy = transaction.PaidBy;
                existingTransaction.IsRecurring = transaction.IsRecurring;
                existingTransaction.RecurrencePattern = transaction.RecurrencePattern;
                
                // Ensure RecurrenceEndDate is UTC if provided
                if (transaction.RecurrenceEndDate.HasValue)
                {
                    existingTransaction.RecurrenceEndDate = transaction.RecurrenceEndDate.Value.Kind == DateTimeKind.Utc 
                        ? transaction.RecurrenceEndDate.Value 
                        : transaction.RecurrenceEndDate.Value.ToUniversalTime();
                }
                else
                {
                    existingTransaction.RecurrenceEndDate = null;
                }
                
                existingTransaction.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                
                return Ok(existingTransaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating transaction {Id} for user {UserId}", id, userId);
                return StatusCode(500, new { message = "Error updating transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a transaction (must belong to user or partner)
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <returns>Success status</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to delete the transaction
                var transaction = await _dbContext.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id && allUserIds.Contains(t.UserId));
                
                if (transaction == null)
                {
                    return NotFound(new { message = $"Transaction {id} not found" });
                }

                _dbContext.Transactions.Remove(transaction);
                await _dbContext.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting transaction {Id} for user {UserId}", id, userId);
                return StatusCode(500, new { message = "Error deleting transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Uploads a receipt for a transaction
        /// </summary>
        /// <param name="file">Receipt file</param>
        /// <returns>Receipt URL</returns>
        [HttpPost("receipt")]
        public async Task<ActionResult<string>> UploadReceipt(IFormFile file)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            // Validate file type (images only)
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Only image files are allowed" });
            }

            // Validate file size (max 5MB)
            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "File size must be less than 5MB" });
            }

            try
            {
                using var stream = file.OpenReadStream();
                var receiptUrl = await _supabaseService.UploadReceiptAsync(stream, file.FileName, userId.ToString());
                
                return Ok(new { url = receiptUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading receipt for user {UserId}", userId);
                return StatusCode(500, new { message = "Error uploading receipt", error = ex.Message });
            }
        }
    }
}

