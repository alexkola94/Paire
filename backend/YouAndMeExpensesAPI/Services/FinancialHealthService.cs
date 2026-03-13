using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class FinancialHealthService : IFinancialHealthService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FinancialHealthService> _logger;

        private const double BudgetAdherenceWeight = 0.25;
        private const double SavingsRateWeight = 0.25;
        private const double DebtHealthWeight = 0.20;
        private const double ExpenseConsistencyWeight = 0.15;
        private const double GoalProgressWeight = 0.15;

        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

        public FinancialHealthService(AppDbContext context, ILogger<FinancialHealthService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<FinancialHealthScore> CalculateScoreAsync(string userId)
        {
            var period = DateTime.UtcNow.ToString("yyyy-MM");

            // Check for cached score (within 24h)
            var existing = await _context.FinancialHealthScores
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Period == period);

            if (existing != null && DateTime.UtcNow - existing.CalculatedAt < CacheDuration)
            {
                _logger.LogDebug("Returning cached financial health score for user {UserId}, period {Period}", userId, period);
                return existing;
            }

            var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // 1. Budget Adherence (25%)
            var budgetAdherenceScore = await CalculateBudgetAdherenceAsync(userId, startOfMonth);

            // 2. Savings Rate (25%)
            var savingsRateScore = await CalculateSavingsRateAsync(userId, startOfMonth);

            // 3. Debt Health (20%)
            var debtHealthScore = await CalculateDebtHealthAsync(userId, startOfMonth);

            // 4. Expense Consistency (15%)
            var expenseConsistencyScore = await CalculateExpenseConsistencyAsync(userId, startOfMonth);

            // 5. Goal Progress (15%)
            var goalProgressScore = await CalculateGoalProgressAsync(userId);

            var overallScore = (int)Math.Round(
                budgetAdherenceScore * BudgetAdherenceWeight +
                savingsRateScore * SavingsRateWeight +
                debtHealthScore * DebtHealthWeight +
                expenseConsistencyScore * ExpenseConsistencyWeight +
                goalProgressScore * GoalProgressWeight);

            overallScore = Math.Clamp(overallScore, 0, 100);

            var componentScores = new[]
            {
                (Name: "BudgetAdherence", Score: budgetAdherenceScore),
                (Name: "SavingsRate", Score: savingsRateScore),
                (Name: "DebtHealth", Score: debtHealthScore),
                (Name: "ExpenseConsistency", Score: expenseConsistencyScore),
                (Name: "GoalProgress", Score: goalProgressScore)
            };

            var tips = GenerateTips(componentScores);

            if (existing != null)
            {
                existing.OverallScore = overallScore;
                existing.BudgetAdherenceScore = budgetAdherenceScore;
                existing.SavingsRateScore = savingsRateScore;
                existing.DebtHealthScore = debtHealthScore;
                existing.ExpenseConsistencyScore = expenseConsistencyScore;
                existing.GoalProgressScore = goalProgressScore;
                existing.Tips = tips;
                existing.CalculatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Updated financial health score for user {UserId}, period {Period}: {Score}", userId, period, overallScore);
                return existing;
            }

            var score = new FinancialHealthScore
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                OverallScore = overallScore,
                BudgetAdherenceScore = budgetAdherenceScore,
                SavingsRateScore = savingsRateScore,
                DebtHealthScore = debtHealthScore,
                ExpenseConsistencyScore = expenseConsistencyScore,
                GoalProgressScore = goalProgressScore,
                Tips = tips,
                Period = period,
                CalculatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.FinancialHealthScores.Add(score);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created financial health score for user {UserId}, period {Period}: {Score}", userId, period, overallScore);
            return score;
        }

        public async Task<FinancialHealthScore?> GetCurrentScoreAsync(string userId)
        {
            var period = DateTime.UtcNow.ToString("yyyy-MM");
            return await _context.FinancialHealthScores
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Period == period);
        }

        public async Task<List<FinancialHealthScore>> GetScoreHistoryAsync(string userId, int months = 6)
        {
            var cutoff = DateTime.UtcNow.AddMonths(-months);
            var cutoffPeriod = cutoff.ToString("yyyy-MM");

            return await _context.FinancialHealthScores
                .Where(s => s.UserId == userId && string.Compare(s.Period, cutoffPeriod, StringComparison.Ordinal) >= 0)
                .OrderByDescending(s => s.Period)
                .Take(months)
                .ToListAsync();
        }

        public async Task<object?> GetPartnershipScoreAsync(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
                return null;

            var partnership = await _context.Partnerships
                .FirstOrDefaultAsync(p =>
                    p.Status == "active" &&
                    (p.User1Id == userGuid || p.User2Id == userGuid));

            if (partnership == null)
                return null;

            var partnerId = partnership.User1Id == userGuid
                ? partnership.User2Id.ToString()
                : partnership.User1Id.ToString();

            var userScore = await CalculateScoreAsync(userId);
            var partnerScore = await CalculateScoreAsync(partnerId);

            var combinedScore = (int)Math.Round((userScore.OverallScore + partnerScore.OverallScore) / 2.0);
            combinedScore = Math.Clamp(combinedScore, 0, 100);

            return new
            {
                userScore = new
                {
                    userScore.Id,
                    userScore.UserId,
                    userScore.OverallScore,
                    userScore.BudgetAdherenceScore,
                    userScore.SavingsRateScore,
                    userScore.DebtHealthScore,
                    userScore.ExpenseConsistencyScore,
                    userScore.GoalProgressScore,
                    userScore.Tips,
                    userScore.Period,
                    userScore.CalculatedAt
                },
                partnerScore = new
                {
                    partnerScore.Id,
                    partnerScore.UserId,
                    partnerScore.OverallScore,
                    partnerScore.BudgetAdherenceScore,
                    partnerScore.SavingsRateScore,
                    partnerScore.DebtHealthScore,
                    partnerScore.ExpenseConsistencyScore,
                    partnerScore.GoalProgressScore,
                    partnerScore.Tips,
                    partnerScore.Period,
                    partnerScore.CalculatedAt
                },
                combinedScore,
                period = userScore.Period
            };
        }

        private async Task<int> CalculateBudgetAdherenceAsync(string userId, DateTime startOfMonth)
        {
            var budgets = await _context.Budgets
                .Where(b => b.UserId == userId && b.IsActive &&
                    b.StartDate <= DateTime.UtcNow &&
                    (b.EndDate == null || b.EndDate >= startOfMonth))
                .ToListAsync();

            if (budgets.Count == 0)
                return 100; // No budgets = no violation

            var withinBudget = budgets.Count(b => b.SpentAmount <= b.Amount);
            var pct = (double)withinBudget / budgets.Count * 100;
            return Math.Clamp((int)Math.Round(pct), 0, 100);
        }

        private async Task<int> CalculateSavingsRateAsync(string userId, DateTime startOfMonth)
        {
            var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);

            var income = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "income" && t.Date >= startOfMonth && t.Date <= endOfMonth)
                .SumAsync(t => t.Amount);

            var expenses = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= startOfMonth && t.Date <= endOfMonth)
                .SumAsync(t => t.Amount);

            if (income <= 0)
                return expenses <= 0 ? 100 : 0;

            var savingsRate = (double)((income - expenses) / income) * 100;
            // Map: -50 or below = 0, 0% = 50, 50%+ = 100
            var score = savingsRate < -50 ? 0 :
                savingsRate < 0 ? (int)Math.Round(50 + savingsRate) :
                savingsRate >= 50 ? 100 : (int)Math.Round(50 + savingsRate);
            return Math.Clamp(score, 0, 100);
        }

        private async Task<int> CalculateDebtHealthAsync(string userId, DateTime startOfMonth)
        {
            var loans = await _context.Loans
                .Where(l => l.UserId == userId)
                .ToListAsync();

            if (loans.Count == 0)
                return 100;

            var settledCount = loans.Count(l => l.IsSettled);
            var settledRatio = (double)settledCount / loans.Count;

            var totalDebt = loans.Where(l => !l.IsSettled).Sum(l => l.RemainingAmount);
            var income = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "income" && t.Date >= startOfMonth)
                .SumAsync(t => t.Amount);

            var debtToIncome = income > 0 ? (double)(totalDebt / income) : (totalDebt > 0 ? 1.0 : 0);
            // Lower debt-to-income is better: 0 = 100, 0.5 = 75, 1 = 50, 2+ = 25
            var debtScore = debtToIncome <= 0 ? 100 :
                debtToIncome <= 0.3 ? 90 :
                debtToIncome <= 0.5 ? 75 :
                debtToIncome <= 1.0 ? 50 :
                debtToIncome <= 2.0 ? 25 : 0;

            var score = (int)Math.Round(settledRatio * 50 + (debtScore / 100.0) * 50);
            return Math.Clamp(score, 0, 100);
        }

        private async Task<int> CalculateExpenseConsistencyAsync(string userId, DateTime startOfMonth)
        {
            var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);

            var transactions = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= startOfMonth && t.Date <= endOfMonth)
                .Select(t => new { t.Date, t.Amount })
                .ToListAsync();

            var dailyTotals = transactions
                .GroupBy(t => t.Date.Date)
                .Select(g => g.Sum(t => t.Amount))
                .ToList();

            if (dailyTotals.Count == 0)
                return 100;

            var mean = dailyTotals.Average(x => (double)x);
            var variance = dailyTotals.Average(x => Math.Pow((double)x - mean, 2));
            var stdDev = Math.Sqrt(variance);

            // Lower std dev = better. Map: 0 = 100, high std dev = lower score
            // Use coefficient of variation if mean > 0, else raw std dev
            var cv = mean > 0 ? stdDev / mean : 0;
            var score = cv <= 0.2 ? 100 :
                cv <= 0.5 ? 80 :
                cv <= 1.0 ? 60 :
                cv <= 2.0 ? 40 : Math.Max(0, 100 - (int)(cv * 20));
            return Math.Clamp(score, 0, 100);
        }

        private async Task<int> CalculateGoalProgressAsync(string userId)
        {
            var goals = await _context.SavingsGoals
                .Where(g => g.UserId == userId && !g.IsAchieved && g.TargetAmount > 0)
                .ToListAsync();

            if (goals.Count == 0)
                return 100;

            var avgProgress = goals.Average(g => (double)(g.CurrentAmount / g.TargetAmount));
            var score = (int)Math.Round(avgProgress * 100);
            return Math.Clamp(score, 0, 100);
        }

        private static string GenerateTips((string Name, int Score)[] components)
        {
            var weak = components
                .OrderBy(c => c.Score)
                .Take(2)
                .Where(c => c.Score < 70)
                .Select(c => c.Name)
                .ToList();

            if (weak.Count == 0)
                return "Your financial health looks great! Keep up the good habits.";

            var tips = new List<string>();
            foreach (var name in weak)
            {
                tips.Add(name switch
                {
                    "BudgetAdherence" => "Try to stay within your budget limits. Review spending in categories where you overspent.",
                    "SavingsRate" => "Aim to save more each month. Even small increases in savings rate help build financial security.",
                    "DebtHealth" => "Focus on paying down debt. Consider the snowball or avalanche method to accelerate payoff.",
                    "ExpenseConsistency" => "Your spending varies a lot day to day. A more consistent pattern can help with planning.",
                    "GoalProgress" => "Boost your savings goals. Set up automatic transfers to make progress easier.",
                    _ => $"Consider improving your {name} component."
                });
            }

            return string.Join(" ", tips);
        }
    }
}
