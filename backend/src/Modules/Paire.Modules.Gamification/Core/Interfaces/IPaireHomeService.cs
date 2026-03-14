using Paire.Modules.Gamification.Core.Entities;

namespace Paire.Modules.Gamification.Core.Interfaces;

public interface IPaireHomeService
{
    Task<PaireHome> GetOrCreateHomeAsync(string userId);
    Task<PaireHome> ProcessExpenseAsync(string userId, string category, decimal amount);
    Task<object> GetRoomsAsync(string userId);
    Task<PaireHome> UpgradeRoomAsync(string userId, string room);
    Task<object> GetFurnitureAsync(string userId);
    Task<object> EquipFurnitureAsync(string userId, string room, string furnitureCode, bool equip);
    Task<PaireHome> SetSeasonalThemeAsync(string userId, string theme);
    Task<object> GetCoupleHomeAsync(string userId);
}
