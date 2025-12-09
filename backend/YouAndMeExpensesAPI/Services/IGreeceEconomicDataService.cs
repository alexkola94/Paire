using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for Greece Economic Data service
    /// Fetches economic data from external Greek government APIs
    /// </summary>
    public interface IGreeceEconomicDataService
    {
        /// <summary>
        /// Get Consumer Price Index (CPI) data
        /// </summary>
        /// <returns>CPI data with current rate and trend</returns>
        Task<CPIDataDTO> GetCPIDataAsync();

        /// <summary>
        /// Get food price data from supermarkets
        /// </summary>
        /// <returns>Food prices data by category</returns>
        Task<FoodPricesDataDTO> GetFoodPricesAsync();

        /// <summary>
        /// Get economic indicators summary
        /// </summary>
        /// <returns>Economic indicators including GDP, unemployment, inflation, household income</returns>
        Task<EconomicIndicatorsDTO> GetEconomicIndicatorsAsync();

        /// <summary>
        /// Get latest economic news articles from Greece
        /// </summary>
        /// <returns>Latest news articles about Greek economy</returns>
        Task<NewsDataDTO> GetNewsAsync();

        /// <summary>
        /// Get all economic data at once
        /// </summary>
        /// <returns>Combined data from all sources</returns>
        Task<GreeceEconomicDataDTO> GetAllDataAsync();
    }
}

