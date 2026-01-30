using Microsoft.Extensions.Options;
using YouAndMeExpensesAPI.Configuration;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Shared orchestration service for managing per-user RAG context.
/// Works with any IUserRagContextBuilder implementation to support
/// different apps (Expenses-APP, SenseiHub, etc.).
/// 
/// Implements lazy sync: checks if a user's document exists and is fresh,
/// only syncing when needed (stale or missing).
/// </summary>
public class RagContextService : IRagContextService
{
    private readonly IRagClient _ragClient;
    private readonly IUserRagContextBuilder _contextBuilder;
    private readonly RagServiceOptions _options;
    private readonly ILogger<RagContextService> _logger;

    // Simple in-memory cache to avoid repeated list calls within the same request
    // Key: userId, Value: (exists, updatedAt)
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (bool Exists, DateTime UpdatedAt, DateTime CachedAt)> _contextCache = new();
    private static readonly TimeSpan CacheExpiry = TimeSpan.FromMinutes(5);

    public RagContextService(
        IRagClient ragClient,
        IUserRagContextBuilder contextBuilder,
        IOptions<RagServiceOptions> options,
        ILogger<RagContextService> logger)
    {
        _ragClient = ragClient;
        _contextBuilder = contextBuilder;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<string> EnsureUserContextAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var category = GetUserCategory(userId);

        // Skip if auto-sync is disabled
        if (!_options.AutoSyncUserContext)
        {
            _logger.LogDebug("Auto-sync disabled, skipping user context check for {UserId}", userId);
            return category;
        }

        try
        {
            // Check cache first
            if (TryGetFromCache(userId.ToString(), out var cached) && !IsStale(cached.UpdatedAt))
            {
                _logger.LogDebug("User {UserId} context is cached and fresh", userId);
                return category;
            }

            // Check RAG service for existing document
            var existingDocs = await _ragClient.ListDocumentsAsync(category, 1, 1, cancellationToken);

            if (existingDocs.TotalCount > 0)
            {
                var doc = existingDocs.Documents.First();
                
                // Update cache
                UpdateCache(userId.ToString(), true, doc.UpdatedAt);

                // Check if stale
                if (!IsStale(doc.UpdatedAt))
                {
                    _logger.LogDebug("User {UserId} context exists and is fresh (updated {UpdatedAt})", userId, doc.UpdatedAt);
                    return category;
                }

                _logger.LogInformation("User {UserId} context is stale (updated {UpdatedAt}), refreshing...", userId, doc.UpdatedAt);

                // Delete old document before creating new one
                await _ragClient.DeleteDocumentAsync(doc.Id, cancellationToken);
            }
            else
            {
                _logger.LogInformation("No existing RAG context for user {UserId}, creating...", userId);
            }

            // Build and sync new context
            await SyncUserContextAsync(userId, category, cancellationToken);

            return category;
        }
        catch (Exception ex)
        {
            // Don't fail the request if RAG sync fails - log and continue
            _logger.LogWarning(ex, "Failed to ensure RAG context for user {UserId}, continuing without sync", userId);
            return category;
        }
    }

    /// <inheritdoc />
    public async Task ForceRefreshUserContextAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var category = GetUserCategory(userId);

        try
        {
            // Delete any existing documents for this user
            var existingDocs = await _ragClient.ListDocumentsAsync(category, 1, 100, cancellationToken);
            
            foreach (var doc in existingDocs.Documents)
            {
                await _ragClient.DeleteDocumentAsync(doc.Id, cancellationToken);
                _logger.LogDebug("Deleted existing RAG document {DocumentId} for user {UserId}", doc.Id, userId);
            }

            // Invalidate cache
            _contextCache.TryRemove(userId.ToString(), out _);

            // Build and sync new context
            await SyncUserContextAsync(userId, category, cancellationToken);

            _logger.LogInformation("Forced refresh of RAG context for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to force refresh RAG context for user {UserId}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public string GetUserCategory(Guid userId)
    {
        return $"user_{userId}";
    }

    /// <summary>
    /// Builds context using IUserRagContextBuilder and creates a document in RAG.
    /// </summary>
    private async Task SyncUserContextAsync(Guid userId, string category, CancellationToken cancellationToken)
    {
        // Build context using the app-specific builder
        var (content, documentTitle) = await _contextBuilder.BuildContextAsync(userId.ToString(), cancellationToken);

        if (string.IsNullOrWhiteSpace(content))
        {
            _logger.LogWarning("Context builder returned empty content for user {UserId}, skipping sync", userId);
            return;
        }

        // Create document in RAG
        var doc = await _ragClient.CreateDocumentAsync(
            title: documentTitle,
            content: content,
            category: category,
            sourceType: "auto_sync",
            tags: new[] { "user_context", "auto_generated" },
            cancellationToken: cancellationToken);

        // Update cache
        UpdateCache(userId.ToString(), true, doc.UpdatedAt);

        _logger.LogInformation(
            "Synced RAG context for user {UserId}: DocumentId={DocumentId}, Chunks={ChunkCount}",
            userId, doc.Id, doc.ChunkCount);
    }

    /// <summary>
    /// Checks if a document is stale based on the configured threshold.
    /// </summary>
    private bool IsStale(DateTime updatedAt)
    {
        var threshold = DateTime.UtcNow.AddHours(-_options.UserContextStaleHours);
        return updatedAt < threshold;
    }

    /// <summary>
    /// Tries to get cached context info for a user.
    /// </summary>
    private static bool TryGetFromCache(string userId, out (bool Exists, DateTime UpdatedAt) cached)
    {
        if (_contextCache.TryGetValue(userId, out var entry) && entry.CachedAt > DateTime.UtcNow.Add(-CacheExpiry))
        {
            cached = (entry.Exists, entry.UpdatedAt);
            return true;
        }

        cached = default;
        return false;
    }

    /// <summary>
    /// Updates the cache for a user.
    /// </summary>
    private static void UpdateCache(string userId, bool exists, DateTime updatedAt)
    {
        _contextCache[userId] = (exists, updatedAt, DateTime.UtcNow);
    }
}
