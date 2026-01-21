using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for import history and reverting imported transactions.
    /// </summary>
    public interface IImportsService
    {
        Task<IReadOnlyList<ImportHistory>> GetImportHistoryAsync(string userId);
        Task<(bool found, string? errorMessage)> RevertImportAsync(string userId, Guid importId);
    }
}

