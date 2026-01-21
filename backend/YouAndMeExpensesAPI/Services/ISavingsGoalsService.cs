using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service contract for managing savings goals, deposits/withdrawals and summaries.
    /// </summary>
    public interface ISavingsGoalsService
    {
        Task<IReadOnlyList<object>> GetSavingsGoalsAsync(Guid userId);
        Task<SavingsGoal?> GetSavingsGoalAsync(Guid userId, Guid goalId);
        Task<SavingsGoal> CreateSavingsGoalAsync(Guid userId, SavingsGoal goal);
        Task<SavingsGoal?> UpdateSavingsGoalAsync(Guid userId, Guid goalId, SavingsGoal updates);
        Task<bool> DeleteSavingsGoalAsync(Guid userId, Guid goalId);
        Task<SavingsGoal?> AddDepositAsync(Guid userId, Guid goalId, decimal amount);
        Task<SavingsGoal?> WithdrawAsync(Guid userId, Guid goalId, decimal amount);
        Task<object> GetSummaryAsync(Guid userId);
    }
}

