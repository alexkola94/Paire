namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Response model for AI Gateway /v1/chat endpoint (aggregated from stream).
/// </summary>
public class ChatResponse
{
    public ChatMessage Message { get; set; } = null!;
    public string Model { get; set; } = null!;
    public bool FallbackUsed { get; set; }
    public string? PolishingStrategy { get; set; }
    public string TenantId { get; set; } = null!;
    public long DurationMs { get; set; }
    public DateTime Timestamp { get; set; }
    public TokenUsage? Usage { get; set; }
}
