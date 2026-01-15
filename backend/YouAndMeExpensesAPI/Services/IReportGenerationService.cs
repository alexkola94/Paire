using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for generating downloadable reports (CSV, PDF)
    /// Provides financial analytics reports for chatbot users
    /// </summary>
    public interface IReportGenerationService
    {
        /// <summary>
        /// Generate a CSV report based on parameters
        /// </summary>
        Task<(byte[] Data, string FileName)> GenerateCsvReportAsync(string userId, GenerateReportRequest request);

        /// <summary>
        /// Generate a PDF report based on parameters
        /// </summary>
        Task<(byte[] Data, string FileName)> GeneratePdfReportAsync(string userId, GenerateReportRequest request);

        /// <summary>
        /// Get list of available report types
        /// </summary>
        List<string> GetAvailableReportTypes();
    }
}
