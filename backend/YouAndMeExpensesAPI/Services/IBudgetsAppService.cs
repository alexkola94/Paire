using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// High-level budgets application service used by the API controller.
    /// Keeps controllers thin and delegates to EF / domain logic here.
    /// </summary>
    public interface IBudgetsAppService
    {
        Task<IEnumerable<object>> GetBudgetsWithProfilesAsync(Guid userId);

        Task<Budget?> GetBudgetAsync(Guid userId, Guid id);

        Task<Budget> CreateBudgetAsync(Guid userId, Budget budget);

        Task<Budget?> UpdateBudgetAsync(Guid userId, Guid id, Budget updates);

        Task<bool> DeleteBudgetAsync(Guid userId, Guid id);
    }
}

