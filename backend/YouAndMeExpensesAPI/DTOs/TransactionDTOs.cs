using System.ComponentModel.DataAnnotations;

namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// DTO for creating a new transaction
    /// Accepts date as string to handle frontend date format.
    /// </summary>
    public class CreateTransactionRequest
    {
        [Required]
        public string Type { get; set; } = string.Empty; // "expense" or "income"

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Amount must be zero or greater")]
        public decimal Amount { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public string Date { get; set; } = string.Empty; // Accept as string (YYYY-MM-DD or ISO 8601)

        public string? AttachmentUrl { get; set; }

        public string? AttachmentPath { get; set; }

        public bool IsRecurring { get; set; }

        public string? RecurrencePattern { get; set; } // "daily", "weekly", "monthly", "yearly"

        public string? RecurrenceEndDate { get; set; } // Accept as string

        public string? PaidBy { get; set; }

        public string? SplitType { get; set; }

        public decimal? SplitPercentage { get; set; }

        public string[]? Tags { get; set; }

        public string? Notes { get; set; }

        /// <summary>
        /// Convert the DTO to a Transaction model.
        /// </summary>
        public Models.Transaction ToTransaction()
        {
            // Parse date string to DateTime
            DateTime parsedDate;
            if (string.IsNullOrEmpty(Date))
            {
                parsedDate = DateTime.UtcNow;
            }
            else if (DateTime.TryParse(Date, out var date))
            {
                parsedDate = date.Kind == DateTimeKind.Utc ? date : date.ToUniversalTime();
            }
            else
            {
                // Try parsing as date-only string (YYYY-MM-DD)
                if (DateTime.TryParseExact(Date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var dateOnly))
                {
                    parsedDate = dateOnly.ToUniversalTime();
                }
                else
                {
                    parsedDate = DateTime.UtcNow;
                }
            }

            // Parse recurrence end date if provided
            DateTime? parsedRecurrenceEndDate = null;
            if (!string.IsNullOrEmpty(RecurrenceEndDate))
            {
                if (DateTime.TryParse(RecurrenceEndDate, out var recurrenceDate))
                {
                    parsedRecurrenceEndDate = recurrenceDate.Kind == DateTimeKind.Utc
                        ? recurrenceDate
                        : recurrenceDate.ToUniversalTime();
                }
                else if (DateTime.TryParseExact(RecurrenceEndDate, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var recurrenceDateOnly))
                {
                    parsedRecurrenceEndDate = recurrenceDateOnly.ToUniversalTime();
                }
            }

            return new Models.Transaction
            {
                Type = Type,
                Amount = Amount,
                Category = Category,
                Description = Description,
                Date = parsedDate,
                AttachmentUrl = AttachmentUrl,
                AttachmentPath = AttachmentPath,
                IsRecurring = IsRecurring,
                RecurrencePattern = RecurrencePattern,
                RecurrenceEndDate = parsedRecurrenceEndDate,
                PaidBy = PaidBy,
                SplitType = SplitType,
                SplitPercentage = SplitPercentage,
                Tags = Tags,
                Notes = Notes
            };
        }
    }

    /// <summary>
    /// Slim user profile DTO embedded in transaction responses.
    /// </summary>
    public class UserProfileSlimDto
    {
        public Guid Id { get; set; }
        public string? Email { get; set; }
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
    }

    /// <summary>
    /// Transaction DTO enriched with user profile for list endpoints.
    /// </summary>
    public class TransactionWithProfileDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        public DateTime Date { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentPath { get; set; }
        public bool IsRecurring { get; set; }
        public string? RecurrencePattern { get; set; }
        public DateTime? RecurrenceEndDate { get; set; }
        public string? PaidBy { get; set; }
        public string? SplitType { get; set; }
        public decimal? SplitPercentage { get; set; }
        public string[]? Tags { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public UserProfileSlimDto? UserProfile { get; set; }
    }

    /// <summary>
    /// Wrapper for paginated transaction responses.
    /// </summary>
    public class TransactionsPageDto
    {
        public List<TransactionWithProfileDto> Items { get; set; } = new();
        public int? TotalCount { get; set; }
        public int? Page { get; set; }
        public int? PageSize { get; set; }
        public int? TotalPages { get; set; }
    }

    /// <summary>
    /// Result of a receipt upload operation.
    /// </summary>
    public class ReceiptUploadResultDto
    {
        public string Url { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
    }

    /// <summary>
    /// Budget alert information returned when a budget threshold is crossed.
    /// </summary>
    public class BudgetAlertDto
    {
        public Guid BudgetId { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal BudgetAmount { get; set; }
        public decimal SpentAmount { get; set; }
        public int PercentageUsed { get; set; }
        public string AlertType { get; set; } = string.Empty; // "warning" (80%) or "exceeded" (100%)
    }

    /// <summary>
    /// Response for transaction creation including any budget alerts.
    /// </summary>
    public class CreateTransactionResponseDto
    {
        public TransactionWithProfileDto Transaction { get; set; } = null!;
        public List<BudgetAlertDto> BudgetAlerts { get; set; } = new();
    }
}

