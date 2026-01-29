namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Request model for AI Gateway /v1/generate endpoint.
/// Matches the AI Microservice API contract.
/// </summary>
public class GenerateRequest
{
    public string Prompt { get; set; } = null!;
    public string? Model { get; set; }
    public double? Temperature { get; set; }
    public int? MaxTokens { get; set; }
    public string? SystemPrompt { get; set; }
    public bool SkipPolishing { get; set; }
}
