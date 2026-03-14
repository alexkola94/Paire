using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Gamification.Core.Entities;

[Table("paire_homes")]
public class PaireHome
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("home_name")] [MaxLength(255)] public string HomeName { get; set; } = "Love Nest";
    [Column("level")] public int Level { get; set; } = 1;
    [Column("total_points")] public int TotalPoints { get; set; }
    [Column("unlocked_rooms")] public string UnlockedRooms { get; set; } = "[]";
    [Column("room_levels")] public string RoomLevels { get; set; } = "{}";
    [Column("room_points")] public string RoomPoints { get; set; } = "{}";
    [Column("decorations")] public string Decorations { get; set; } = "{}";
    [Column("seasonal_theme")] [MaxLength(50)] public string SeasonalTheme { get; set; } = "default";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
