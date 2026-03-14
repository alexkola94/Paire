using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Gamification.Core.Entities;

[Table("home_furniture")]
public class HomeFurniture
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("room_name")] [MaxLength(50)] public string RoomName { get; set; } = string.Empty;
    [Column("furniture_code")] [MaxLength(100)] public string FurnitureCode { get; set; } = string.Empty;
    [Column("unlocked_at")] public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}

public static class FurnitureCatalog
{
    public static readonly Dictionary<string, string[]> RoomFurniture = new(StringComparer.OrdinalIgnoreCase)
    {
        ["kitchen"] = ["stove", "fridge", "table", "plant", "chandelier"],
        ["living_room"] = ["sofa", "tv", "bookshelf", "rug", "lamp"],
        ["bedroom"] = ["bed", "wardrobe", "nightstand", "mirror", "curtains"],
        ["office"] = ["desk", "chair", "monitor", "bookcase", "whiteboard"],
        ["garden"] = ["bench", "fountain", "tree", "flowers", "grill"],
        ["garage"] = ["car", "toolbox", "bike", "shelving", "workbench"],
        ["bathroom"] = ["bathtub", "vanity", "towelrack", "plants", "tiles"]
    };

    public static int GetUnlockPointsThreshold(int furnitureIndex) => (furnitureIndex + 1) * 50;
}
