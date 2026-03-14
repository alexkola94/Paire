using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Finance.Core.Entities;

[Table("recurring_bill_attachments")]
public class RecurringBillAttachment
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("recurring_bill_id")] public Guid RecurringBillId { get; set; }
    [Column("file_url")] public string FileUrl { get; set; } = string.Empty;
    [Column("file_path")] public string? FilePath { get; set; }
    [Column("file_name")] public string? FileName { get; set; }
    [Column("uploaded_at")] public DateTime UploadedAt { get; set; }
    public RecurringBill RecurringBill { get; set; } = null!;
}
