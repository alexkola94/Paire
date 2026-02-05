namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// Chatbot response DTO
    /// </summary>
    public class ChatbotResponse
    {
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "text"; // "text", "insight", "suggestion", "warning", "report_offer"
        public object? Data { get; set; } // Additional data (charts, stats, etc.)
        public List<string>? QuickActions { get; set; } // Suggested follow-up questions
        public string? ActionLink { get; set; } // Link to relevant page
        
        // Report generation properties
        public bool CanGenerateReport { get; set; } = false; // Indicates if a report can be generated
        public string? ReportType { get; set; } // Type of report: "expenses_by_category", "monthly_summary", etc.
        public ReportParameters? ReportParams { get; set; } // Parameters for report generation
    }

    /// <summary>
    /// Chatbot query request
    /// </summary>
    public class ChatbotQuery
    {
        public string Query { get; set; } = string.Empty;
        public List<ChatMessage>? History { get; set; } // Conversation history for context
        public string? Language { get; set; } = "en"; // Language code (en, el, es, fr)
        /// <summary>Optional trip context for Travel Guide chatbot (active trip from frontend).</summary>
        public TripContext? TripContext { get; set; }
    }

    /// <summary>
    /// Optional trip context for Travel Guide chatbot (active trip details from frontend).
    /// Used to personalize responses (e.g. "For your trip to Paris...").
    /// </summary>
    public class TripContext
    {
        public string? Name { get; set; }
        public string? Destination { get; set; }
        public string? Country { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public decimal? Budget { get; set; }
        /// <summary>Optional list of city names for multi-city trips (e.g. Paris, Lyon).</summary>
        public List<string>? CityNames { get; set; }
    }

    /// <summary>
    /// Chat message for history
    /// </summary>
    public class ChatMessage
    {
        public string Role { get; set; } = string.Empty; // "user" or "bot"
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Parameters for report generation
    /// </summary>
    public class ReportParameters
    {
        public string ReportType { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Category { get; set; }
        public string? GroupBy { get; set; } // "category", "month", "week", "day"
        public string Language { get; set; } = "en";
    }

    /// <summary>
    /// Request to generate a report from chatbot
    /// </summary>
    public class GenerateReportRequest
    {
        public string ReportType { get; set; } = string.Empty;
        public string Format { get; set; } = "csv"; // "csv" or "pdf"
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Category { get; set; }
        public string? GroupBy { get; set; }
        public string Language { get; set; } = "en";
    }

    /// <summary>
    /// Response containing generated report info
    /// </summary>
    public class GenerateReportResponse
    {
        public bool Success { get; set; }
        public string? FileName { get; set; }
        public string? DownloadUrl { get; set; }
        public string? ContentType { get; set; }
        public string? ErrorMessage { get; set; }
    }
}

