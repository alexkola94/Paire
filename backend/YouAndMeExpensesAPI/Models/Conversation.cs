using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    [Table("conversations")]
    public class Conversation
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Column("title")]
        [MaxLength(255)]
        public string? Title { get; set; }

        [Column("last_message_at")]
        public DateTime? LastMessageAt { get; set; }

        [Column("message_count")]
        public int MessageCount { get; set; }

        [Column("summary")]
        public string? Summary { get; set; }

        [Column("is_archived")]
        public bool IsArchived { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("conversation_messages")]
    public class ConversationMessage
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("conversation_id")]
        [Required]
        public Guid ConversationId { get; set; }

        [Column("role")]
        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "user";

        [Column("content")]
        [Required]
        public string Content { get; set; } = string.Empty;

        [Column("message_type")]
        [MaxLength(30)]
        public string MessageType { get; set; } = "text";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Conversation? Conversation { get; set; }
    }
}
