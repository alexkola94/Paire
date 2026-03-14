using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.AI.Core.Entities;

[Table("conversations")]
public class Conversation
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int MessageCount { get; set; }
    public string? Summary { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

[Table("conversation_messages")]
public class ConversationMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text";
    public DateTime CreatedAt { get; set; }
}
