namespace Paire.Modules.Travel.Core.DTOs;

public class ChatbotResponse
{
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public object? Data { get; set; }
    public List<string>? QuickActions { get; set; }
    public string? ActionLink { get; set; }
    public bool CanGenerateReport { get; set; } = false;
    public string? ReportType { get; set; }
    public ReportParameters? ReportParams { get; set; }
}

public class ChatbotQuery
{
    public string Query { get; set; } = string.Empty;
    public List<ChatMessage>? History { get; set; }
    public string? Language { get; set; } = "en";
    public Guid? ConversationId { get; set; }
    public TripContext? TripContext { get; set; }
}

public class TripContext
{
    public string? Name { get; set; }
    public string? Destination { get; set; }
    public string? Country { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public decimal? Budget { get; set; }
    public List<string>? CityNames { get; set; }
}

public class ChatMessage
{
    public string Role { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class ReportParameters
{
    public string ReportType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Category { get; set; }
    public string? GroupBy { get; set; }
    public string Language { get; set; } = "en";
}

public class GenerateReportRequest
{
    public string ReportType { get; set; } = string.Empty;
    public string Format { get; set; } = "csv";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Category { get; set; }
    public string? GroupBy { get; set; }
    public string Language { get; set; } = "en";
}

public class GenerateReportResponse
{
    public bool Success { get; set; }
    public string? FileName { get; set; }
    public string? DownloadUrl { get; set; }
    public string? ContentType { get; set; }
    public string? ErrorMessage { get; set; }
}
