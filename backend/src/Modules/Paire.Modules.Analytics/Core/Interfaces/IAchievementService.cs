using Paire.Modules.Analytics.Core.Entities;

namespace Paire.Modules.Analytics.Core.Interfaces;

public interface IAchievementService
{
    Task<List<UserAchievement>> CheckTransactionAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckBudgetAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckSavingsAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckLoanAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckPartnershipAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckConsistencyAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckMilestoneAchievementsAsync(string userId);
    Task<List<UserAchievement>> CheckAllAchievementsAsync(string userId);
    Task<List<UserAchievement>> GetUserAchievementsAsync(string userId);
    Task<List<AchievementProgressDto>> GetUserAchievementProgressAsync(string userId);
    Task<List<UserAchievement>> GetUnnotifiedAchievementsAsync(string userId);
    Task MarkAchievementsAsNotifiedAsync(List<Guid> userAchievementIds);
    Task InitializeDefaultAchievementsAsync();
    Task<AchievementStatsDto> GetAchievementStatsAsync(string userId);
}

public class AchievementProgressDto
{
    public Achievement Achievement { get; set; } = null!;
    public UserAchievement? UserAchievement { get; set; }
    public decimal Progress { get; set; }
    public bool IsUnlocked { get; set; }
}

public class AchievementStatsDto
{
    public int Unlocked { get; set; }
    public int Total { get; set; }
    public int TotalPoints { get; set; }
    public double Percentage { get; set; }
    public List<AchievementCategoryCountDto> ByCategory { get; set; } = new();
    public List<AchievementRarityCountDto> ByRarity { get; set; } = new();
}

public class AchievementCategoryCountDto
{
    public string? Category { get; set; }
    public int Count { get; set; }
}

public class AchievementRarityCountDto
{
    public string? Rarity { get; set; }
    public int Count { get; set; }
}
