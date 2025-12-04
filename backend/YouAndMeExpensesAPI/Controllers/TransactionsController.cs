using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing transactions (expenses and income)
    /// All endpoints require authentication and user context
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionsController : ControllerBase
    {
        private readonly ISupabaseService _supabaseService;
        private readonly ILogger<TransactionsController> _logger;

        public TransactionsController(
            ISupabaseService supabaseService,
            ILogger<TransactionsController> logger)
        {
            _supabaseService = supabaseService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all transactions for the authenticated user
        /// </summary>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>List of transactions</returns>
        [HttpGet]
        public async Task<ActionResult<List<Transaction>>> GetTransactions([FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetTransactions called without user ID");
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var transactions = await _supabaseService.GetTransactionsAsync(userId);
                return Ok(transactions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving transactions", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific transaction by ID
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Transaction details</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Transaction>> GetTransaction(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var transaction = await _supabaseService.GetTransactionByIdAsync(id, userId);
                
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
        /// <param name="transaction">Transaction data</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Created transaction</returns>
        [HttpPost]
        public async Task<ActionResult<Transaction>> CreateTransaction(
            [FromBody] Transaction transaction,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            // Validate transaction
            if (transaction.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            if (string.IsNullOrEmpty(transaction.Category))
            {
                return BadRequest(new { message = "Category is required" });
            }

            if (string.IsNullOrEmpty(transaction.Type))
            {
                return BadRequest(new { message = "Type is required" });
            }

            try
            {
                // Ensure user ID matches
                transaction.UserId = userId;

                var createdTransaction = await _supabaseService.CreateTransactionAsync(transaction);
                
                return CreatedAtAction(
                    nameof(GetTransaction),
                    new { id = createdTransaction.Id },
                    createdTransaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating transaction");
                return StatusCode(500, new { message = "Error creating transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing transaction
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <param name="transaction">Updated transaction data</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Updated transaction</returns>
        [HttpPut("{id}")]
        public async Task<ActionResult<Transaction>> UpdateTransaction(
            Guid id,
            [FromBody] Transaction transaction,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

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
                // Ensure user ID matches
                transaction.UserId = userId;

                var updatedTransaction = await _supabaseService.UpdateTransactionAsync(transaction);
                return Ok(updatedTransaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating transaction {Id}", id);
                return StatusCode(500, new { message = "Error updating transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a transaction
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Success status</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(
            Guid id,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var deleted = await _supabaseService.DeleteTransactionAsync(id, userId);
                
                if (!deleted)
                {
                    return NotFound(new { message = $"Transaction {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting transaction {Id}", id);
                return StatusCode(500, new { message = "Error deleting transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Uploads a receipt for a transaction
        /// </summary>
        /// <param name="file">Receipt file</param>
        /// <param name="userId">User ID from auth token</param>
        /// <returns>Receipt URL</returns>
        [HttpPost("receipt")]
        public async Task<ActionResult<string>> UploadReceipt(
            IFormFile file,
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

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
                var receiptUrl = await _supabaseService.UploadReceiptAsync(stream, file.FileName, userId);
                
                return Ok(new { url = receiptUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading receipt");
                return StatusCode(500, new { message = "Error uploading receipt", error = ex.Message });
            }
        }
    }
}

