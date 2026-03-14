using Paire.Modules.Analytics.Core.Entities;

namespace Paire.Modules.Analytics.Core.Interfaces;

public interface IFinancialHealthService
{
    Task<FinancialHealthScore> CalculateScoreAsync(string userId);
    Task<FinancialHealthScore?> GetCurrentScoreAsync(string userId);
    Task<List<FinancialHealthScore>> GetScoreHistoryAsync(string userId, int months = 6);
    Task<object?> GetPartnershipScoreAsync(string userId);
}
