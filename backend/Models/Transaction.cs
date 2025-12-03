namespace YouAndMeExpenses.Models
{
    /// <summary>
    /// Transaction model representing expenses and income
    /// </summary>
    public class Transaction
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; } = string.Empty; // "expense" or "income"
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime Date { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentPath { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO for creating/updating transactions
    /// </summary>
    public class TransactionDto
    {
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime Date { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentPath { get; set; }
    }

    /// <summary>
    /// Summary statistics for transactions
    /// </summary>
    public class TransactionSummary
    {
        public decimal Income { get; set; }
        public decimal Expenses { get; set; }
        public decimal Balance { get; set; }
    }
}

