using Paire.Modules.Analytics.Core.DTOs;

namespace Paire.Modules.Analytics.Core.Interfaces;

public interface IAnalyticsService
{
    Task<FinancialAnalyticsDTO> GetFinancialAnalyticsAsync(string userId, DateTime startDate, DateTime endDate);
    Task<LoanAnalyticsDTO> GetLoanAnalyticsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null);
    Task<HouseholdAnalyticsDTO> GetHouseholdAnalyticsAsync(string userId);
    Task<ComparativeAnalyticsDTO> GetComparativeAnalyticsAsync(string userId, DateTime startDate, DateTime endDate);
    Task<DashboardAnalyticsDTO> GetDashboardAnalyticsAsync(string userId);
    Task<FinancialMonthSummaryDTO> GetFinancialMonthSummaryAsync(string userId, int year, int month);
}
