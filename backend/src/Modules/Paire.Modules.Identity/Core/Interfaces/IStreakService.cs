using Paire.Modules.Identity.Core.Entities;

namespace Paire.Modules.Identity.Core.Interfaces
{
    public interface IStreakService
    {
        Task<UserStreak> RecordActivityAsync(string userId, string streakType);
        Task<List<UserStreak>> GetStreaksAsync(string userId);
        Task CheckAndResetBrokenStreaksAsync(string userId);
    }
}
