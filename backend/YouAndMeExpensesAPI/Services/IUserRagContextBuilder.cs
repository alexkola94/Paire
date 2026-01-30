namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Pluggable interface for building user-specific RAG context.
/// Each app implements this with its own domain data:
/// - Expenses-APP: financial summaries (analytics, recurring bills, savings, etc.)
/// - SenseiHub: dojo/student/class summaries
/// - Other apps: their own domain data
/// 
/// The shared RagContextService uses this to auto-sync user context to RAG
/// without knowing app-specific details.
/// </summary>
public interface IUserRagContextBuilder
{
    /// <summary>
    /// Builds a context document for the specified user.
    /// This content will be chunked, embedded, and stored in RAG for retrieval.
    /// </summary>
    /// <param name="userId">User ID to build context for.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// A tuple containing:
    /// - Content: Markdown/text summary of user's data for RAG indexing.
    /// - DocumentTitle: Title for the RAG document (e.g. "Financial summary", "Dojo summary").
    /// </returns>
    Task<(string Content, string DocumentTitle)> BuildContextAsync(
        string userId,
        CancellationToken cancellationToken = default);
}
