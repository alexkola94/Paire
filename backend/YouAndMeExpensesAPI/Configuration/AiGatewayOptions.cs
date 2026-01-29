namespace YouAndMeExpensesAPI.Configuration;

/// <summary>
/// Configuration for the optional AI Microservice Gateway (plug-and-play AI).
/// </summary>
public class AiGatewayOptions
{
    public const string SectionName = "AiGateway";

    /// <summary>
    /// Base URL of the AI Gateway (e.g. http://localhost:5015).
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:5015";

    /// <summary>
    /// Tenant ID for this app when calling the AI Gateway (e.g. thepaire).
    /// </summary>
    public string TenantId { get; set; } = "thepaire";

    /// <summary>
    /// Optional gateway secret for service-to-service calls without user JWT.
    /// </summary>
    public string? GatewaySecret { get; set; }

    /// <summary>
    /// When false, AI Gateway endpoints return 503 (service not configured).
    /// </summary>
    public bool Enabled { get; set; } = true;
}
