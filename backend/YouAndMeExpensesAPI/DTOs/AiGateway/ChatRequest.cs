namespace YouAndMeExpensesAPI.DTOs.AiGateway;

/// <summary>
/// Request model for AI Gateway /v1/chat endpoint.
/// </summary>
public class ChatRequest
{
    public List<ChatMessage> Messages { get; set; } = new();
    public string? Model { get; set; }
    public double? Temperature { get; set; }
    public int? MaxTokens { get; set; }
    public bool Stream { get; set; }
    public bool SkipPolishing { get; set; }
}

/// <summary>
/// A single message in a chat conversation.
/// </summary>
public class ChatMessage
{
    public string Role { get; set; } = null!;
    public string Content { get; set; } = null!;
}
