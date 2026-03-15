using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Entities;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Analytics.Infrastructure;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Analytics.Core.Services;

public class FinancialHealthService : IFinancialHealthService
{
    private readonly AnalyticsDbContext _analyticsContext;
    private readonly FinanceDbContext _financeContext;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly ILogger<FinancialHealthService> _logger;

    private const double BudgetAdherenceWeight = 0.25, SavingsRateWeight = 0.25, DebtHealthWeight = 0.20, ExpenseConsistencyWeight = 0.15, GoalProgressWeight = 0.15;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    public FinancialHealthService(AnalyticsDbContext analyticsContext, FinanceDbContext financeContext, IPartnershipResolver partnershipResolver, ILogger<FinancialHealthService> logger)
    {
        _analyticsContext = analyticsContext;
        _financeContext = financeContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<FinancialHealthScore> CalculateScoreAsync(string userId)
    {
        var period = DateTime.UtcNow.ToString("yyyy-MM");
        var existing = await _analyticsContext.FinancialHealthScores.FirstOrDefaultAsync(s => s.UserId == userId && s.Period == period);
        if (existing != null && DateTime.UtcNow - existing.CalculatedAt < CacheDuration) return existing;

        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var budgetAdherenceScore = await CalculateBudgetAdherenceAsync(userId, startOfMonth);
        var savingsRateScore = await CalculateSavingsRateAsync(userId, startOfMonth);
        var debtHealthScore = await CalculateDebtHealthAsync(userId, startOfMonth);
        var expenseConsistencyScore = await CalculateExpenseConsistencyAsync(userId, startOfMonth);
        var goalProgressScore = await CalculateGoalProgressAsync(userId);

        var overallScore = (int)Math.Round(budgetAdherenceScore * BudgetAdherenceWeight + savingsRateScore * SavingsRateWeight + debtHealthScore * DebtHealthWeight + expenseConsistencyScore * ExpenseConsistencyWeight + goalProgressScore * GoalProgressWeight);
        overallScore = Math.Clamp(overallScore, 0, 100);

        var components = new[] { ("BudgetAdherence", budgetAdherenceScore), ("SavingsRate", savingsRateScore), ("DebtHealth", debtHealthScore), ("ExpenseConsistency", expenseConsistencyScore), ("GoalProgress", goalProgressScore) };
        var tips = GenerateTips(components);

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
            await _analyticsContext.SaveChangesAsync();
            return existing;
        }

        var score = new FinancialHealthScore { Id = Guid.NewGuid(), UserId = userId, OverallScore = overallScore, BudgetAdherenceScore = budgetAdherenceScore, SavingsRateScore = savingsRateScore, DebtHealthScore = debtHealthScore, ExpenseConsistencyScore = expenseConsistencyScore, GoalProgressScore = goalProgressScore, Tips = tips, Period = period, CalculatedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        _analyticsContext.FinancialHealthScores.Add(score);
        await _analyticsContext.SaveChangesAsync();
        return score;
    }

    public async Task<FinancialHealthScore?> GetCurrentScoreAsync(string userId)
    {
        var period = DateTime.UtcNow.ToString("yyyy-MM");
        return await _analyticsContext.FinancialHealthScores.FirstOrDefaultAsync(s => s.UserId == userId && s.Period == period);
    }

    public async Task<List<FinancialHealthScore>> GetScoreHistoryAsync(string userId, int months = 6)
    {
        var cutoffPeriod = DateTime.UtcNow.AddMonths(-months).ToString("yyyy-MM");
        return await _analyticsContext.FinancialHealthScores
            .Where(s => s.UserId == userId && string.Compare(s.Period, cutoffPeriod) >= 0)
            .OrderByDescending(s => s.Period)
            .Take(months)
            .ToListAsync();
    }

    public async Task<object?> GetPartnershipScoreAsync(string userId)
    {
        var partnerId = await _partnershipResolver.GetPartnerUserIdAsync(userId);
        if (partnerId == null) return null;

        var userScore = await CalculateScoreAsync(userId);
        var partnerScore = await CalculateScoreAsync(partnerId);
        var combinedScore = Math.Clamp((int)Math.Round((userScore.OverallScore + partnerScore.OverallScore) / 2.0), 0, 100);

        return new { userScore = new { userScore.Id, userScore.UserId, userScore.OverallScore, userScore.BudgetAdherenceScore, userScore.SavingsRateScore, userScore.DebtHealthScore, userScore.ExpenseConsistencyScore, userScore.GoalProgressScore, userScore.Tips, userScore.Period, userScore.CalculatedAt }, partnerScore = new { partnerScore.Id, partnerScore.UserId, partnerScore.OverallScore, partnerScore.BudgetAdherenceScore, partnerScore.SavingsRateScore, partnerScore.DebtHealthScore, partnerScore.ExpenseConsistencyScore, partnerScore.GoalProgressScore, partnerScore.Tips, partnerScore.Period, partnerScore.CalculatedAt }, combinedScore, period = userScore.Period };
    }

    private async Task<int> CalculateBudgetAdherenceAsync(string userId, DateTime startOfMonth)
    {
        var budgets = await _financeContext.Budgets.Where(b => b.UserId == userId && b.IsActive && b.StartDate <= DateTime.UtcNow && (b.EndDate == null || b.EndDate >= startOfMonth)).ToListAsync();
        if (budgets.Count == 0) return 100;
        return Math.Clamp((int)Math.Round((double)budgets.Count(b => b.SpentAmount <= b.Amount) / budgets.Count * 100), 0, 100);
    }

    private async Task<int> CalculateSavingsRateAsync(string userId, DateTime startOfMonth)
    {
        var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);
        var income = await _financeContext.Transactions.Where(t => t.UserId == userId && t.Type == "income" && t.Date >= startOfMonth && t.Date <= endOfMonth).SumAsync(t => t.Amount);
        var expenses = await _financeContext.Transactions.Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= startOfMonth && t.Date <= endOfMonth).SumAsync(t => t.Amount);
        if (income <= 0) return expenses <= 0 ? 100 : 0;
        var savingsRate = (double)((income - expenses) / income) * 100;
        var score = savingsRate < -50 ? 0 : savingsRate < 0 ? (int)Math.Round(50 + savingsRate) : savingsRate >= 50 ? 100 : (int)Math.Round(50 + savingsRate);
        return Math.Clamp(score, 0, 100);
    }

    private async Task<int> CalculateDebtHealthAsync(string userId, DateTime startOfMonth)
    {
        var loans = await _financeContext.Loans.Where(l => l.UserId == userId).ToListAsync();
        if (loans.Count == 0) return 100;
        var settledRatio = (double)loans.Count(l => l.IsSettled) / loans.Count;
        var totalDebt = loans.Where(l => !l.IsSettled).Sum(l => l.RemainingAmount);
        var income = await _financeContext.Transactions.Where(t => t.UserId == userId && t.Type == "income" && t.Date >= startOfMonth).SumAsync(t => t.Amount);
        var debtToIncome = income > 0 ? (double)(totalDebt / income) : (totalDebt > 0 ? 1.0 : 0);
        var debtScore = debtToIncome <= 0 ? 100 : debtToIncome <= 0.3 ? 90 : debtToIncome <= 0.5 ? 75 : debtToIncome <= 1.0 ? 50 : debtToIncome <= 2.0 ? 25 : 0;
        return Math.Clamp((int)Math.Round(settledRatio * 50 + (debtScore / 100.0) * 50), 0, 100);
    }

    private async Task<int> CalculateExpenseConsistencyAsync(string userId, DateTime startOfMonth)
    {
        var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);
        var dailyTotals = await _financeContext.Transactions.Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= startOfMonth && t.Date <= endOfMonth).GroupBy(t => t.Date.Date).Select(g => g.Sum(t => t.Amount)).ToListAsync();
        if (dailyTotals.Count == 0) return 100;
        var mean = dailyTotals.Average(x => (double)x);
        var stdDev = Math.Sqrt(dailyTotals.Average(x => Math.Pow((double)x - mean, 2)));
        var cv = mean > 0 ? stdDev / mean : 0;
        var score = cv <= 0.2 ? 100 : cv <= 0.5 ? 80 : cv <= 1.0 ? 60 : cv <= 2.0 ? 40 : Math.Max(0, 100 - (int)(cv * 20));
        return Math.Clamp(score, 0, 100);
    }

    private async Task<int> CalculateGoalProgressAsync(string userId)
    {
        var goals = await _financeContext.SavingsGoals.Where(g => g.UserId == userId && !g.IsAchieved && g.TargetAmount > 0).ToListAsync();
        if (goals.Count == 0) return 100;
        return Math.Clamp((int)Math.Round(goals.Average(g => (double)(g.CurrentAmount / g.TargetAmount)) * 100), 0, 100);
    }

    private static string GenerateTips((string Name, int Score)[] components)
    {
        var weak = components.OrderBy(c => c.Score).Take(2).Where(c => c.Score < 70).Select(c => c.Name).ToList();
        if (weak.Count == 0) return "Your financial health looks great! Keep up the good habits.";
        var tips = weak.Select(name => name switch { "BudgetAdherence" => "Try to stay within your budget limits.", "SavingsRate" => "Aim to save more each month.", "DebtHealth" => "Focus on paying down debt.", "ExpenseConsistency" => "Your spending varies a lot day to day.", "GoalProgress" => "Boost your savings goals.", _ => $"Consider improving your {name} component." }).ToList();
        return string.Join(" ", tips);
    }
}
