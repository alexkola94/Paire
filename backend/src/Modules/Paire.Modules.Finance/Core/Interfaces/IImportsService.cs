using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface IImportsService
{
    Task<IReadOnlyList<ImportHistory>> GetImportHistoryAsync(string userId);
    Task<(bool found, string? errorMessage)> RevertImportAsync(string userId, Guid importId);
}
