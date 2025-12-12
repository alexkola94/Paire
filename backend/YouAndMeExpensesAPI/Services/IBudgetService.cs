using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IBudgetService
    {
        /// <summary>
        /// Updates the spent amount of a budget matching the transaction criteria.
        /// </summary>
        /// <param name="userId">The user ID who made the transaction.</param>
        /// <param name="category">The transaction category.</param>
        /// <param name="amount">The transaction amount (positive to add, negative to subtract).</param>
        /// <param name="transactionDate">The date of the transaction.</param>
        /// <returns>Task</returns>
        Task UpdateSpentAmountAsync(string userId, string category, decimal amount, DateTime transactionDate);

        /// <summary>
        /// Recalculates the spent amount for a specific budget based on existing transactions.
        /// </summary>
        /// <param name="budgetId">The budget ID to recalculate.</param>
        /// <returns>Task</returns>
        Task RecalculateBudgetAsync(Guid budgetId);
    }
}
