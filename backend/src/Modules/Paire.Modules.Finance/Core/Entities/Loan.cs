using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Finance.Core.Entities;

[Table("loans")]
public class Loan
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("lent_by")] public string LentBy { get; set; } = string.Empty;
    [Column("borrowed_by")] public string BorrowedBy { get; set; } = string.Empty;
    [Column("amount")] public decimal Amount { get; set; }
    [Column("description")] public string? Description { get; set; }
    [Column("date")] public DateTime Date { get; set; }
    [Column("duration_years")] public int? DurationYears { get; set; }
    [Column("duration_months")] public int? DurationMonths { get; set; }
    [Column("interest_rate")] public decimal? InterestRate { get; set; }
    [Column("has_installments")] public bool HasInstallments { get; set; }
    [Column("installment_amount")] public decimal? InstallmentAmount { get; set; }
    [Column("installment_frequency")] public string? InstallmentFrequency { get; set; }
    [Column("total_paid")] public decimal TotalPaid { get; set; }
    [Column("remaining_amount")] public decimal RemainingAmount { get; set; }
    [Column("next_payment_date")] public DateTime? NextPaymentDate { get; set; }
    [Column("due_date")] public DateTime? DueDate { get; set; }
    [Column("is_settled")] public bool IsSettled { get; set; }
    [Column("settled_date")] public DateTime? SettledDate { get; set; }
    [Column("category")] public string? Category { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
}

[Table("loan_payments")]
public class LoanPayment
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("loan_id")] public Guid LoanId { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("amount")] public decimal Amount { get; set; }
    [Column("payment_date")] public DateTime PaymentDate { get; set; }
    [Column("principal_amount")] public decimal PrincipalAmount { get; set; }
    [Column("interest_amount")] public decimal InterestAmount { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
}
