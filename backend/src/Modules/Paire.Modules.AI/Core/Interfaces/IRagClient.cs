using Paire.Modules.AI.Core.DTOs.AiGateway;

namespace Paire.Modules.AI.Core.Interfaces;

/// <summary>
/// Client for the optional RAG service (Thinking mode).
/// </summary>
public interface IRagClient
{
    Task<RagQueryResponse> RagQueryAsync(RagQueryRequest request, string? category = null, string? accessToken = null, CancellationToken cancellationToken = default);
    Task<RagDocumentInfo> CreateDocumentAsync(string title, string content, string? category = null, string sourceType = "auto_sync", string[]? tags = null, CancellationToken cancellationToken = default);
    Task<RagDocumentListResult> ListDocumentsAsync(string? category = null, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default);
    Task DeleteDocumentAsync(int documentId, CancellationToken cancellationToken = default);
    Task PingRagAsync(CancellationToken cancellationToken = default);
}
