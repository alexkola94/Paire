namespace Paire.Modules.AI.Core.DTOs.AiGateway;

/// <summary>
/// Response from RAG-enhanced query (Thinking mode).
/// </summary>
public class RagQueryResponse
{
    public string Answer { get; set; } = null!;
    public List<RagSourceInfo>? Sources { get; set; }
    public bool RagUsed { get; set; }
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
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? SourceType { get; set; }
    public bool IsActive { get; set; }
    public int ChunkCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Result from listing RAG documents.
/// </summary>
public class RagDocumentListResult
{
    public List<RagDocumentInfo> Documents { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
