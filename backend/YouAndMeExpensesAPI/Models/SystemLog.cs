using System;
using System.ComponentModel.DataAnnotations;

namespace YouAndMeExpensesAPI.Models
{
    public class SystemLog
    {
        public int Id { get; set; }

        [Required]
        public string Level { get; set; } = "Info"; // Info, Warning, Error

        [Required]
        public string Message { get; set; } = string.Empty;

        public string? StackTrace { get; set; }

        public string? Source { get; set; } // Generic source identifier

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
