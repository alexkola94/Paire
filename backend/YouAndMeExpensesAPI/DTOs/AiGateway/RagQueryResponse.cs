namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Response from RAG-enhanced query (Thinking mode).
/// </summary>
public class RagQueryResponse
{
    /// <summary>
    /// AI-generated answer using retrieved context.
    /// </summary>
    public string Answer { get; set; } = null!;

    /// <summary>
    /// Source documents/chunks used for the response (optional).
    /// </summary>
    public List<RagSourceInfo>? Sources { get; set; }

    /// <summary>
    /// Whether RAG context was used to enhance the response.
    /// </summary>
    public bool RagUsed { get; set; }

    /// <summary>
    /// Number of relevant chunks retrieved from the knowledge base.
    /// </summary>
    public int ChunksRetrieved { get; set; }
}

/// <summary>
/// Source document/chunk info for RAG response.
/// </summary>
public class RagSourceInfo
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
}

/// <summary>
/// Info about a RAG document (returned from create/list operations).
/// </summary>
public class RagDocumentInfo
{
    /// <summary>
    /// Document ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Document title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Document category (e.g. "user_{userId}").
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Source type (e.g. "auto_sync", "manual").
    /// </summary>
    public string? SourceType { get; set; }

    /// <summary>
    /// Whether the document is active.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Number of indexed chunks.
    /// </summary>
    public int ChunkCount { get; set; }

    /// <summary>
    /// Created timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Updated timestamp (used for staleness check).
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Result from listing RAG documents.
/// </summary>
public class RagDocumentListResult
{
    /// <summary>
    /// List of documents.
    /// </summary>
    public List<RagDocumentInfo> Documents { get; set; } = new();

    /// <summary>
    /// Total count of documents matching the filter.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page.
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Page size.
    /// </summary>
    public int PageSize { get; set; }
}
