using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.AI.Core.Entities;
using Paire.Modules.AI.Infrastructure;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.AI.Api.Controllers;

/// <summary>
/// CRUD for chatbot conversations and messages.
/// </summary>
[Authorize]
[ApiController]
[Route("api/conversations")]
public class ConversationsController : BaseApiController
{
    private readonly AiDbContext _db;
    private readonly ILogger<ConversationsController> _logger;

    public ConversationsController(AiDbContext db, ILogger<ConversationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetConversations([FromQuery] bool includeArchived = false)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var query = _db.Conversations.Where(c => c.UserId == userId.ToString());
        if (!includeArchived)
            query = query.Where(c => !c.IsArchived);

        var list = await query.OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt).ToListAsync();
        return Ok(list.Select(c => new
        {
            c.Id,
            c.Title,
            c.LastMessageAt,
            c.MessageCount,
            c.IsArchived,
            c.CreatedAt
        }));
    }

    [HttpGet("{conversationId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId.ToString());
        if (conv == null) return NotFound();

        var skip = Math.Max(0, (page - 1) * pageSize);
        var messages = await _db.ConversationMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(Math.Min(pageSize, 100))
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        return Ok(messages.Select(m => new { m.Id, m.Role, m.Content, m.MessageType, m.CreatedAt }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var conv = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = userId.ToString(),
            Title = request?.Title ?? "New conversation",
            MessageCount = 0,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Conversations.Add(conv);
        await _db.SaveChangesAsync();
        return Ok(new { conv.Id, conv.Title, conv.CreatedAt });
    }

    [HttpPut("{conversationId:guid}/title")]
    public async Task<IActionResult> UpdateTitle(Guid conversationId, [FromBody] UpdateTitleRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId.ToString());
        if (conv == null) return NotFound();

        conv.Title = request?.Title ?? conv.Title;
        conv.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { conv.Id, conv.Title });
    }

    [HttpDelete("{conversationId:guid}")]
    public async Task<IActionResult> DeleteConversation(Guid conversationId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId.ToString());
        if (conv == null) return NotFound();

        _db.Conversations.Remove(conv);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{conversationId:guid}/archive")]
    public async Task<IActionResult> ArchiveConversation(Guid conversationId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId.ToString());
        if (conv == null) return NotFound();

        conv.IsArchived = true;
        conv.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { conv.Id, conv.IsArchived });
    }
}

public class CreateConversationRequest
{
    public string? Title { get; set; }
}

public class UpdateTitleRequest
{
    public string? Title { get; set; }
}
