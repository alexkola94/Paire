using Microsoft.AspNetCore.Http;
using Paire.Modules.Finance.Core.DTOs;
using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface ITransactionsService
{
    Task<TransactionsPageDto> GetTransactionsAsync(
        Guid userId,
        string? type,
        DateTime? startDate,
        DateTime? endDate,
        int? page,
        int? pageSize,
        string? search);

    Task<Transaction?> GetTransactionAsync(Guid userId, Guid id);

    Task<CreateTransactionResponseDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request);

    Task<Transaction?> UpdateTransactionAsync(Guid userId, Guid id, Transaction transaction);

    Task<bool> DeleteTransactionAsync(Guid userId, Guid id);

    Task<ReceiptUploadResultDto> UploadReceiptAsync(Guid userId, IFormFile file);

    Task<IReadOnlyList<TransactionWithProfileDto>> GetTransactionsWithReceiptsAsync(
        Guid userId,
        string? category,
        string? search);

    Task<bool> DeleteReceiptAsync(Guid userId, Guid transactionId);

    Task<BankTransactionImportResult> ImportTransactionsAsync(Guid userId, IFormFile file);
}
