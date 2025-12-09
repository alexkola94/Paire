using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service interface for managing achievements
    /// Handles checking criteria and awarding achievements to users
    /// </summary>
    public interface IAchievementService
    {
        /// <summary>
        /// Check and award achievements for a user based on transaction activity
        /// </summary>
        Task<List<UserAchievement>> CheckTransactionAchievementsAsync(string userId);

        /// <summary>
        /// Check and award achievements for a user based on budget activity
        /// </summary>
        Task<List<UserAchievement>> CheckBudgetAchievementsAsync(string userId);

        /// <summary>
        /// Check and award achievements for a user based on savings goals
        /// </summary>
        Task<List<UserAchievement>> CheckSavingsAchievementsAsync(string userId);

        /// <summary>
        /// Check and award achievements for a user based on loan activity
        /// </summary>
        Task<List<UserAchievement>> CheckLoanAchievementsAsync(string userId);

        /// <summary>
        /// Check and award achievements for a user based on partnership activity
        /// </summary>
        Task<List<UserAchievement>> CheckPartnershipAchievementsAsync(string userId);

        /// <summary>
        /// Check and award achievements for a user based on consistency (login streaks, etc.)
        /// </summary>
        Task<List<UserAchievement>> CheckConsistencyAchievementsAsync(string userId);

        /// <summary>
        /// Check and award achievements for a user based on milestones
        /// </summary>
        Task<List<UserAchievement>> CheckMilestoneAchievementsAsync(string userId);

        /// <summary>
        /// Check all achievement types for a user
        /// </summary>
        Task<List<UserAchievement>> CheckAllAchievementsAsync(string userId);

        /// <summary>
        /// Get all achievements for a user
        /// </summary>
        Task<List<UserAchievement>> GetUserAchievementsAsync(string userId);

        /// <summary>
        /// Get achievement progress for a user (including locked achievements)
        /// </summary>
        Task<List<AchievementProgressDto>> GetUserAchievementProgressAsync(string userId);

        /// <summary>
        /// Get newly unlocked achievements that haven't been notified yet
        /// </summary>
        Task<List<UserAchievement>> GetUnnotifiedAchievementsAsync(string userId);

        /// <summary>
        /// Mark achievements as notified
        /// </summary>
        Task MarkAchievementsAsNotifiedAsync(List<Guid> userAchievementIds);

        /// <summary>
        /// Initialize default achievements in the database
        /// Should be called once during application startup
        /// </summary>
        Task InitializeDefaultAchievementsAsync();
    }

    /// <summary>
    /// DTO for achievement progress display
    /// </summary>
    public class AchievementProgressDto
    {
        public Achievement Achievement { get; set; } = null!;
        public UserAchievement? UserAchievement { get; set; }
        public decimal Progress { get; set; }
        public bool IsUnlocked { get; set; }
    }
}

