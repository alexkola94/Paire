using YouAndMeExpensesAPI.DTOs.AiGateway;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Client for the optional RAG service (Thinking mode in chatbot).
/// Supports document management for automatic per-user context sync.
/// </summary>
public interface IRagClient
{
    /// <summary>
    /// POST /v1/query - RAG-enhanced query; returns answer and optional sources.
    /// </summary>
    /// <param name="request">Query request with user question.</param>
    /// <param name="category">Optional category filter for retrieval (e.g. "user_{userId}").</param>
    /// <param name="accessToken">Optional Bearer token for authentication.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<RagQueryResponse> RagQueryAsync(
        RagQueryRequest request,
        string? category = null,
        string? accessToken = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /v1/documents - Create a new document in RAG knowledge base.
    /// </summary>
    /// <param name="title">Document title.</param>
    /// <param name="content">Document content (will be chunked and embedded by RAG).</param>
    /// <param name="category">Optional category for scoping (e.g. "user_{userId}").</param>
    /// <param name="sourceType">Source type (default: "auto_sync").</param>
    /// <param name="tags">Optional tags.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Created document info with Id.</returns>
    Task<RagDocumentInfo> CreateDocumentAsync(
        string title,
        string content,
        string? category = null,
        string sourceType = "auto_sync",
        string[]? tags = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// GET /v1/documents - List documents in RAG knowledge base, optionally filtered by category.
    /// </summary>
    /// <param name="category">Category filter (e.g. "user_{userId}").</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Page size.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of documents with metadata.</returns>
    Task<RagDocumentListResult> ListDocumentsAsync(
        string? category = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// DELETE /v1/documents/{id} - Delete a document from RAG knowledge base.
    /// </summary>
    /// <param name="documentId">Document ID to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task DeleteDocumentAsync(int documentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lightweight warmup ping to the RAG service used to trigger cold-start spin-up.
    /// Should use a very short timeout and swallow errors.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task PingRagAsync(CancellationToken cancellationToken = default);
}
