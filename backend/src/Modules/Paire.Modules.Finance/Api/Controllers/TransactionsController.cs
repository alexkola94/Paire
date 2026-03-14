using MediatR;
using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Finance.Core.DTOs;
using Paire.Shared.Kernel.Events;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Finance.Api.Controllers;

[Route("api/[controller]")]
public class TransactionsController : BaseApiController
{
    private readonly ITransactionsService _transactionsService;
    private readonly IMediator _mediator;
    private readonly ILogger<TransactionsController> _logger;

    public TransactionsController(
        ITransactionsService transactionsService,
        IMediator mediator,
        ILogger<TransactionsController> logger)
    {
        _transactionsService = transactionsService;
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? type = null, [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null, [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null, [FromQuery] string? search = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var result = await _transactionsService.GetTransactionsAsync(userId, type, startDate, endDate, page, pageSize, search);

            if (page.HasValue && pageSize.HasValue)
            {
                return Ok(new
                {
                    items = result.Items, totalCount = result.TotalCount,
                    page = result.Page, pageSize = result.PageSize, totalPages = result.TotalPages
                });
            }

            return Ok(result.Items);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions for user: {UserId}", userId);
            return StatusCode(500, new { message = "Error retrieving transactions", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Transaction>> GetTransaction(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return Unauthorized(new { error = "User not authenticated" });

        try
        {
            var transaction = await _transactionsService.GetTransactionAsync(userId, id);
            if (transaction == null) return NotFound(new { message = $"Transaction {id} not found" });
            return Ok(transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction {Id}", id);
            return StatusCode(500, new { message = "Error retrieving transaction", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<CreateTransactionResponseDto>> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return Unauthorized(new { error = "User not authenticated" });

        if (request == null) return BadRequest(new { message = "Transaction data is required" });
        if (!ModelState.IsValid) return BadRequest(new { message = "Invalid transaction data", errors = ModelState });

        try
        {
            var response = await _transactionsService.CreateTransactionAsync(userId, request);

            await _mediator.Publish(new TransactionCreatedEvent(
                response.Transaction.Id,
                userId.ToString(),
                response.Transaction.Type,
                response.Transaction.Amount,
                response.Transaction.Category));

            return CreatedAtAction(nameof(GetTransaction), new { id = response.Transaction.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction for user {UserId}", userId);
            return StatusCode(500, new { message = "Error creating transaction", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Transaction>> UpdateTransaction(Guid id, [FromBody] Transaction transaction)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return Unauthorized(new { error = "User not authenticated" });

        if (transaction == null) return BadRequest(new { message = "Transaction data is required" });
        if (id != transaction.Id) return BadRequest(new { message = "ID mismatch" });
        if (transaction.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero" });

        try
        {
            var updated = await _transactionsService.UpdateTransactionAsync(userId, id, transaction);
            if (updated == null) return NotFound(new { message = $"Transaction {id} not found" });
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transaction {Id} for user {UserId}", id, userId);
            return StatusCode(500, new { message = "Error updating transaction", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var deleted = await _transactionsService.DeleteTransactionAsync(userId, id);
            if (!deleted) return NotFound(new { message = $"Transaction {id} not found" });
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transaction {Id} for user {UserId}", id, userId);
            return StatusCode(500, new { message = "Error deleting transaction", error = ex.Message });
        }
    }

    [HttpPost("receipt")]
    public async Task<ActionResult<string>> UploadReceipt(IFormFile file)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return Unauthorized(new { error = "User not authenticated" });
        if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided" });

        try
        {
            var result = await _transactionsService.UploadReceiptAsync(userId, file);
            return Ok(new { url = result.Url, path = result.Path });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading receipt for user {UserId}", userId);
            return StatusCode(500, new { message = "Error uploading receipt", error = ex.Message });
        }
    }

    [HttpGet("receipts")]
    public async Task<IActionResult> GetTransactionsWithReceipts([FromQuery] string? category = null, [FromQuery] string? search = null)
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

    [HttpDelete("{id}/receipt")]
    public async Task<IActionResult> DeleteReceipt(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var success = await _transactionsService.DeleteReceiptAsync(userId, id);
            if (!success) return NotFound(new { message = "Transaction not found or has no receipt to delete" });
            return Ok(new { message = "Receipt deleted successfully" });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting receipt for transaction {TransactionId}", id);
            return StatusCode(500, new { message = "Error deleting receipt", error = ex.Message });
        }
    }

    [HttpPost("import")]
    public async Task<ActionResult> ImportTransactions(IFormFile file)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return Unauthorized(new { error = "User not authenticated" });
        if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided" });

        try
        {
            var result = await _transactionsService.ImportTransactionsAsync(userId, file);
            if (result.ErrorMessages.Any() && result.TotalImported == 0) return BadRequest(new { message = "Import failed", result });
            return Ok(new { message = "Import completed", result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing statement for user {UserId}", userId);
            return StatusCode(500, new { message = "Error importing statement", error = ex.Message });
        }
    }

    [HttpPost("parse-voice")]
    public IActionResult ParseVoice([FromBody] ParseVoiceRequest request)
    {
        var (_, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (string.IsNullOrWhiteSpace(request?.Text)) return BadRequest(new { error = "Text is required" });

        try
        {
            var text = request.Text.Trim();
            decimal? amount = null;
            string? category = null;
            string? description = null;
            double confidence = 0.0;

            var amountMatch = System.Text.RegularExpressions.Regex.Match(text, @"(\d+[.,]?\d*)\s*(euros?|dollars?|€|\$|£|pounds?)?", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (amountMatch.Success && decimal.TryParse(amountMatch.Groups[1].Value.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedAmount))
            {
                amount = parsedAmount;
                confidence += 0.4;
            }

            var categoryKeywords = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["groceries"] = new[] { "grocery", "groceries", "supermarket", "lidl", "aldi", "market", "food shop" },
                ["food"] = new[] { "food", "lunch", "dinner", "breakfast", "coffee", "restaurant", "cafe", "eat", "meal" },
                ["transport"] = new[] { "transport", "gas", "fuel", "uber", "taxi", "bus", "train", "parking", "car" },
                ["entertainment"] = new[] { "entertainment", "movie", "cinema", "netflix", "spotify", "game", "concert" },
                ["shopping"] = new[] { "shopping", "clothes", "shoes", "amazon", "online", "store", "mall" },
                ["health"] = new[] { "health", "doctor", "pharmacy", "medicine", "gym", "fitness", "hospital" },
                ["utilities"] = new[] { "utility", "utilities", "electric", "electricity", "water", "internet", "phone", "bill" },
                ["housing"] = new[] { "rent", "mortgage", "housing", "home", "apartment" }
            };

            var lowerText = text.ToLowerInvariant();
            foreach (var (cat, keywords) in categoryKeywords)
            {
                if (keywords.Any(k => lowerText.Contains(k))) { category = cat; confidence += 0.3; break; }
            }

            var descCandidate = System.Text.RegularExpressions.Regex.Replace(text, @"\d+[.,]?\d*\s*(euros?|dollars?|€|\$|£|pounds?)?", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
            var fillers = new[] { "spent", "paid", "bought", "on", "for", "at", "i", "my", "the", "a", "an", "about", "around" };
            var words = descCandidate.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => !fillers.Contains(w.ToLowerInvariant())).ToArray();
            description = words.Length > 0 ? string.Join(" ", words) : null;
            if (!string.IsNullOrEmpty(description)) confidence += 0.3;

            confidence = Math.Min(1.0, confidence);
            return Ok(new { amount, category, description, confidence = Math.Round(confidence, 2), originalText = text });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing voice text");
            return StatusCode(500, new { error = "Failed to parse voice text" });
        }
    }
}

public class ParseVoiceRequest
{
    public string Text { get; set; } = string.Empty;
    public string? Language { get; set; } = "en";
}
