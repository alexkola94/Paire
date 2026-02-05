using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for importing bank transactions into the app's transaction system
    /// Handles mapping, duplicate detection, and automatic categorization
    /// </summary>
    public interface IBankTransactionImportService
    {
        /// <summary>
        /// Imports bank transactions for a user's connected bank accounts
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="fromDate">Optional start date for transactions</param>
        /// <param name="toDate">Optional end date for transactions</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Import result with counts</returns>
        Task<BankTransactionImportResult> ImportTransactionsAsync(
            string userId, 
            DateTime? fromDate = null, 
            DateTime? toDate = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Imports transactions from a specific bank account
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="accountId">Bank account ID</param>
        /// <param name="fromDate">Optional start date</param>
        /// <param name="toDate">Optional end date</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Import result</returns>
        Task<BankTransactionImportResult> ImportTransactionsForAccountAsync(
            string userId,
            string accountId,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Process a list of generic ImportedTransactionDTOs from CSV/Excel
        /// </summary>
        Task<BankTransactionImportResult> ProcessImportedTransactionsAsync(
            string userId, 
            List<ImportedTransactionDTO> transactions,
            CancellationToken cancellationToken,
            ImportHistory? importHistory = null);
    }

    /// <summary>
    /// Result of bank transaction import operation
    /// </summary>
    public class BankTransactionImportResult
    {
        public int TotalImported { get; set; }
        public int DuplicatesSkipped { get; set; }
        /// <summary>Count of rows skipped because they matched an existing manual transaction.</summary>
        public int ManualDuplicatesSkipped { get; set; }
        public int Errors { get; set; }
        public List<string> ErrorMessages { get; set; } = new();
        public DateTime? LastTransactionDate { get; set; }
    }
}

