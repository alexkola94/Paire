using System.ComponentModel.DataAnnotations;

namespace Paire.Modules.AI.Core.DTOs.AiGateway;

/// <summary>
/// Request for RAG-enhanced query (Thinking mode).
/// </summary>
public class RagQueryRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(10000)]
    public string Query { get; set; } = null!;

    public List<RagConversationMessage>? ConversationHistory { get; set; }
    public Guid? ConversationId { get; set; }
    public int? TopK { get; set; }
    public double? MinRelevanceScore { get; set; }
}

/// <summary>
/// A single message in conversation history for RAG context.
/// </summary>
public class RagConversationMessage
{
    [Required]
    public string Role { get; set; } = null!;

    [Required]
    public string Content { get; set; } = null!;
}
