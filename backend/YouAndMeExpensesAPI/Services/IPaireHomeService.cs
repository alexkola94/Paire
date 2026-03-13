using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IPaireHomeService
    {
        Task<PaireHome> GetOrCreateHomeAsync(string userId);
        Task<PaireHome> ProcessExpenseAsync(string userId, string category, decimal amount);
        Task<object> GetRoomsAsync(string userId);
        Task<PaireHome> UpgradeRoomAsync(string userId, string room);
    }
}
