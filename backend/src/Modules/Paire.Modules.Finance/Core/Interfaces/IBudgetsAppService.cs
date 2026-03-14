using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface IBudgetsAppService
{
    Task<IEnumerable<object>> GetBudgetsWithProfilesAsync(Guid userId);
    Task<Budget?> GetBudgetAsync(Guid userId, Guid id);
    Task<Budget> CreateBudgetAsync(Guid userId, Budget budget);
    Task<Budget?> UpdateBudgetAsync(Guid userId, Guid id, Budget updates);
    Task<bool> DeleteBudgetAsync(Guid userId, Guid id);
}
