using Microsoft.Extensions.Logging;
using Paire.Modules.AI.Core.Interfaces;

namespace Paire.Modules.AI.Core.Services;

/// <summary>
/// Ensures per-user RAG context exists and is refreshed when stale.
/// </summary>
public class RagContextService : IRagContextService
{
    private readonly IRagClient _ragClient;
    private readonly IUserRagContextBuilder _contextBuilder;
    private readonly ILogger<RagContextService> _logger;
    private static readonly TimeSpan StaleThreshold = TimeSpan.FromHours(24);

    public RagContextService(IRagClient ragClient, IUserRagContextBuilder contextBuilder, ILogger<RagContextService> logger)
    {
        _ragClient = ragClient;
        _contextBuilder = contextBuilder;
        _logger = logger;
    }

    public string GetUserCategory(Guid userId) => $"user_{userId}";

    public async Task<string> EnsureUserContextAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var category = GetUserCategory(userId);
        try
        {
            var list = await _ragClient.ListDocumentsAsync(category, 1, 5, cancellationToken);
            var doc = list.Documents.FirstOrDefault();
            if (doc != null && doc.UpdatedAt.Add(StaleThreshold) > DateTime.UtcNow)
                return category;

            var (content, title) = await _contextBuilder.BuildContextAsync(userId.ToString(), cancellationToken);
            if (string.IsNullOrWhiteSpace(content))
                return category;

            await _ragClient.CreateDocumentAsync(title, content, category, "auto_sync", null, cancellationToken);
            _logger.LogInformation("Synced RAG context for user {UserId}, category {Category}", userId, category);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to ensure RAG context for user {UserId}", userId);
        }
        return category;
    }

    public async Task ForceRefreshUserContextAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var category = GetUserCategory(userId);
        try
        {
            var list = await _ragClient.ListDocumentsAsync(category, 1, 20, cancellationToken);
            foreach (var doc in list.Documents)
            {
                try { await _ragClient.DeleteDocumentAsync(doc.Id, cancellationToken); }
                catch (Exception ex) { _logger.LogDebug(ex, "Could not delete RAG doc {Id}", doc.Id); }
            }
            var (content, title) = await _contextBuilder.BuildContextAsync(userId.ToString(), cancellationToken);
            if (!string.IsNullOrWhiteSpace(content))
                await _ragClient.CreateDocumentAsync(title, content, category, "auto_sync", null, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to force refresh RAG context for user {UserId}", userId);
        }
    }
}
