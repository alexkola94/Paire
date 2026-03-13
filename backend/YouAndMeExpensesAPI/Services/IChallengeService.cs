using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IChallengeService
    {
        Task<List<Challenge>> GetAvailableChallengesAsync();
        Task<List<UserChallenge>> GetUserChallengesAsync(string userId, string? status = null);
        Task<UserChallenge> JoinChallengeAsync(string userId, Guid challengeId);
        Task<UserChallenge?> UpdateProgressAsync(string userId, Guid userChallengeId, decimal incrementBy);
        Task<UserChallenge?> ClaimRewardAsync(string userId, Guid userChallengeId);
        Task ProcessTransactionForChallengesAsync(string userId, decimal amount, string? category = null);
        Task SeedDefaultChallengesAsync();
        Task ExpireOverdueChallengesAsync();
    }
}
