using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing transactions (expenses and income).
    /// All endpoints require authentication via JWT token.
    /// Business logic is delegated to <see cref="ITransactionsService"/>.
    /// </summary>
    [Route("api/[controller]")]
    public class TransactionsController : BaseApiController
    {
        private readonly ITransactionsService _transactionsService;
        private readonly ILogger<TransactionsController> _logger;

        public TransactionsController(
            ITransactionsService transactionsService,
            ILogger<TransactionsController> logger)
        {
            _transactionsService = transactionsService;
            _logger = logger;
        }

        /// <summary>
        /// Gets all transactions for the authenticated user and their partner (if partnership exists).
        /// Includes user profile information to show who created each transaction.
        /// Supports filtering by type (income/expense) and date range (startDate/endDate).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTransactions(
            [FromQuery] string? type = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null,
            [FromQuery] string? search = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var result = await _transactionsService.GetTransactionsAsync(
                    userId, type, startDate, endDate, page, pageSize, search);

                // Preserve existing response shape (paged vs non-paged)
                if (page.HasValue && pageSize.HasValue)
                {
                    return Ok(new
                    {
                        items = result.Items,
                        totalCount = result.TotalCount,
                        page = result.Page,
                        pageSize = result.PageSize,
                        totalPages = result.TotalPages
                    });
                }

                return Ok(result.Items);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions for user: {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving transactions", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific transaction by ID.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Transaction>> GetTransaction(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            try
            {
                var transaction = await _transactionsService.GetTransactionAsync(userId, id);

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
        /// Creates a new transaction.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Transaction>> CreateTransaction([FromBody] CreateTransactionRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            if (request == null)
            {
                _logger.LogWarning("CreateTransaction: Received null request object");
                return BadRequest(new { message = "Transaction data is required" });
            }

            _logger.LogInformation(
                "CreateTransaction: Received request - Type: {Type}, Amount: {Amount}, Category: {Category}, Date: {Date}",
                request.Type, request.Amount, request.Category, request.Date);

            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid transaction data", errors = ModelState });
            }

            try
            {
                var transaction = await _transactionsService.CreateTransactionAsync(userId, request);

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
        /// Updates an existing transaction.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<Transaction>> UpdateTransaction(
            Guid id,
            [FromBody] Transaction transaction)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            if (transaction == null)
            {
                return BadRequest(new { message = "Transaction data is required" });
            }

            if (id != transaction.Id)
            {
                return BadRequest(new { message = "ID mismatch" });
            }

            if (transaction.Amount <= 0)
            {
                return BadRequest(new { message = "Amount must be greater than zero" });
            }

            try
            {
                var updated = await _transactionsService.UpdateTransactionAsync(userId, id, transaction);
                if (updated == null)
                {
                    return NotFound(new { message = $"Transaction {id} not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating transaction {Id} for user {UserId}", id, userId);
                return StatusCode(500, new { message = "Error updating transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a transaction (must belong to user or partner).
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var deleted = await _transactionsService.DeleteTransactionAsync(userId, id);
                if (!deleted)
                {
                    return NotFound(new { message = $"Transaction {id} not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting transaction {Id} for user {UserId}", id, userId);
                return StatusCode(500, new { message = "Error deleting transaction", error = ex.Message });
            }
        }

        /// <summary>
        /// Uploads a receipt image for a transaction.
        /// </summary>
        [HttpPost("receipt")]
        public async Task<ActionResult<string>> UploadReceipt(IFormFile file)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            try
            {
                var result = await _transactionsService.UploadReceiptAsync(userId, file);
                return Ok(new { url = result.Url, path = result.Path });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading receipt for user {UserId}", userId);
                return StatusCode(500, new { message = "Error uploading receipt", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets all transactions that have a receipt attached.
        /// </summary>
        [HttpGet("receipts")]
        public async Task<IActionResult> GetTransactionsWithReceipts(
            [FromQuery] string? category = null,
            [FromQuery] string? search = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var items = await _transactionsService.GetTransactionsWithReceiptsAsync(userId, category, search);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting receipts for user {UserId}", userId);
                return StatusCode(500, new { message = "Error getting receipts", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a receipt attachment from a transaction.
        /// </summary>
        [HttpDelete("{id}/receipt")]
        public async Task<IActionResult> DeleteReceipt(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var success = await _transactionsService.DeleteReceiptAsync(userId, id);
                if (!success)
                {
                    return NotFound(new { message = "Transaction not found or has no receipt to delete" });
                }

                return Ok(new { message = "Receipt deleted successfully" });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting receipt for transaction {TransactionId}", id);
                return StatusCode(500, new { message = "Error deleting receipt", error = ex.Message });
            }
        }

        /// <summary>
        /// Import transactions from a bank statement file.
        /// </summary>
        [HttpPost("import")]
        public async Task<ActionResult> ImportTransactions(IFormFile file)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return Unauthorized(new { error = "User not authenticated" });

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            try
            {
                var result = await _transactionsService.ImportTransactionsAsync(userId, file);

                if (result.ErrorMessages.Any() && result.TotalImported == 0)
                {
                    return BadRequest(new { message = "Import failed", result });
                }

                return Ok(new { message = "Import completed", result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing statement for user {UserId}", userId);
                return StatusCode(500, new { message = "Error importing statement", error = ex.Message });
            }
        }
    }
}

