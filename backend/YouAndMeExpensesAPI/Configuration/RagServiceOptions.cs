namespace YouAndMeExpensesAPI.Configuration;

/// <summary>
/// Configuration for the optional RAG (Retrieval-Augmented Generation) service.
/// Used when "Thinking mode (RAG enhanced)" is selected in the chatbot.
/// </summary>
public class RagServiceOptions
{
    public const string SectionName = "RagService";

    /// <summary>
    /// Base URL of the RAG service (e.g. http://localhost:5020).
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:5020";

    /// <summary>
    /// Tenant ID for this app when calling the RAG service.
    /// </summary>
    public string TenantId { get; set; } = "thepaire";

    /// <summary>
    /// Optional gateway secret for service-to-service auth (X-Gateway-Secret).
    /// </summary>
    public string? GatewaySecret { get; set; }

    /// <summary>
    /// When false, RAG query endpoint returns 503 (service not configured).
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// Hours after which a user's RAG context document is considered stale
    /// and will be automatically refreshed. Default: 24 hours.
    /// </summary>
    public int UserContextStaleHours { get; set; } = 24;

    /// <summary>
    /// Whether to automatically sync user context to RAG on each query.
    /// When false, user context must be synced manually or via background job.
    /// Default: true.
    /// </summary>
    public bool AutoSyncUserContext { get; set; } = true;
}
