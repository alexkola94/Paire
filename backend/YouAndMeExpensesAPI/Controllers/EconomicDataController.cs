using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Economic Data API Controller
    /// Provides endpoints for fetching Greece economic data from external APIs
    /// All endpoints require authentication via JWT token
    /// </summary>
    [Route("api/[controller]")]
    public class EconomicDataController : BaseApiController
    {
        private readonly IGreeceEconomicDataService _economicDataService;
        private readonly ILogger<EconomicDataController> _logger;

        public EconomicDataController(
            IGreeceEconomicDataService economicDataService,
            ILogger<EconomicDataController> logger)
        {
            _economicDataService = economicDataService;
            _logger = logger;
        }

        /// <summary>
        /// Get Consumer Price Index (CPI) data
        /// </summary>
        /// <returns>CPI data with current rate and trend</returns>
        [HttpGet("cpi")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<IActionResult> GetCPI()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var cpiData = await _economicDataService.GetCPIDataAsync();
                return Ok(cpiData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching CPI data for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving CPI data", error = ex.Message });
            }
        }

        /// <summary>
        /// Get food price data from supermarkets
        /// </summary>
        /// <returns>Food prices data by category</returns>
        [HttpGet("food-prices")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<IActionResult> GetFoodPrices()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var foodPrices = await _economicDataService.GetFoodPricesAsync();
                return Ok(foodPrices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching food prices for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving food prices", error = ex.Message });
            }
        }

        /// <summary>
        /// Get economic indicators summary
        /// </summary>
        /// <returns>Economic indicators including GDP, unemployment, inflation, household income</returns>
        [HttpGet("indicators")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<IActionResult> GetIndicators()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var indicators = await _economicDataService.GetEconomicIndicatorsAsync();
                return Ok(indicators);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching economic indicators for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving economic indicators", error = ex.Message });
            }
        }

        /// <summary>
        /// Get latest economic news articles from Greece
        /// </summary>
        /// <returns>Latest news articles about Greek economy</returns>
        [HttpGet("news")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<IActionResult> GetNews()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var news = await _economicDataService.GetNewsAsync();
                return Ok(news);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching news for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving news", error = ex.Message });
            }
        }

        /// <summary>
        /// Get all economic data at once
        /// </summary>
        /// <returns>Combined data from all sources</returns>
        [HttpGet("all")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<IActionResult> GetAllData()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var allData = await _economicDataService.GetAllDataAsync();
                return Ok(allData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all economic data for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving economic data", error = ex.Message });
            }
        }
    }
}

