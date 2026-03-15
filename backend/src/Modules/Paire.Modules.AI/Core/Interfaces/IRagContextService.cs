namespace Paire.Modules.AI.Core.Interfaces;

/// <summary>
/// Orchestration for per-user RAG context (ensure/refresh).
/// </summary>
public interface IRagContextService
{
    Task<string> EnsureUserContextAsync(Guid userId, CancellationToken cancellationToken = default);
    Task ForceRefreshUserContextAsync(Guid userId, CancellationToken cancellationToken = default);
    string GetUserCategory(Guid userId);
}
