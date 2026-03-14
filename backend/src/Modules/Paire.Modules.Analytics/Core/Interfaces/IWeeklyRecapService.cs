using Paire.Modules.Analytics.Core.Entities;

namespace Paire.Modules.Analytics.Core.Interfaces;

public interface IWeeklyRecapService
{
    Task<WeeklyRecap> GenerateRecapAsync(string userId, DateTime? weekStart = null);
    Task<WeeklyRecap?> GetLatestRecapAsync(string userId);
    Task<List<WeeklyRecap>> GetRecapHistoryAsync(string userId, int count = 4);
}
