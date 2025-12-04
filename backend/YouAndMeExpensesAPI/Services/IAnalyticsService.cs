using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for analytics service
    /// </summary>
    public interface IAnalyticsService
    {
        Task<FinancialAnalyticsDTO> GetFinancialAnalyticsAsync(string userId, DateTime startDate, DateTime endDate);
        Task<LoanAnalyticsDTO> GetLoanAnalyticsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null);
        Task<HouseholdAnalyticsDTO> GetHouseholdAnalyticsAsync(string userId);
        Task<ComparativeAnalyticsDTO> GetComparativeAnalyticsAsync(string userId, DateTime startDate, DateTime endDate);
        Task<DashboardAnalyticsDTO> GetDashboardAnalyticsAsync(string userId);
    }
}

