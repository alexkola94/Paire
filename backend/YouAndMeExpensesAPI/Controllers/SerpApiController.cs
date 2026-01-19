using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Proxy controller for SerpApi requests
    /// Needed because SerpApi doesn't support CORS for browser requests
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SerpApiController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SerpApiController> _logger;

        public SerpApiController(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<SerpApiController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Proxy endpoint for Google Hotels search via SerpApi
        /// </summary>
        /// <param name="q">Search query (e.g., "hotels in Milan")</param>
        /// <param name="gl">Country code (default: us)</param>
        /// <param name="hl">Language code (default: en)</param>
        [HttpGet("hotels")]
        public async Task<IActionResult> SearchHotels(
            [FromQuery] string q,
            [FromQuery] string gl = "us",
            [FromQuery] string hl = "en",
            [FromQuery] string check_in_date = "",
            [FromQuery] string check_out_date = "")
        {
            _logger.LogInformation("Received SerpApi proxy request. Query: '{Query}', GL: '{GL}', HL: '{HL}', Dates: {CheckIn} - {CheckOut}", q, gl, hl, check_in_date, check_out_date);

            if (string.IsNullOrWhiteSpace(q))
            {
                _logger.LogWarning("SerpApi proxy request missing 'q' parameter");
                return BadRequest(new { error = "Query parameter 'q' is required" });
            }

            var apiKey = _configuration["SerpApi:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("SerpApi API key not configured");
                return StatusCode(503, new { error = "SerpApi not configured" });
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                
                var url = $"https://serpapi.com/search.json?" +
                    $"engine=google_hotels&" +
                    $"q={Uri.EscapeDataString(q)}&" +
                    $"gl={gl}&" +
                    $"hl={hl}&" +
                    $"api_key={apiKey}";
                
                if (!string.IsNullOrEmpty(check_in_date))
                {
                    url += $"&check_in_date={check_in_date}";
                }

                if (!string.IsNullOrEmpty(check_out_date))
                {
                    url += $"&check_out_date={check_out_date}";
                }
                
                _logger.LogInformation("Forwarding request to SerpApi: {Url} (Key hidden)", url.Replace(apiKey, "***"));

                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("SerpApi request failed with status {Status}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, new { 
                        error = "SerpApi request failed",
                        status = (int)response.StatusCode
                    });
                }

                var content = await response.Content.ReadAsStringAsync();
                
                // Return the raw JSON from SerpApi
                return Content(content, "application/json");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Error calling SerpApi");
                return StatusCode(502, new { error = "Failed to reach SerpApi", message = ex.Message });
            }
        }
    }
}
