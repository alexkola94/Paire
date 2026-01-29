namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Response model for AI Gateway /v1/generate endpoint.
/// </summary>
public class GenerateResponse
{
    public string Response { get; set; } = null!;
    public string Model { get; set; } = null!;
    public bool FallbackUsed { get; set; }
    public string? PolishingStrategy { get; set; }
    public string TenantId { get; set; } = null!;
    public long DurationMs { get; set; }
    public DateTime Timestamp { get; set; }
    public TokenUsage? Usage { get; set; }
}

/// <summary>
/// Token usage from the AI model response.
/// </summary>
public class TokenUsage
{
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens => PromptTokens + CompletionTokens;
}
