using System.ComponentModel.DataAnnotations;
using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.DTOs;

public class CreateTransactionRequest
{
    [Required]
    public string Type { get; set; } = string.Empty;

    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Amount must be zero or greater")]
    public decimal Amount { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string Date { get; set; } = string.Empty;

    public string? AttachmentUrl { get; set; }

    public string? AttachmentPath { get; set; }

    public bool IsRecurring { get; set; }

    public string? RecurrencePattern { get; set; }

    public string? RecurrenceEndDate { get; set; }

    public string? PaidBy { get; set; }

    public string? SplitType { get; set; }

    public decimal? SplitPercentage { get; set; }

    public string[]? Tags { get; set; }

    public string? Notes { get; set; }

    public Transaction ToTransaction()
    {
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
            if (DateTime.TryParseExact(Date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var dateOnly))
            {
                parsedDate = dateOnly.ToUniversalTime();
            }
            else
            {
                parsedDate = DateTime.UtcNow;
            }
        }

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

        return new Transaction
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

public class UserProfileSlimDto
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
}

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

public class TransactionsPageDto
{
    public List<TransactionWithProfileDto> Items { get; set; } = new();
    public int? TotalCount { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
    public int? TotalPages { get; set; }
}

public class ReceiptUploadResultDto
{
    public string Url { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}

public class BudgetAlertDto
{
    public Guid BudgetId { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal BudgetAmount { get; set; }
    public decimal SpentAmount { get; set; }
    public int PercentageUsed { get; set; }
    public string AlertType { get; set; } = string.Empty;
}

public class CreateTransactionResponseDto
{
    public TransactionWithProfileDto Transaction { get; set; } = null!;
    public List<BudgetAlertDto> BudgetAlerts { get; set; } = new();
}

public class ImportedTransactionDTO
{
    public string TransactionId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
}
