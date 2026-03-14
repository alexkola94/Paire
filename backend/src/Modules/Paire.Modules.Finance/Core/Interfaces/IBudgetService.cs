using Paire.Modules.Finance.Core.DTOs;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface IBudgetService
{
    Task<List<BudgetAlertDto>> UpdateSpentAmountAsync(string userId, string category, decimal amount, DateTime transactionDate);
    Task RecalculateBudgetAsync(Guid budgetId);
}
