using Microsoft.AspNetCore.Http;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Transaction domain service.
    /// Encapsulates business logic and data access for transactions.
    /// </summary>
    public interface ITransactionsService
    {
        /// <summary>
        /// Get transactions for a user (and partner, if any) with optional filtering and pagination.
        /// </summary>
        Task<TransactionsPageDto> GetTransactionsAsync(
            Guid userId,
            string? type,
            DateTime? startDate,
            DateTime? endDate,
            int? page,
            int? pageSize,
            string? search);

        /// <summary>
        /// Get a single transaction for the given user.
        /// </summary>
        Task<Transaction?> GetTransactionAsync(Guid userId, Guid id);

        /// <summary>
        /// Create a new transaction from a request DTO.
        /// Returns the created transaction along with any budget alerts triggered.
        /// </summary>
        Task<CreateTransactionResponseDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request);

        /// <summary>
        /// Update an existing transaction if it belongs to the user or their partner.
        /// </summary>
        Task<Transaction?> UpdateTransactionAsync(Guid userId, Guid id, Transaction transaction);

        /// <summary>
        /// Delete a transaction if it belongs to the user or their partner.
        /// </summary>
        Task<bool> DeleteTransactionAsync(Guid userId, Guid id);

        /// <summary>
        /// Upload a receipt image for a transaction and return its URL and storage path.
        /// </summary>
        Task<ReceiptUploadResultDto> UploadReceiptAsync(Guid userId, IFormFile file);

        /// <summary>
        /// Get all transactions that have a receipt attached.
        /// </summary>
        Task<IReadOnlyList<TransactionWithProfileDto>> GetTransactionsWithReceiptsAsync(
            Guid userId,
            string? category,
            string? search);

        /// <summary>
        /// Delete a receipt attachment from a transaction.
        /// Returns false if the transaction is missing or has no receipt.
        /// </summary>
        Task<bool> DeleteReceiptAsync(Guid userId, Guid transactionId);

        /// <summary>
        /// Import transactions from a bank statement file.
        /// </summary>
        Task<BankTransactionImportResult> ImportTransactionsAsync(Guid userId, IFormFile file);
    }
}

