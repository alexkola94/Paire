using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service contract for managing loans and related read models.
    /// All heavy logic and data access should live here rather than in controllers.
    /// </summary>
    public interface ILoansService
    {
        /// <summary>
        /// Get all loans (for user and active partner, if any) enriched with user profile data.
        /// Returns an anonymous-shaped object list that matches the existing API JSON contract.
        /// </summary>
        Task<IReadOnlyList<object>> GetLoansAsync(Guid userId);

        /// <summary>
        /// Get a single loan by id, ensuring it belongs to the user or their partner.
        /// </summary>
        Task<Loan?> GetLoanAsync(Guid userId, Guid loanId);

        /// <summary>
        /// Create a new loan for the given user. Handles all normalization (UTC dates, totals).
        /// </summary>
        Task<Loan> CreateLoanAsync(Guid userId, Loan loan);

        /// <summary>
        /// Update an existing loan if it belongs to the user or their partner.
        /// Returns null when not found or not authorized.
        /// </summary>
        Task<Loan?> UpdateLoanAsync(Guid userId, Guid loanId, Loan updatedLoan);

        /// <summary>
        /// Delete a loan owned by the given user. Returns false if not found.
        /// </summary>
        Task<bool> DeleteLoanAsync(Guid userId, Guid loanId);

        /// <summary>
        /// Get a summary view of the user's loans (totals, counts, grouped amounts).
        /// Returns an anonymous-shaped object matching the previous controller response.
        /// </summary>
        Task<object> GetLoanSummaryAsync(Guid userId);

        /// <summary>
        /// Mark a loan as settled for the given user.
        /// Returns a tuple (loan, alreadySettled) to allow the controller to preserve HTTP semantics.
        /// </summary>
        Task<(Loan? loan, bool alreadySettled)> SettleLoanAsync(Guid userId, Guid loanId);
    }
}

