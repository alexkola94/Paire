namespace YouAndMeExpenses.Models
{
    /// <summary>
    /// Loan model representing money lent or borrowed
    /// </summary>
    public class Loan
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; } = string.Empty; // "given" or "received"
        public string PartyName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = "active"; // "active" or "completed"
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO for creating/updating loans
    /// </summary>
    public class LoanDto
    {
        public string Type { get; set; } = string.Empty;
        public string PartyName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = "active";
    }
}

