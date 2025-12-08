namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// Chatbot response DTO
    /// </summary>
    public class ChatbotResponse
    {
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "text"; // "text", "insight", "suggestion", "warning"
        public object? Data { get; set; } // Additional data (charts, stats, etc.)
        public List<string>? QuickActions { get; set; } // Suggested follow-up questions
        public string? ActionLink { get; set; } // Link to relevant page
    }

    /// <summary>
    /// Chatbot query request
    /// </summary>
    public class ChatbotQuery
    {
        public string Query { get; set; } = string.Empty;
        public List<ChatMessage>? History { get; set; } // Conversation history for context
        public string? Language { get; set; } = "en"; // Language code (en, el, es, fr)
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
}

