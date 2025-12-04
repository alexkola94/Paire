using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for Supabase database operations
    /// Provides abstraction for all database interactions
    /// </summary>
    public interface ISupabaseService
    {
        // ============================================
        // TRANSACTIONS
        // ============================================

        /// <summary>
        /// Gets all transactions for a specific user
        /// </summary>
        /// <param name="userId">The user ID from Supabase auth</param>
        /// <returns>List of transactions</returns>
        Task<List<Transaction>> GetTransactionsAsync(string userId);

        /// <summary>
        /// Gets a single transaction by ID
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <param name="userId">User ID for authorization</param>
        /// <returns>Transaction or null if not found</returns>
        Task<Transaction?> GetTransactionByIdAsync(Guid id, string userId);

        /// <summary>
        /// Creates a new transaction
        /// </summary>
        /// <param name="transaction">Transaction to create</param>
        /// <returns>Created transaction with ID</returns>
        Task<Transaction> CreateTransactionAsync(Transaction transaction);

        /// <summary>
        /// Updates an existing transaction
        /// </summary>
        /// <param name="transaction">Transaction with updated values</param>
        /// <returns>Updated transaction</returns>
        Task<Transaction> UpdateTransactionAsync(Transaction transaction);

        /// <summary>
        /// Deletes a transaction
        /// </summary>
        /// <param name="id">Transaction ID</param>
        /// <param name="userId">User ID for authorization</param>
        /// <returns>True if deleted successfully</returns>
        Task<bool> DeleteTransactionAsync(Guid id, string userId);

        // ============================================
        // LOANS
        // ============================================

        /// <summary>
        /// Gets all loans for a specific user
        /// </summary>
        /// <param name="userId">The user ID from Supabase auth</param>
        /// <returns>List of loans</returns>
        Task<List<Loan>> GetLoansAsync(string userId);

        /// <summary>
        /// Gets a single loan by ID
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="userId">User ID for authorization</param>
        /// <returns>Loan or null if not found</returns>
        Task<Loan?> GetLoanByIdAsync(Guid id, string userId);

        /// <summary>
        /// Creates a new loan
        /// </summary>
        /// <param name="loan">Loan to create</param>
        /// <returns>Created loan with ID</returns>
        Task<Loan> CreateLoanAsync(Loan loan);

        /// <summary>
        /// Updates an existing loan
        /// </summary>
        /// <param name="loan">Loan with updated values</param>
        /// <returns>Updated loan</returns>
        Task<Loan> UpdateLoanAsync(Loan loan);

        /// <summary>
        /// Deletes a loan
        /// </summary>
        /// <param name="id">Loan ID</param>
        /// <param name="userId">User ID for authorization</param>
        /// <returns>True if deleted successfully</returns>
        Task<bool> DeleteLoanAsync(Guid id, string userId);

        // ============================================
        // STORAGE
        // ============================================

        /// <summary>
        /// Uploads a receipt file to Supabase Storage
        /// </summary>
        /// <param name="file">File stream</param>
        /// <param name="fileName">File name</param>
        /// <param name="userId">User ID for file ownership</param>
        /// <returns>Public URL of uploaded file</returns>
        Task<string> UploadReceiptAsync(Stream file, string fileName, string userId);

        /// <summary>
        /// Deletes a receipt file from Supabase Storage
        /// </summary>
        /// <param name="fileName">File name to delete</param>
        /// <param name="userId">User ID for authorization</param>
        /// <returns>True if deleted successfully</returns>
        Task<bool> DeleteReceiptAsync(string fileName, string userId);
    }
}

