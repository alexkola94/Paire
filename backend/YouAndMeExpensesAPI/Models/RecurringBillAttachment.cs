using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace YouAndMeExpensesAPI.Models
{
    [Table("recurring_bill_attachments")]
    public class RecurringBillAttachment
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("recurring_bill_id")]
        public Guid RecurringBillId { get; set; }

        [Column("file_url")]
        public string FileUrl { get; set; } = string.Empty;

        [Column("file_path")]
        public string FilePath { get; set; } = string.Empty;

        [Column("file_name")]
        public string FileName { get; set; } = string.Empty;

        [Column("uploaded_at")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        [JsonIgnore]
        [ForeignKey("RecurringBillId")]
        public virtual RecurringBill? RecurringBill { get; set; }
    }
}
