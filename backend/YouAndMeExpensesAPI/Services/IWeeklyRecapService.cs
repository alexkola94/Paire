using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IWeeklyRecapService
    {
        Task<WeeklyRecap> GenerateRecapAsync(string userId, DateTime? weekStart = null);
        Task<WeeklyRecap?> GetLatestRecapAsync(string userId);
        Task<List<WeeklyRecap>> GetRecapHistoryAsync(string userId, int count = 4);
    }
}
