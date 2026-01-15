using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Writer;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for generating downloadable reports (CSV, PDF)
    /// Provides financial analytics reports for chatbot users
    /// </summary>
    public class ReportGenerationService : IReportGenerationService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ReportGenerationService> _logger;

        // Available report types
        private static readonly List<string> _reportTypes = new()
        {
            "expenses_by_category",
            "monthly_summary",
            "income_vs_expenses",
            "all_transactions",
            "budget_status",
            "loans_summary",
            "savings_goals"
        };

        public ReportGenerationService(AppDbContext dbContext, ILogger<ReportGenerationService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Get list of available report types
        /// </summary>
        public List<string> GetAvailableReportTypes() => _reportTypes;

        /// <summary>
        /// Generate a CSV report based on parameters
        /// </summary>
        public async Task<(byte[] Data, string FileName)> GenerateCsvReportAsync(string userId, GenerateReportRequest request)
        {
            _logger.LogInformation("Generating CSV report: {ReportType} for user {UserId}", request.ReportType, userId);

            return request.ReportType switch
            {
                "expenses_by_category" => await GenerateExpensesByCategoryCsvAsync(userId, request),
                "monthly_summary" => await GenerateMonthlySummaryCsvAsync(userId, request),
                "income_vs_expenses" => await GenerateIncomeVsExpensesCsvAsync(userId, request),
                "all_transactions" => await GenerateAllTransactionsCsvAsync(userId, request),
                "budget_status" => await GenerateBudgetStatusCsvAsync(userId, request),
                "loans_summary" => await GenerateLoansSummaryCsvAsync(userId, request),
                "savings_goals" => await GenerateSavingsGoalsCsvAsync(userId, request),
                _ => throw new ArgumentException($"Unknown report type: {request.ReportType}")
            };
        }

        /// <summary>
        /// Generate a PDF report based on parameters
        /// </summary>
        public async Task<(byte[] Data, string FileName)> GeneratePdfReportAsync(string userId, GenerateReportRequest request)
        {
            _logger.LogInformation("Generating PDF report: {ReportType} for user {UserId}", request.ReportType, userId);

            return request.ReportType switch
            {
                "expenses_by_category" => await GenerateExpensesByCategoryPdfAsync(userId, request),
                "monthly_summary" => await GenerateMonthlySummaryPdfAsync(userId, request),
                "income_vs_expenses" => await GenerateIncomeVsExpensesPdfAsync(userId, request),
                "all_transactions" => await GenerateAllTransactionsPdfAsync(userId, request),
                "budget_status" => await GenerateBudgetStatusPdfAsync(userId, request),
                "loans_summary" => await GenerateLoansSummaryPdfAsync(userId, request),
                "savings_goals" => await GenerateSavingsGoalsPdfAsync(userId, request),
                _ => throw new ArgumentException($"Unknown report type: {request.ReportType}")
            };
        }

        // ============================================
        // CSV REPORT GENERATORS
        // ============================================

        /// <summary>
        /// Generate expenses by category CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateExpensesByCategoryCsvAsync(string userId, GenerateReportRequest request)
        {
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate)
                .ToListAsync();

            var categoryData = transactions
                .GroupBy(t => t.Category ?? "Uncategorized")
                .Select(g => new
                {
                    Category = g.Key,
                    TotalAmount = g.Sum(t => t.Amount),
                    TransactionCount = g.Count(),
                    AverageAmount = g.Average(t => t.Amount),
                    Percentage = transactions.Sum(t => t.Amount) > 0 
                        ? Math.Round((g.Sum(t => t.Amount) / transactions.Sum(t => t.Amount)) * 100, 2) 
                        : 0
                })
                .OrderByDescending(x => x.TotalAmount)
                .ToList();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Category", request.Language));
            csv.WriteField(GetLocalizedText("Total Amount (€)", request.Language));
            csv.WriteField(GetLocalizedText("Transaction Count", request.Language));
            csv.WriteField(GetLocalizedText("Average Amount (€)", request.Language));
            csv.WriteField(GetLocalizedText("Percentage (%)", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var item in categoryData)
            {
                csv.WriteField(item.Category);
                csv.WriteField(Math.Round(item.TotalAmount, 2));
                csv.WriteField(item.TransactionCount);
                csv.WriteField(Math.Round(item.AverageAmount, 2));
                csv.WriteField(item.Percentage);
                csv.NextRecord();
            }

            // Write totals
            csv.WriteField(GetLocalizedText("TOTAL", request.Language));
            csv.WriteField(Math.Round(transactions.Sum(t => t.Amount), 2));
            csv.WriteField(transactions.Count);
            csv.WriteField(transactions.Count > 0 ? Math.Round(transactions.Average(t => t.Amount), 2) : 0);
            csv.WriteField("100%");
            csv.NextRecord();

            await writer.FlushAsync();
            var fileName = $"expenses_by_category_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        /// <summary>
        /// Generate monthly summary CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateMonthlySummaryCsvAsync(string userId, GenerateReportRequest request)
        {
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate)
                .ToListAsync();

            var monthlyData = transactions
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                    Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                    Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount),
                    Balance = g.Where(t => t.Type == "income").Sum(t => t.Amount) - g.Where(t => t.Type == "expense").Sum(t => t.Amount),
                    TransactionCount = g.Count()
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToList();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Month", request.Language));
            csv.WriteField(GetLocalizedText("Income (€)", request.Language));
            csv.WriteField(GetLocalizedText("Expenses (€)", request.Language));
            csv.WriteField(GetLocalizedText("Balance (€)", request.Language));
            csv.WriteField(GetLocalizedText("Transactions", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var item in monthlyData)
            {
                csv.WriteField(item.MonthName);
                csv.WriteField(Math.Round(item.Income, 2));
                csv.WriteField(Math.Round(item.Expenses, 2));
                csv.WriteField(Math.Round(item.Balance, 2));
                csv.WriteField(item.TransactionCount);
                csv.NextRecord();
            }

            // Write totals
            csv.WriteField(GetLocalizedText("TOTAL", request.Language));
            csv.WriteField(Math.Round(monthlyData.Sum(m => m.Income), 2));
            csv.WriteField(Math.Round(monthlyData.Sum(m => m.Expenses), 2));
            csv.WriteField(Math.Round(monthlyData.Sum(m => m.Balance), 2));
            csv.WriteField(monthlyData.Sum(m => m.TransactionCount));
            csv.NextRecord();

            await writer.FlushAsync();
            var fileName = $"monthly_summary_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        /// <summary>
        /// Generate income vs expenses CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateIncomeVsExpensesCsvAsync(string userId, GenerateReportRequest request)
        {
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate)
                .ToListAsync();

            var groupBy = request.GroupBy ?? "month";
            var groupedData = groupBy switch
            {
                "day" => transactions.GroupBy(t => t.Date.Date).Select(g => new
                {
                    Period = g.Key.ToString("yyyy-MM-dd"),
                    Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                    Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount)
                }).OrderBy(x => x.Period).ToList(),
                
                "week" => transactions.GroupBy(t => new { Year = t.Date.Year, Week = GetIso8601WeekOfYear(t.Date) }).Select(g => new
                {
                    Period = $"{g.Key.Year}-W{g.Key.Week:D2}",
                    Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                    Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount)
                }).OrderBy(x => x.Period).ToList(),
                
                _ => transactions.GroupBy(t => new { t.Date.Year, t.Date.Month }).Select(g => new
                {
                    Period = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                    Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                    Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount)
                }).OrderBy(x => x.Period).ToList()
            };

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Period", request.Language));
            csv.WriteField(GetLocalizedText("Income (€)", request.Language));
            csv.WriteField(GetLocalizedText("Expenses (€)", request.Language));
            csv.WriteField(GetLocalizedText("Net (€)", request.Language));
            csv.WriteField(GetLocalizedText("Savings Rate (%)", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var item in groupedData)
            {
                var net = item.Income - item.Expenses;
                var savingsRate = item.Income > 0 ? Math.Round((net / item.Income) * 100, 1) : 0;
                
                csv.WriteField(item.Period);
                csv.WriteField(Math.Round(item.Income, 2));
                csv.WriteField(Math.Round(item.Expenses, 2));
                csv.WriteField(Math.Round(net, 2));
                csv.WriteField(savingsRate);
                csv.NextRecord();
            }

            await writer.FlushAsync();
            var fileName = $"income_vs_expenses_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        /// <summary>
        /// Generate all transactions CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateAllTransactionsCsvAsync(string userId, GenerateReportRequest request)
        {
            var query = _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate);

            // Filter by category if specified
            if (!string.IsNullOrEmpty(request.Category) && request.Category.ToLower() != "all")
            {
                query = query.Where(t => t.Category != null && t.Category.ToLower().Contains(request.Category.ToLower()));
            }

            var transactions = await query.OrderByDescending(t => t.Date).ToListAsync();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Date", request.Language));
            csv.WriteField(GetLocalizedText("Type", request.Language));
            csv.WriteField(GetLocalizedText("Category", request.Language));
            csv.WriteField(GetLocalizedText("Description", request.Language));
            csv.WriteField(GetLocalizedText("Amount (€)", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var t in transactions)
            {
                csv.WriteField(t.Date.ToString("yyyy-MM-dd"));
                csv.WriteField(GetLocalizedText(t.Type == "income" ? "Income" : "Expense", request.Language));
                csv.WriteField(t.Category ?? "");
                csv.WriteField(t.Description ?? "");
                csv.WriteField(Math.Round(t.Amount, 2));
                csv.NextRecord();
            }

            await writer.FlushAsync();
            var fileName = $"transactions_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        /// <summary>
        /// Generate budget status CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateBudgetStatusCsvAsync(string userId, GenerateReportRequest request)
        {
            var budgets = await _dbContext.Budgets
                .Where(b => b.UserId == userId && b.IsActive)
                .ToListAsync();

            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= monthStart)
                .ToListAsync();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Category", request.Language));
            csv.WriteField(GetLocalizedText("Budget Limit (€)", request.Language));
            csv.WriteField(GetLocalizedText("Spent (€)", request.Language));
            csv.WriteField(GetLocalizedText("Remaining (€)", request.Language));
            csv.WriteField(GetLocalizedText("Usage (%)", request.Language));
            csv.WriteField(GetLocalizedText("Status", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var budget in budgets)
            {
                var spent = transactions
                    .Where(t => t.Category != null && t.Category.ToLower().Contains(budget.Category.ToLower()))
                    .Sum(t => t.Amount);
                var remaining = budget.Amount - spent;
                var usage = budget.Amount > 0 ? Math.Round((spent / budget.Amount) * 100, 1) : 0;
                var status = usage >= 100 ? "Over Budget" : (usage >= 80 ? "Warning" : "On Track");

                csv.WriteField(budget.Category);
                csv.WriteField(Math.Round(budget.Amount, 2));
                csv.WriteField(Math.Round(spent, 2));
                csv.WriteField(Math.Round(remaining, 2));
                csv.WriteField(usage);
                csv.WriteField(GetLocalizedText(status, request.Language));
                csv.NextRecord();
            }

            await writer.FlushAsync();
            var fileName = $"budget_status_{DateTime.UtcNow:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        /// <summary>
        /// Generate loans summary CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateLoansSummaryCsvAsync(string userId, GenerateReportRequest request)
        {
            var loans = await _dbContext.Loans
                .Where(l => l.UserId == userId)
                .ToListAsync();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Loan Name", request.Language));
            csv.WriteField(GetLocalizedText("Lender", request.Language));
            csv.WriteField(GetLocalizedText("Original Amount (€)", request.Language));
            csv.WriteField(GetLocalizedText("Remaining (€)", request.Language));
            csv.WriteField(GetLocalizedText("Monthly Payment (€)", request.Language));
            csv.WriteField(GetLocalizedText("Interest Rate (%)", request.Language));
            csv.WriteField(GetLocalizedText("Status", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var loan in loans)
            {
                csv.WriteField(loan.Description ?? "Loan");
                csv.WriteField(loan.LentBy ?? loan.BorrowedBy ?? "");
                csv.WriteField(Math.Round(loan.Amount, 2));
                csv.WriteField(Math.Round(loan.RemainingAmount, 2));
                csv.WriteField(Math.Round(loan.InstallmentAmount ?? 0, 2));
                csv.WriteField(loan.InterestRate ?? 0);
                csv.WriteField(GetLocalizedText(loan.IsSettled ? "Settled" : "Active", request.Language));
                csv.NextRecord();
            }

            // Write totals
            csv.WriteField(GetLocalizedText("TOTAL", request.Language));
            csv.WriteField("");
            csv.WriteField(Math.Round(loans.Sum(l => l.Amount), 2));
            csv.WriteField(Math.Round(loans.Where(l => !l.IsSettled).Sum(l => l.RemainingAmount), 2));
            csv.WriteField(Math.Round(loans.Where(l => !l.IsSettled).Sum(l => l.InstallmentAmount ?? 0), 2));
            csv.WriteField("");
            csv.WriteField("");
            csv.NextRecord();

            await writer.FlushAsync();
            var fileName = $"loans_summary_{DateTime.UtcNow:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        /// <summary>
        /// Generate savings goals CSV report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateSavingsGoalsCsvAsync(string userId, GenerateReportRequest request)
        {
            var goals = await _dbContext.SavingsGoals
                .Where(g => g.UserId == userId)
                .ToListAsync();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write header
            csv.WriteField(GetLocalizedText("Goal Name", request.Language));
            csv.WriteField(GetLocalizedText("Target Amount (€)", request.Language));
            csv.WriteField(GetLocalizedText("Current Amount (€)", request.Language));
            csv.WriteField(GetLocalizedText("Remaining (€)", request.Language));
            csv.WriteField(GetLocalizedText("Progress (%)", request.Language));
            csv.WriteField(GetLocalizedText("Target Date", request.Language));
            csv.WriteField(GetLocalizedText("Status", request.Language));
            csv.NextRecord();

            // Write data
            foreach (var goal in goals)
            {
                var remaining = goal.TargetAmount - goal.CurrentAmount;
                var progress = goal.TargetAmount > 0 ? Math.Round((goal.CurrentAmount / goal.TargetAmount) * 100, 1) : 0;
                var status = progress >= 100 ? "Completed" : (goal.TargetDate.HasValue && goal.TargetDate.Value < DateTime.UtcNow ? "Overdue" : "In Progress");

                csv.WriteField(goal.Name);
                csv.WriteField(Math.Round(goal.TargetAmount, 2));
                csv.WriteField(Math.Round(goal.CurrentAmount, 2));
                csv.WriteField(Math.Round(remaining, 2));
                csv.WriteField(progress);
                csv.WriteField(goal.TargetDate?.ToString("yyyy-MM-dd") ?? "No deadline");
                csv.WriteField(GetLocalizedText(status, request.Language));
                csv.NextRecord();
            }

            await writer.FlushAsync();
            var fileName = $"savings_goals_{DateTime.UtcNow:yyyyMMdd}.csv";
            return (memoryStream.ToArray(), fileName);
        }

        // ============================================
        // PDF REPORT GENERATORS
        // ============================================

        /// <summary>
        /// Generate expenses by category PDF report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateExpensesByCategoryPdfAsync(string userId, GenerateReportRequest request)
        {
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate)
                .ToListAsync();

            var categoryData = transactions
                .GroupBy(t => t.Category ?? "Uncategorized")
                .Select(g => new
                {
                    Category = g.Key,
                    TotalAmount = g.Sum(t => t.Amount),
                    TransactionCount = g.Count(),
                    Percentage = transactions.Sum(t => t.Amount) > 0 
                        ? Math.Round((g.Sum(t => t.Amount) / transactions.Sum(t => t.Amount)) * 100, 2) 
                        : 0
                })
                .OrderByDescending(x => x.TotalAmount)
                .ToList();

            var content = new StringBuilder();
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine(GetLocalizedText("EXPENSES BY CATEGORY REPORT", request.Language));
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine();
            content.AppendLine($"{GetLocalizedText("Period", request.Language)}: {request.StartDate:yyyy-MM-dd} - {request.EndDate:yyyy-MM-dd}");
            content.AppendLine($"{GetLocalizedText("Generated", request.Language)}: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine();

            foreach (var item in categoryData)
            {
                content.AppendLine($"📁 {item.Category}");
                content.AppendLine($"   {GetLocalizedText("Total", request.Language)}: €{item.TotalAmount:N2} ({item.Percentage}%)");
                content.AppendLine($"   {GetLocalizedText("Transactions", request.Language)}: {item.TransactionCount}");
                content.AppendLine();
            }

            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine($"{GetLocalizedText("TOTAL EXPENSES", request.Language)}: €{transactions.Sum(t => t.Amount):N2}");
            content.AppendLine($"{GetLocalizedText("TOTAL TRANSACTIONS", request.Language)}: {transactions.Count}");
            content.AppendLine("═══════════════════════════════════════════════════════════════");

            var pdfBytes = GenerateSimplePdf(content.ToString());
            var fileName = $"expenses_by_category_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.pdf";
            return (pdfBytes, fileName);
        }

        /// <summary>
        /// Generate monthly summary PDF report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateMonthlySummaryPdfAsync(string userId, GenerateReportRequest request)
        {
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate)
                .ToListAsync();

            var monthlyData = transactions
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .Select(g => new
                {
                    MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                    Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                    Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount),
                    Balance = g.Where(t => t.Type == "income").Sum(t => t.Amount) - g.Where(t => t.Type == "expense").Sum(t => t.Amount)
                })
                .OrderBy(x => x.MonthName)
                .ToList();

            var content = new StringBuilder();
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine(GetLocalizedText("MONTHLY FINANCIAL SUMMARY", request.Language));
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine();
            content.AppendLine($"{GetLocalizedText("Period", request.Language)}: {request.StartDate:yyyy-MM-dd} - {request.EndDate:yyyy-MM-dd}");
            content.AppendLine($"{GetLocalizedText("Generated", request.Language)}: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine();

            foreach (var item in monthlyData)
            {
                content.AppendLine($"📅 {item.MonthName}");
                content.AppendLine($"   📥 {GetLocalizedText("Income", request.Language)}: €{item.Income:N2}");
                content.AppendLine($"   📤 {GetLocalizedText("Expenses", request.Language)}: €{item.Expenses:N2}");
                content.AppendLine($"   💰 {GetLocalizedText("Balance", request.Language)}: €{item.Balance:N2}");
                content.AppendLine();
            }

            var totalIncome = monthlyData.Sum(m => m.Income);
            var totalExpenses = monthlyData.Sum(m => m.Expenses);
            var totalBalance = totalIncome - totalExpenses;

            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine($"{GetLocalizedText("TOTAL INCOME", request.Language)}: €{totalIncome:N2}");
            content.AppendLine($"{GetLocalizedText("TOTAL EXPENSES", request.Language)}: €{totalExpenses:N2}");
            content.AppendLine($"{GetLocalizedText("NET BALANCE", request.Language)}: €{totalBalance:N2}");
            content.AppendLine("═══════════════════════════════════════════════════════════════");

            var pdfBytes = GenerateSimplePdf(content.ToString());
            var fileName = $"monthly_summary_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.pdf";
            return (pdfBytes, fileName);
        }

        /// <summary>
        /// Generate income vs expenses PDF - delegates to monthly summary
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateIncomeVsExpensesPdfAsync(string userId, GenerateReportRequest request)
        {
            return await GenerateMonthlySummaryPdfAsync(userId, request);
        }

        /// <summary>
        /// Generate all transactions PDF report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateAllTransactionsPdfAsync(string userId, GenerateReportRequest request)
        {
            var query = _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .Where(t => t.Date >= request.StartDate && t.Date <= request.EndDate);

            if (!string.IsNullOrEmpty(request.Category) && request.Category.ToLower() != "all")
            {
                query = query.Where(t => t.Category != null && t.Category.ToLower().Contains(request.Category.ToLower()));
            }

            var transactions = await query.OrderByDescending(t => t.Date).Take(500).ToListAsync(); // Limit for PDF

            var content = new StringBuilder();
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine(GetLocalizedText("TRANSACTION HISTORY", request.Language));
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine();
            content.AppendLine($"{GetLocalizedText("Period", request.Language)}: {request.StartDate:yyyy-MM-dd} - {request.EndDate:yyyy-MM-dd}");
            if (!string.IsNullOrEmpty(request.Category) && request.Category.ToLower() != "all")
            {
                content.AppendLine($"{GetLocalizedText("Category Filter", request.Language)}: {request.Category}");
            }
            content.AppendLine($"{GetLocalizedText("Generated", request.Language)}: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine();

            foreach (var t in transactions)
            {
                var icon = t.Type == "income" ? "📥" : "📤";
                content.AppendLine($"{icon} {t.Date:yyyy-MM-dd} | {t.Category ?? "N/A"} | €{t.Amount:N2}");
                if (!string.IsNullOrEmpty(t.Description))
                {
                    content.AppendLine($"   {t.Description}");
                }
            }

            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine($"{GetLocalizedText("Total Transactions", request.Language)}: {transactions.Count}");
            content.AppendLine($"{GetLocalizedText("Total Income", request.Language)}: €{transactions.Where(t => t.Type == "income").Sum(t => t.Amount):N2}");
            content.AppendLine($"{GetLocalizedText("Total Expenses", request.Language)}: €{transactions.Where(t => t.Type == "expense").Sum(t => t.Amount):N2}");
            content.AppendLine("═══════════════════════════════════════════════════════════════");

            var pdfBytes = GenerateSimplePdf(content.ToString());
            var fileName = $"transactions_{request.StartDate:yyyyMMdd}_{request.EndDate:yyyyMMdd}.pdf";
            return (pdfBytes, fileName);
        }

        /// <summary>
        /// Generate budget status PDF report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateBudgetStatusPdfAsync(string userId, GenerateReportRequest request)
        {
            var budgets = await _dbContext.Budgets
                .Where(b => b.UserId == userId && b.IsActive)
                .ToListAsync();

            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= monthStart)
                .ToListAsync();

            var content = new StringBuilder();
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine(GetLocalizedText("BUDGET STATUS REPORT", request.Language));
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine();
            content.AppendLine($"{GetLocalizedText("Month", request.Language)}: {DateTime.UtcNow:MMMM yyyy}");
            content.AppendLine($"{GetLocalizedText("Generated", request.Language)}: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine();

            foreach (var budget in budgets)
            {
                var spent = transactions
                    .Where(t => t.Category != null && t.Category.ToLower().Contains(budget.Category.ToLower()))
                    .Sum(t => t.Amount);
                var remaining = budget.Amount - spent;
                var usage = budget.Amount > 0 ? Math.Round((spent / budget.Amount) * 100, 1) : 0;
                var statusIcon = usage >= 100 ? "🔴" : (usage >= 80 ? "🟡" : "🟢");

                content.AppendLine($"{statusIcon} {budget.Category}");
                content.AppendLine($"   {GetLocalizedText("Budget", request.Language)}: €{budget.Amount:N2}");
                content.AppendLine($"   {GetLocalizedText("Spent", request.Language)}: €{spent:N2} ({usage}%)");
                content.AppendLine($"   {GetLocalizedText("Remaining", request.Language)}: €{remaining:N2}");
                content.AppendLine();
            }

            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine($"🟢 = {GetLocalizedText("On Track", request.Language)} (<80%)");
            content.AppendLine($"🟡 = {GetLocalizedText("Warning", request.Language)} (80-100%)");
            content.AppendLine($"🔴 = {GetLocalizedText("Over Budget", request.Language)} (>100%)");
            content.AppendLine("═══════════════════════════════════════════════════════════════");

            var pdfBytes = GenerateSimplePdf(content.ToString());
            var fileName = $"budget_status_{DateTime.UtcNow:yyyyMMdd}.pdf";
            return (pdfBytes, fileName);
        }

        /// <summary>
        /// Generate loans summary PDF report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateLoansSummaryPdfAsync(string userId, GenerateReportRequest request)
        {
            var loans = await _dbContext.Loans
                .Where(l => l.UserId == userId)
                .ToListAsync();

            var content = new StringBuilder();
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine(GetLocalizedText("LOANS SUMMARY REPORT", request.Language));
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine();
            content.AppendLine($"{GetLocalizedText("Generated", request.Language)}: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine();

            foreach (var loan in loans)
            {
                var statusIcon = loan.IsSettled ? "✅" : "🔄";
                content.AppendLine($"{statusIcon} {loan.Description ?? "Loan"}");
                content.AppendLine($"   {GetLocalizedText("Lender", request.Language)}: {loan.LentBy ?? loan.BorrowedBy ?? "N/A"}");
                content.AppendLine($"   {GetLocalizedText("Original", request.Language)}: €{loan.Amount:N2}");
                content.AppendLine($"   {GetLocalizedText("Remaining", request.Language)}: €{loan.RemainingAmount:N2}");
                content.AppendLine($"   {GetLocalizedText("Monthly Payment", request.Language)}: €{(loan.InstallmentAmount ?? 0):N2}");
                content.AppendLine($"   {GetLocalizedText("Interest Rate", request.Language)}: {loan.InterestRate ?? 0}%");
                content.AppendLine();
            }

            var activeLoans = loans.Where(l => !l.IsSettled).ToList();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine($"{GetLocalizedText("Total Active Debt", request.Language)}: €{activeLoans.Sum(l => l.RemainingAmount):N2}");
            content.AppendLine($"{GetLocalizedText("Total Monthly Payments", request.Language)}: €{activeLoans.Sum(l => l.InstallmentAmount ?? 0):N2}");
            content.AppendLine("═══════════════════════════════════════════════════════════════");

            var pdfBytes = GenerateSimplePdf(content.ToString());
            var fileName = $"loans_summary_{DateTime.UtcNow:yyyyMMdd}.pdf";
            return (pdfBytes, fileName);
        }

        /// <summary>
        /// Generate savings goals PDF report
        /// </summary>
        private async Task<(byte[] Data, string FileName)> GenerateSavingsGoalsPdfAsync(string userId, GenerateReportRequest request)
        {
            var goals = await _dbContext.SavingsGoals
                .Where(g => g.UserId == userId)
                .ToListAsync();

            var content = new StringBuilder();
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine(GetLocalizedText("SAVINGS GOALS REPORT", request.Language));
            content.AppendLine("═══════════════════════════════════════════════════════════════");
            content.AppendLine();
            content.AppendLine($"{GetLocalizedText("Generated", request.Language)}: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            content.AppendLine();
            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine();

            foreach (var goal in goals)
            {
                var progress = goal.TargetAmount > 0 ? Math.Round((goal.CurrentAmount / goal.TargetAmount) * 100, 1) : 0;
                var statusIcon = progress >= 100 ? "🎉" : (progress >= 50 ? "📈" : "🎯");

                content.AppendLine($"{statusIcon} {goal.Name}");
                content.AppendLine($"   {GetLocalizedText("Target", request.Language)}: €{goal.TargetAmount:N2}");
                content.AppendLine($"   {GetLocalizedText("Current", request.Language)}: €{goal.CurrentAmount:N2}");
                content.AppendLine($"   {GetLocalizedText("Progress", request.Language)}: {progress}%");
                if (goal.TargetDate.HasValue)
                {
                    content.AppendLine($"   {GetLocalizedText("Target Date", request.Language)}: {goal.TargetDate:yyyy-MM-dd}");
                }
                content.AppendLine();
            }

            content.AppendLine("───────────────────────────────────────────────────────────────");
            content.AppendLine($"{GetLocalizedText("Total Saved", request.Language)}: €{goals.Sum(g => g.CurrentAmount):N2}");
            content.AppendLine($"{GetLocalizedText("Total Target", request.Language)}: €{goals.Sum(g => g.TargetAmount):N2}");
            content.AppendLine("═══════════════════════════════════════════════════════════════");

            var pdfBytes = GenerateSimplePdf(content.ToString());
            var fileName = $"savings_goals_{DateTime.UtcNow:yyyyMMdd}.pdf";
            return (pdfBytes, fileName);
        }

        // ============================================
        // HELPER METHODS
        // ============================================

        /// <summary>
        /// Generate a simple PDF from text content
        /// </summary>
        private byte[] GenerateSimplePdf(string content)
        {
            using var builder = new PdfDocumentBuilder();
            var page = builder.AddPage(PageSize.A4);

            // Use a standard font
            var font = builder.AddStandard14Font(UglyToad.PdfPig.Fonts.Standard14Fonts.Standard14Font.Helvetica);

            // Normalize line endings to avoid embedding carriage-return characters (0x0D)
            var normalizedContent = content
                .Replace("\r\n", "\n")
                .Replace("\r", "\n");

            var lines = normalizedContent.Split('\n');
            var yPosition = 800.0; // Start from top
            var lineHeight = 14.0;
            var fontSize = 10;

            foreach (var line in lines)
            {
                if (yPosition < 50) // Need new page
                {
                    page = builder.AddPage(PageSize.A4);
                    yPosition = 800.0;
                }

                // Handle empty lines
                if (string.IsNullOrWhiteSpace(line))
                {
                    yPosition -= lineHeight;
                    continue;
                }

                // Clean the line of any unsupported characters
                var cleanLine = CleanTextForPdf(line);
                
                page.AddText(cleanLine, fontSize, new UglyToad.PdfPig.Core.PdfPoint(40, yPosition), font);
                yPosition -= lineHeight;
            }

            return builder.Build();
        }

        /// <summary>
        /// Clean text for PDF (remove emojis and unsupported/special characters)
        /// </summary>
        private string CleanTextForPdf(string text)
        {
            // Replace common emojis with text equivalents
            var replacements = new Dictionary<string, string>
            {
                { "📁", "[CAT]" },
                { "📅", "[DATE]" },
                { "📥", "[IN]" },
                { "📤", "[OUT]" },
                { "💰", "[MONEY]" },
                { "📈", "[UP]" },
                { "📉", "[DOWN]" },
                { "📊", "[CHART]" },
                { "🔴", "[!]" },
                { "🟡", "[!]" },
                { "🟢", "[OK]" },
                { "✅", "[OK]" },
                { "🎉", "[!]" },
                { "🎯", "[TARGET]" },
                { "🔄", "[ACTIVE]" },
                { "═", "=" },
                { "─", "-" }
            };

            foreach (var (emoji, replacement) in replacements)
            {
                text = text.Replace(emoji, replacement);
            }

            // Remove any remaining non-ASCII characters
            var sb = new StringBuilder();
            foreach (var c in text)
            {
                // Keep printable ASCII characters only (32-126).
                // This drops control characters like carriage return (0x0D) that the font can't render.
                if (c >= 32 && c <= 126)
                {
                    sb.Append(c);
                }
            }

            return sb.ToString();
        }

        /// <summary>
        /// Get ISO week number
        /// </summary>
        private static int GetIso8601WeekOfYear(DateTime date)
        {
            var day = CultureInfo.InvariantCulture.Calendar.GetDayOfWeek(date);
            if (day >= DayOfWeek.Monday && day <= DayOfWeek.Wednesday)
            {
                date = date.AddDays(3);
            }
            return CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(date, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        }

        /// <summary>
        /// Get localized text
        /// </summary>
        private string GetLocalizedText(string key, string language)
        {
            if (language == "el")
            {
                return key switch
                {
                    "Category" => "Κατηγορία",
                    "Total Amount (€)" => "Συνολικό Ποσό (€)",
                    "Transaction Count" => "Αριθμός Συναλλαγών",
                    "Average Amount (€)" => "Μέσος Όρος (€)",
                    "Percentage (%)" => "Ποσοστό (%)",
                    "TOTAL" => "ΣΥΝΟΛΟ",
                    "Month" => "Μήνας",
                    "Income (€)" => "Έσοδα (€)",
                    "Expenses (€)" => "Έξοδα (€)",
                    "Balance (€)" => "Υπόλοιπο (€)",
                    "Transactions" => "Συναλλαγές",
                    "Period" => "Περίοδος",
                    "Net (€)" => "Καθαρό (€)",
                    "Savings Rate (%)" => "Ρυθμός Αποτ. (%)",
                    "Date" => "Ημερομηνία",
                    "Type" => "Τύπος",
                    "Description" => "Περιγραφή",
                    "Amount (€)" => "Ποσό (€)",
                    "Income" => "Έσοδα",
                    "Expense" => "Έξοδα",
                    "Budget Limit (€)" => "Όριο Προϋπ. (€)",
                    "Spent (€)" => "Δαπάνες (€)",
                    "Remaining (€)" => "Υπόλοιπο (€)",
                    "Usage (%)" => "Χρήση (%)",
                    "Status" => "Κατάσταση",
                    "On Track" => "Εντός Ορίου",
                    "Warning" => "Προσοχή",
                    "Over Budget" => "Υπέρβαση",
                    "Loan Name" => "Όνομα Δανείου",
                    "Lender" => "Δανειστής",
                    "Original Amount (€)" => "Αρχικό Ποσό (€)",
                    "Monthly Payment (€)" => "Μηνιαία Δόση (€)",
                    "Interest Rate (%)" => "Επιτόκιο (%)",
                    "Settled" => "Εξοφλημένο",
                    "Active" => "Ενεργό",
                    "Goal Name" => "Όνομα Στόχου",
                    "Target Amount (€)" => "Στόχος (€)",
                    "Current Amount (€)" => "Τρέχον (€)",
                    "Progress (%)" => "Πρόοδος (%)",
                    "Target Date" => "Ημ/νία Στόχου",
                    "Completed" => "Ολοκληρώθηκε",
                    "Overdue" => "Εκπρόθεσμο",
                    "In Progress" => "Σε Εξέλιξη",
                    "Generated" => "Δημιουργήθηκε",
                    "EXPENSES BY CATEGORY REPORT" => "ΑΝΑΦΟΡΑ ΕΞΟΔΩΝ ΑΝΑ ΚΑΤΗΓΟΡΙΑ",
                    "MONTHLY FINANCIAL SUMMARY" => "ΜΗΝΙΑΙΑ ΟΙΚΟΝΟΜΙΚΗ ΣΥΝΟΨΗ",
                    "TRANSACTION HISTORY" => "ΙΣΤΟΡΙΚΟ ΣΥΝΑΛΛΑΓΩΝ",
                    "BUDGET STATUS REPORT" => "ΑΝΑΦΟΡΑ ΚΑΤΑΣΤΑΣΗΣ ΠΡΟΫΠΟΛΟΓΙΣΜΟΥ",
                    "LOANS SUMMARY REPORT" => "ΑΝΑΦΟΡΑ ΣΥΝΟΨΗΣ ΔΑΝΕΙΩΝ",
                    "SAVINGS GOALS REPORT" => "ΑΝΑΦΟΡΑ ΣΤΟΧΩΝ ΑΠΟΤΑΜΙΕΥΣΗΣ",
                    "Total" => "Σύνολο",
                    "TOTAL EXPENSES" => "ΣΥΝΟΛΙΚΑ ΕΞΟΔΑ",
                    "TOTAL TRANSACTIONS" => "ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ",
                    "TOTAL INCOME" => "ΣΥΝΟΛΙΚΑ ΕΣΟΔΑ",
                    "NET BALANCE" => "ΚΑΘΑΡΟ ΥΠΟΛΟΙΠΟ",
                    "Category Filter" => "Φίλτρο Κατηγορίας",
                    "Total Transactions" => "Συνολικές Συναλλαγές",
                    "Total Income" => "Συνολικά Έσοδα",
                    "Total Expenses" => "Συνολικά Έξοδα",
                    "Budget" => "Προϋπολογισμός",
                    "Spent" => "Δαπάνες",
                    "Remaining" => "Υπόλοιπο",
                    "Original" => "Αρχικό",
                    "Monthly Payment" => "Μηνιαία Δόση",
                    "Interest Rate" => "Επιτόκιο",
                    "Total Active Debt" => "Συνολικό Ενεργό Χρέος",
                    "Total Monthly Payments" => "Συνολικές Μηνιαίες Πληρωμές",
                    "Target" => "Στόχος",
                    "Current" => "Τρέχον",
                    "Progress" => "Πρόοδος",
                    "Total Saved" => "Συνολική Αποταμίευση",
                    "Total Target" => "Συνολικός Στόχος",
                    _ => key
                };
            }
            return key;
        }
    }
}
