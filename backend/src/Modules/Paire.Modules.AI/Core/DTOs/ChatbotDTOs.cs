namespace Paire.Modules.AI.Core.DTOs;

/// <summary>
/// Chatbot query request (aligns with frontend api).
/// </summary>
public class ChatbotQueryRequest
{
    public string Query { get; set; } = string.Empty;
    public List<ChatMessageDto>? History { get; set; }
    public string? Language { get; set; } = "en";
    public Guid? ConversationId { get; set; }
}

/// <summary>
/// A single message in chat history (role + content).
/// </summary>
public class ChatMessageDto
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// Chatbot response DTO returned from rule-based and API.
/// </summary>
public class ChatbotResponseDto
{
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public object? Data { get; set; }
    public List<string>? QuickActions { get; set; }
    public string? ActionLink { get; set; }
    public bool CanGenerateReport { get; set; }
    public string? ReportType { get; set; }
    public object? ReportParams { get; set; }
}

/// <summary>
/// Parameters for report generation.
/// </summary>
public class ReportParameters
{
    public string ReportType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Category { get; set; }
    public string? GroupBy { get; set; }
    public string Language { get; set; } = "en";
}
