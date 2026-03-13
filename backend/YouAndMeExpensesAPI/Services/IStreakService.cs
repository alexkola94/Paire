using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IStreakService
    {
        Task<UserStreak> RecordActivityAsync(string userId, string streakType);
        Task<List<UserStreak>> GetStreaksAsync(string userId);
        Task CheckAndResetBrokenStreaksAsync(string userId);
    }
}
