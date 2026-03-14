using Paire.Modules.Finance.Core.DTOs;
using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface IBankTransactionImportService
{
    Task<BankTransactionImportResult> ImportTransactionsAsync(
        string userId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);

    Task<BankTransactionImportResult> ImportTransactionsForAccountAsync(
        string userId,
        string accountId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);

    Task<BankTransactionImportResult> ProcessImportedTransactionsAsync(
        string userId,
        List<ImportedTransactionDTO> transactions,
        CancellationToken cancellationToken,
        ImportHistory? importHistory = null);
}

public class BankTransactionImportResult
{
    public int TotalImported { get; set; }
    public int DuplicatesSkipped { get; set; }
    public int ManualDuplicatesSkipped { get; set; }
    public int Errors { get; set; }
    public List<string> ErrorMessages { get; set; } = new();
    public DateTime? LastTransactionDate { get; set; }
}
