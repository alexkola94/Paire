namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Shared orchestration service for managing per-user RAG context.
/// This service is app-agnostic and works with any IUserRagContextBuilder implementation.
/// </summary>
public interface IRagContextService
{
    /// <summary>
    /// Ensures a user's context document exists in RAG and is not stale.
    /// If no document exists or it's older than the configured stale threshold,
    /// builds a new context using IUserRagContextBuilder and syncs it to RAG.
    /// </summary>
    /// <param name="userId">User ID to ensure context for.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The category used for this user's documents (e.g. "user_{userId}").</returns>
    Task<string> EnsureUserContextAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Forces a refresh of the user's context document in RAG,
    /// regardless of staleness.
    /// </summary>
    /// <param name="userId">User ID to refresh context for.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ForceRefreshUserContextAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the category string used for a user's RAG documents.
    /// </summary>
    /// <param name="userId">User ID.</param>
    /// <returns>Category string (e.g. "user_{userId}").</returns>
    string GetUserCategory(Guid userId);
}
