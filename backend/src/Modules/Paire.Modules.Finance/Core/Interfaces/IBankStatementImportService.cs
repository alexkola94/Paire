using Microsoft.AspNetCore.Http;
using Paire.Modules.Finance.Core.DTOs;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface IBankStatementImportService
{
    Task<BankTransactionImportResult> ImportStatementAsync(string userId, IFormFile file, CancellationToken cancellationToken = default);
}
