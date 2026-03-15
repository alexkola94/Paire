namespace Paire.Modules.AI.Core.Interfaces;

/// <summary>
/// Builds user-specific context document for RAG (e.g. financial summary).
/// </summary>
public interface IUserRagContextBuilder
{
    Task<(string Content, string DocumentTitle)> BuildContextAsync(string userId, CancellationToken cancellationToken = default);
}
