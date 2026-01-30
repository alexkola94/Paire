using System.ComponentModel.DataAnnotations;

namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Request for RAG-enhanced query (Thinking mode).
/// Supports conversation history for follow-up questions and pronoun resolution.
/// </summary>
public class RagQueryRequest
{
    /// <summary>
    /// The user question to answer using RAG.
    /// </summary>
    [Required]
    [MinLength(1)]
    [MaxLength(10000)]
    public string Query { get; set; } = null!;

    /// <summary>
    /// Optional. Previous conversation messages for context in follow-up questions.
    /// Enables the AI to understand pronouns like "that", "it", etc. based on prior messages.
    /// </summary>
    public List<ConversationMessage>? ConversationHistory { get; set; }

    /// <summary>
    /// Optional. Number of relevant chunks to retrieve. For user-scoped queries the backend may use a higher default (e.g. 10).
    /// </summary>
    public int? TopK { get; set; }

    /// <summary>
    /// Optional. Minimum relevance score (0.0–1.0). For user-scoped queries the backend may use a lower default (e.g. 0.2) to improve recall.
    /// </summary>
    public double? MinRelevanceScore { get; set; }
}

/// <summary>
/// Represents a single message in a conversation history.
/// Used for providing context in follow-up questions.
/// </summary>
public class ConversationMessage
{
    /// <summary>
    /// The role of the message sender: "user" or "assistant".
    /// </summary>
    [Required]
    public string Role { get; set; } = null!;

    /// <summary>
    /// The content/text of the message.
    /// </summary>
    [Required]
    public string Content { get; set; } = null!;
}
