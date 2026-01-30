using System.ComponentModel.DataAnnotations;

namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Request for RAG-enhanced query (Thinking mode).
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
    /// Optional. Number of relevant chunks to retrieve. For user-scoped queries the backend may use a higher default (e.g. 10).
    /// </summary>
    public int? TopK { get; set; }

    /// <summary>
    /// Optional. Minimum relevance score (0.0–1.0). For user-scoped queries the backend may use a lower default (e.g. 0.2) to improve recall.
    /// </summary>
    public double? MinRelevanceScore { get; set; }
}
