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
}
