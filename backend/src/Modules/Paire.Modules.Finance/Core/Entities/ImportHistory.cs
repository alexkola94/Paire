using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Finance.Core.Entities;

[Table("import_history")]
public class ImportHistory
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("file_name")] public string FileName { get; set; } = string.Empty;
    [Column("import_date")] public DateTime ImportDate { get; set; }
    [Column("transaction_count")] public int TransactionCount { get; set; }
    [Column("total_amount")] public decimal TotalAmount { get; set; }
    [Column("status")] public string Status { get; set; } = "completed";
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
