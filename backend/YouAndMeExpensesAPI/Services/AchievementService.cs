using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json;
using System.Text.Json.Nodes;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for managing achievements
    /// Checks user activity and awards achievements when criteria are met
    /// </summary>
    public class AchievementService : IAchievementService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AchievementService> _logger;

        public AchievementService(AppDbContext context, ILogger<AchievementService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Save user achievements with duplicate key exception handling
        /// Handles race conditions where multiple requests try to add the same achievement
        /// </summary>
        private async Task<List<UserAchievement>> SaveAchievementsAsync(List<UserAchievement> achievements, string userId)
        {
            if (!achievements.Any())
                return achievements;

            try
            {
                await _context.SaveChangesAsync();
                return achievements;
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
            {
                // Handle duplicate key violation (race condition - achievement already exists)
                // This can happen if multiple requests check achievements simultaneously
                _logger.LogWarning("Duplicate achievement detected (likely race condition), filtering out duplicates");
                
                // Query database to see which achievements actually exist
                var savedAchievementIds = await _context.UserAchievements
                    .Where(ua => ua.UserId == userId && achievements.Select(a => a.AchievementId).Contains(ua.AchievementId))
                    .Select(ua => ua.AchievementId)
                    .ToListAsync();
                
                // Return only achievements that were successfully saved
                return achievements.Where(a => savedAchievementIds.Contains(a.AchievementId)).ToList();
            }
        }

        /// <summary>
        /// Initialize default achievements in the database
        /// Should be called once during application startup or migration
        /// </summary>
        public async Task InitializeDefaultAchievementsAsync()
        {
            var defaultAchievements = new List<Achievement>
            {
                // ============================================
                // TRANSACTION ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "FIRST_EXPENSE",
                    Name = "First Expense",
                    Description = "Record your first expense",
                    Category = "transactions",
                    Icon = "FiTrendingDown",
                    Color = "primary",
                    Points = 10,
                    Rarity = "common",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "expense", count = 1 }),
                    SortOrder = 1
                },
                new Achievement
                {
                    Code = "EXPENSE_10",
                    Name = "Getting Started",
                    Description = "Record 10 expenses",
                    Category = "transactions",
                    Icon = "FiTrendingDown",
                    Color = "primary",
                    Points = 25,
                    Rarity = "common",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "expense", count = 10 }),
                    SortOrder = 2
                },
                new Achievement
                {
                    Code = "EXPENSE_50",
                    Name = "Regular Tracker",
                    Description = "Record 50 expenses",
                    Category = "transactions",
                    Icon = "FiTrendingDown",
                    Color = "secondary",
                    Points = 50,
                    Rarity = "rare",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "expense", count = 50 }),
                    SortOrder = 3
                },
                new Achievement
                {
                    Code = "EXPENSE_100",
                    Name = "Dedicated Tracker",
                    Description = "Record 100 expenses",
                    Category = "transactions",
                    Icon = "FiTrendingDown",
                    Color = "secondary",
                    Points = 100,
                    Rarity = "rare",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "expense", count = 100 }),
                    SortOrder = 4
                },
                new Achievement
                {
                    Code = "EXPENSE_500",
                    Name = "Power Tracker",
                    Description = "Record 500 expenses",
                    Category = "transactions",
                    Icon = "FiTrendingDown",
                    Color = "gold",
                    Points = 300,
                    Rarity = "legendary",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "expense", count = 500 }),
                    SortOrder = 5
                },
                new Achievement
                {
                    Code = "FIRST_INCOME",
                    Name = "First Income",
                    Description = "Record your first income",
                    Category = "transactions",
                    Icon = "FiTrendingUp",
                    Color = "primary",
                    Points = 10,
                    Rarity = "common",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "income", count = 1 }),
                    SortOrder = 6
                },
                new Achievement
                {
                    Code = "TOTAL_EXPENSES_1000",
                    Name = "Big Spender",
                    Description = "Track €1,000 in total expenses",
                    Category = "transactions",
                    Icon = "FiDollarSign",
                    Color = "secondary",
                    Points = 75,
                    Rarity = "rare",
                    CriteriaType = "amount",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "expense", amount = 1000 }),
                    SortOrder = 7
                },

                // ============================================
                // BUDGET ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "FIRST_BUDGET",
                    Name = "Budget Planner",
                    Description = "Create your first budget",
                    Category = "budgets",
                    Icon = "FiTarget",
                    Color = "primary",
                    Points = 20,
                    Rarity = "common",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "budget", count = 1 }),
                    SortOrder = 10
                },
                new Achievement
                {
                    Code = "BUDGET_MASTER",
                    Name = "Budget Master",
                    Description = "Stay within budget for 3 consecutive months",
                    Category = "budgets",
                    Icon = "FiTarget",
                    Color = "secondary",
                    Points = 100,
                    Rarity = "epic",
                    CriteriaType = "streak",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "budget", months = 3 }),
                    SortOrder = 11
                },

                // ============================================
                // SAVINGS ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "FIRST_SAVINGS_GOAL",
                    Name = "Goal Setter",
                    Description = "Create your first savings goal",
                    Category = "savings",
                    Icon = "FiPieChart",
                    Color = "primary",
                    Points = 20,
                    Rarity = "common",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "savings_goal", count = 1 }),
                    SortOrder = 20
                },
                new Achievement
                {
                    Code = "SAVINGS_GOAL_ACHIEVED",
                    Name = "Goal Achiever",
                    Description = "Achieve your first savings goal",
                    Category = "savings",
                    Icon = "FiPieChart",
                    Color = "secondary",
                    Points = 150,
                    Rarity = "epic",
                    CriteriaType = "boolean",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "savings_goal_achieved" }),
                    SortOrder = 21
                },
                new Achievement
                {
                    Code = "SAVINGS_1000",
                    Name = "Saver",
                    Description = "Save €1,000 across all goals",
                    Category = "savings",
                    Icon = "FiPieChart",
                    Color = "secondary",
                    Points = 100,
                    Rarity = "rare",
                    CriteriaType = "amount",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "savings", amount = 1000 }),
                    SortOrder = 22
                },
                new Achievement
                {
                    Code = "SAVINGS_10000",
                    Name = "Wealth Builder",
                    Description = "Save €10,000 across all goals",
                    Category = "savings",
                    Icon = "FiPieChart",
                    Color = "gold",
                    Points = 500,
                    Rarity = "legendary",
                    CriteriaType = "amount",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "savings", amount = 10000 }),
                    SortOrder = 23
                },

                // ============================================
                // LOAN ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "LOAN_SETTLED",
                    Name = "Debt Free",
                    Description = "Settle your first loan",
                    Category = "loans",
                    Icon = "FiCheckCircle",
                    Color = "primary",
                    Points = 75,
                    Rarity = "rare",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "loan_settled", count = 1 }),
                    SortOrder = 30
                },

                // ============================================
                // PARTNERSHIP ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "PARTNERSHIP_CREATED",
                    Name = "Together",
                    Description = "Create a partnership",
                    Category = "partnership",
                    Icon = "FiUsers",
                    Color = "primary",
                    Points = 50,
                    Rarity = "common",
                    CriteriaType = "boolean",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "partnership" }),
                    SortOrder = 40
                },
                new Achievement
                {
                    Code = "SHARED_EXPENSES_10",
                    Name = "Team Player",
                    Description = "Record 10 shared expenses with your partner",
                    Category = "partnership",
                    Icon = "FiUsers",
                    Color = "secondary",
                    Points = 75,
                    Rarity = "rare",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "shared_expense", count = 10 }),
                    SortOrder = 41
                },

                // ============================================
                // CONSISTENCY ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "LOGIN_STREAK_7",
                    Name = "Week Warrior",
                    Description = "Login for 7 consecutive days",
                    Category = "consistency",
                    Icon = "FiCalendar",
                    Color = "primary",
                    Points = 50,
                    Rarity = "rare",
                    CriteriaType = "streak",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "login", days = 7 }),
                    SortOrder = 50
                },
                new Achievement
                {
                    Code = "LOGIN_STREAK_30",
                    Name = "Monthly Master",
                    Description = "Login for 30 consecutive days",
                    Category = "consistency",
                    Icon = "FiCalendar",
                    Color = "secondary",
                    Points = 200,
                    Rarity = "epic",
                    CriteriaType = "streak",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "login", days = 30 }),
                    SortOrder = 51
                },
                new Achievement
                {
                    Code = "LOGIN_STREAK_60",
                    Name = "Committed",
                    Description = "Login for 60 consecutive days",
                    Category = "consistency",
                    Icon = "FiCalendar",
                    Color = "gold",
                    Points = 400,
                    Rarity = "legendary",
                    CriteriaType = "streak",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "login", days = 60 }),
                    SortOrder = 52
                },

                // ============================================
                // MILESTONE ACHIEVEMENTS
                // ============================================
                new Achievement
                {
                    Code = "TOTAL_TRANSACTIONS_100",
                    Name = "Century Club",
                    Description = "Record 100 total transactions",
                    Category = "milestone",
                    Icon = "FiAward",
                    Color = "secondary",
                    Points = 150,
                    Rarity = "epic",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "transaction", count = 100 }),
                    SortOrder = 60
                },
                new Achievement
                {
                    Code = "TOTAL_TRANSACTIONS_500",
                    Name = "Data Hoarder",
                    Description = "Record 500 total transactions",
                    Category = "milestone",
                    Icon = "FiAward",
                    Color = "gold",
                    Points = 350,
                    Rarity = "legendary",
                    CriteriaType = "count",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "transaction", count = 500 }),
                    SortOrder = 61
                },
                new Achievement
                {
                    Code = "TOTAL_SAVED_5000",
                    Name = "Big Saver",
                    Description = "Save €5,000 across all goals",
                    Category = "milestone",
                    Icon = "FiAward",
                    Color = "gold",
                    Points = 300,
                    Rarity = "legendary",
                    CriteriaType = "amount",
                    CriteriaValue = JsonSerializer.Serialize(new { type = "savings", amount = 5000 }),
                    SortOrder = 62
                }
            };

            var existingCodes = await _context.Achievements.Select(a => a.Code).ToListAsync();
            var newAchievements = defaultAchievements.Where(a => !existingCodes.Contains(a.Code)).ToList();

            if (newAchievements.Any())
            {
                foreach (var achievement in newAchievements)
                {
                    achievement.Id = Guid.NewGuid(); // Ensure ID is set
                }
                
                await _context.Achievements.AddRangeAsync(newAchievements);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Initialized {newAchievements.Count} new achievements.");
            }
            else
            {
                _logger.LogInformation("No new default achievements to initialize.");
            }
        }

        public async Task<List<UserAchievement>> CheckTransactionAchievementsAsync(string userId)
        {
            var newAchievements = new List<UserAchievement>();

            // Get user's transaction statistics
            var expenseCount = await _context.Transactions
                .CountAsync(t => t.UserId == userId && t.Type.ToLower() == "expense");

            var incomeCount = await _context.Transactions
                .CountAsync(t => t.UserId == userId && t.Type.ToLower() == "income");

            var totalExpenseAmount = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type.ToLower() == "expense")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            // Check count-based achievements
            var countAchievements = await _context.Achievements
                .Where(a => a.IsActive && a.Category == "transactions" && a.CriteriaType == "count")
                .ToListAsync();

            foreach (var achievement in countAchievements)
            {
                if (await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == achievement.Id))
                    continue;

                var criteria = JsonSerializer.Deserialize<JsonObject>(achievement.CriteriaValue ?? "{}");
                var type = criteria?["type"]?.ToString() ?? "";
                var targetCount = criteria?["count"] != null 
                    ? criteria["count"]!.GetValue<int>() 
                    : 0;

                int currentCount = 0;
                if (type == "expense") currentCount = expenseCount;
                else if (type == "income") currentCount = incomeCount;

                if (currentCount >= targetCount)
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = achievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            // Check amount-based achievements
            var amountAchievements = await _context.Achievements
                .Where(a => a.IsActive && a.Category == "transactions" && a.CriteriaType == "amount")
                .ToListAsync();

            foreach (var achievement in amountAchievements)
            {
                if (await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == achievement.Id))
                    continue;

                var criteria = JsonSerializer.Deserialize<JsonObject>(achievement.CriteriaValue ?? "{}");
                var type = criteria?["type"]?.ToString() ?? "";
                var targetAmount = criteria?["amount"] != null 
                    ? criteria["amount"]!.GetValue<decimal>() 
                    : 0;

                decimal currentAmount = 0;
                if (type == "expense") currentAmount = totalExpenseAmount;

                if (currentAmount >= targetAmount)
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = achievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            return await SaveAchievementsAsync(newAchievements, userId);
        }

        public async Task<List<UserAchievement>> CheckBudgetAchievementsAsync(string userId)
        {
            var newAchievements = new List<UserAchievement>();

            var budgetCount = await _context.Budgets
                .CountAsync(b => b.UserId == userId);

            // Check first budget achievement
            var firstBudgetAchievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Code == "FIRST_BUDGET" && a.IsActive);

            if (firstBudgetAchievement != null && budgetCount >= 1)
            {
                if (!await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == firstBudgetAchievement.Id))
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = firstBudgetAchievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            return await SaveAchievementsAsync(newAchievements, userId);
        }

        public async Task<List<UserAchievement>> CheckSavingsAchievementsAsync(string userId)
        {
            var newAchievements = new List<UserAchievement>();

            var savingsGoals = await _context.SavingsGoals
                .Where(sg => sg.UserId == userId)
                .ToListAsync();

            var goalCount = savingsGoals.Count;
            var totalSaved = savingsGoals.Sum(sg => sg.CurrentAmount);
            var achievedGoals = savingsGoals.Count(sg => sg.IsAchieved);

            // First savings goal
            var firstGoalAchievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Code == "FIRST_SAVINGS_GOAL" && a.IsActive);

            if (firstGoalAchievement != null && goalCount >= 1)
            {
                if (!await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == firstGoalAchievement.Id))
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = firstGoalAchievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            // Goal achieved
            var goalAchievedAchievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Code == "SAVINGS_GOAL_ACHIEVED" && a.IsActive);

            if (goalAchievedAchievement != null && achievedGoals >= 1)
            {
                if (!await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == goalAchievedAchievement.Id))
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = goalAchievedAchievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            // Savings amount achievements
            var savingsAmountAchievements = await _context.Achievements
                .Where(a => a.IsActive && a.Category == "savings" && a.CriteriaType == "amount")
                .ToListAsync();

            foreach (var achievement in savingsAmountAchievements)
            {
                if (await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == achievement.Id))
                    continue;

                var criteria = JsonSerializer.Deserialize<JsonObject>(achievement.CriteriaValue ?? "{}");
                var targetAmount = criteria?["amount"] != null 
                    ? criteria["amount"]!.GetValue<decimal>() 
                    : 0;

                if (totalSaved >= targetAmount)
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = achievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            return await SaveAchievementsAsync(newAchievements, userId);
        }

        public async Task<List<UserAchievement>> CheckLoanAchievementsAsync(string userId)
        {
            var newAchievements = new List<UserAchievement>();

            var settledLoans = await _context.Loans
                .CountAsync(l => l.UserId == userId && l.IsSettled);

            var loanSettledAchievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Code == "LOAN_SETTLED" && a.IsActive);

            if (loanSettledAchievement != null && settledLoans >= 1)
            {
                if (!await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == loanSettledAchievement.Id))
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = loanSettledAchievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            return await SaveAchievementsAsync(newAchievements, userId);
        }

        public async Task<List<UserAchievement>> CheckPartnershipAchievementsAsync(string userId)
        {
            var newAchievements = new List<UserAchievement>();

            // Convert userId string to Guid for comparison
            if (!Guid.TryParse(userId, out var userIdGuid))
            {
                return newAchievements; // Invalid user ID format
            }

            var hasPartnership = await _context.Partnerships
                .AnyAsync(p => (p.User1Id == userIdGuid || p.User2Id == userIdGuid) && p.Status == "active");

            var partnershipAchievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Code == "PARTNERSHIP_CREATED" && a.IsActive);

            if (partnershipAchievement != null && hasPartnership)
            {
                if (!await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == partnershipAchievement.Id))
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = partnershipAchievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            // Check shared expenses (transactions with paid_by field)
            var sharedExpenseCount = await _context.Transactions
                .CountAsync(t => t.UserId == userId && !string.IsNullOrEmpty(t.PaidBy));

            var sharedExpenseAchievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Code == "SHARED_EXPENSES_10" && a.IsActive);

            if (sharedExpenseAchievement != null && sharedExpenseCount >= 10)
            {
                if (!await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == sharedExpenseAchievement.Id))
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = sharedExpenseAchievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            return await SaveAchievementsAsync(newAchievements, userId);
        }

        public Task<List<UserAchievement>> CheckConsistencyAchievementsAsync(string userId)
        {
            // Login streak checking would require tracking login dates
            // For now, return empty list - can be enhanced later
            return Task.FromResult(new List<UserAchievement>());
        }

        public async Task<List<UserAchievement>> CheckMilestoneAchievementsAsync(string userId)
        {
            var newAchievements = new List<UserAchievement>();

            var totalTransactions = await _context.Transactions
                .CountAsync(t => t.UserId == userId);

            var totalSaved = await _context.SavingsGoals
                .Where(sg => sg.UserId == userId)
                .SumAsync(sg => (decimal?)sg.CurrentAmount) ?? 0;

            // Get all milestone achievements
            var milestones = await _context.Achievements
                .Where(a => a.IsActive && a.Category == "milestone")
                .ToListAsync();

            foreach (var achievement in milestones)
            {
                // Skip if already unlocked
                if (await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == achievement.Id))
                    continue;

                bool criteriaMet = false;
                var criteria = JsonSerializer.Deserialize<JsonObject>(achievement.CriteriaValue ?? "{}");
                var type = criteria?["type"]?.ToString() ?? "";

                if (type == "transaction" && achievement.CriteriaType == "count")
                {
                    var targetCount = criteria?["count"] != null 
                        ? criteria["count"]!.GetValue<int>() 
                        : 0;
                    
                    if (totalTransactions >= targetCount)
                        criteriaMet = true;
                }
                else if (type == "savings" && achievement.CriteriaType == "amount")
                {
                    var targetAmount = criteria?["amount"] != null 
                        ? criteria["amount"]!.GetValue<decimal>() 
                        : 0;
                        
                    if (totalSaved >= targetAmount)
                        criteriaMet = true;
                }

                if (criteriaMet)
                {
                    var userAchievement = new UserAchievement
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        AchievementId = achievement.Id,
                        Progress = 100,
                        UnlockedAt = DateTime.UtcNow
                    };
                    newAchievements.Add(userAchievement);
                    await _context.UserAchievements.AddAsync(userAchievement);
                }
            }

            return await SaveAchievementsAsync(newAchievements, userId);
        }

        public async Task<List<UserAchievement>> CheckAllAchievementsAsync(string userId)
        {
            var allNewAchievements = new List<UserAchievement>();

            allNewAchievements.AddRange(await CheckTransactionAchievementsAsync(userId));
            allNewAchievements.AddRange(await CheckBudgetAchievementsAsync(userId));
            allNewAchievements.AddRange(await CheckSavingsAchievementsAsync(userId));
            allNewAchievements.AddRange(await CheckLoanAchievementsAsync(userId));
            allNewAchievements.AddRange(await CheckPartnershipAchievementsAsync(userId));
            allNewAchievements.AddRange(await CheckConsistencyAchievementsAsync(userId));
            allNewAchievements.AddRange(await CheckMilestoneAchievementsAsync(userId));

            return allNewAchievements;
        }

        public async Task<List<UserAchievement>> GetUserAchievementsAsync(string userId)
        {
            return await _context.UserAchievements
                .Include(ua => ua.Achievement)
                .Where(ua => ua.UserId == userId)
                .OrderByDescending(ua => ua.UnlockedAt)
                .ToListAsync();
        }

        public async Task<List<AchievementProgressDto>> GetUserAchievementProgressAsync(string userId)
        {
            var allAchievements = await _context.Achievements
                .Where(a => a.IsActive)
                .OrderBy(a => a.SortOrder)
                .ThenBy(a => a.Category)
                .ToListAsync();

            var userAchievements = await _context.UserAchievements
                .Where(ua => ua.UserId == userId)
                .ToListAsync();

            var progressList = new List<AchievementProgressDto>();

            foreach (var achievement in allAchievements)
            {
                var userAchievement = userAchievements.FirstOrDefault(ua => ua.AchievementId == achievement.Id);
                
                progressList.Add(new AchievementProgressDto
                {
                    Achievement = achievement,
                    UserAchievement = userAchievement,
                    Progress = userAchievement?.Progress ?? 0,
                    IsUnlocked = userAchievement != null
                });
            }

            return progressList;
        }

        public async Task<List<UserAchievement>> GetUnnotifiedAchievementsAsync(string userId)
        {
            return await _context.UserAchievements
                .Include(ua => ua.Achievement)
                .Where(ua => ua.UserId == userId && !ua.IsNotified)
                .OrderByDescending(ua => ua.UnlockedAt)
                .ToListAsync();
        }

        public async Task MarkAchievementsAsNotifiedAsync(List<Guid> userAchievementIds)
        {
            var achievements = await _context.UserAchievements
                .Where(ua => userAchievementIds.Contains(ua.Id))
                .ToListAsync();

            foreach (var achievement in achievements)
            {
                achievement.IsNotified = true;
            }

            await _context.SaveChangesAsync();
        }
    }
}

