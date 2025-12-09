using System.Net.Http.Json;
using System.Text.Json;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for fetching Greece economic data from external APIs
    /// Uses Eurostat API (SDMX and JSON-stat formats) - free, no authentication required
    /// 
    /// Eurostat API Documentation: https://ec.europa.eu/eurostat/web/json-and-unicode-web-services
    /// SDMX API: https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/
    /// JSON-stat API: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
    /// 
    /// Data Sources:
    /// - Eurostat: CPI, Food Prices, GDP, Unemployment, Inflation (via API)
    /// - ELSTAT: Does not provide a public API. Data may be available through data.gov.gr when operational.
    /// - Bank of Greece: Does NOT provide a public API. Banking statistics are only available through their
    ///   Open Data Portal (downloadable datasets, not API). Website: https://www.bankofgreece.gr/en/statistics/open-data-portal
    /// </summary>
    public class GreeceEconomicDataService : IGreeceEconomicDataService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GreeceEconomicDataService> _logger;
        private readonly IConfiguration _configuration;

        // Eurostat API endpoints - try multiple formats
        private const string EUROSTAT_SDMX_BASE_URL = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data";
        private const string EUROSTAT_JSONSTAT_BASE_URL = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
        
        // Greece country code in Eurostat
        private const string GREECE_CODE = "EL";

        public GreeceEconomicDataService(
            HttpClient httpClient,
            ILogger<GreeceEconomicDataService> logger,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _configuration = configuration;

            // Configure HttpClient timeout
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
            
            // Note: We don't set default Accept header here because different Eurostat endpoints
            // require different Accept headers. We'll set them per request.
        }

        /// <summary>
        /// Helper method to create an HTTP request with appropriate headers for Eurostat API
        /// </summary>
        private HttpRequestMessage CreateEurostatRequest(string url, bool useSdmx = false)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            
            // SDMX API requires specific Accept headers
            if (useSdmx)
            {
                // SDMX API accepts JSON format with this header
                request.Headers.Add("Accept", "application/vnd.sdmx.data+json;version=2.1, application/json");
            }
            else
            {
                // JSON-stat API accepts standard JSON
                request.Headers.Add("Accept", "application/json");
            }
            
            return request;
        }

        /// <summary>
        /// Get Consumer Price Index (CPI) data from Eurostat
        /// Uses HICP (Harmonised Index of Consumer Prices) dataset: prc_hicp_aind
        /// Tries multiple API endpoints for better reliability
        /// </summary>
        public async Task<CPIDataDTO> GetCPIDataAsync()
        {
            // Try JSON-stat API first (more reliable for this dataset)
            var requests = new[]
            {
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}&coicop=CP00", useSdmx: false),
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}", useSdmx: false),
                (url: $"{EUROSTAT_SDMX_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}&coicop=CP00", useSdmx: true),
                (url: $"{EUROSTAT_SDMX_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}", useSdmx: true)
            };

            foreach (var (url, useSdmx) in requests)
            {
                try
                {
                    _logger.LogInformation("Fetching CPI data from Eurostat: {Url}", url);
                    var request = CreateEurostatRequest(url, useSdmx);
                    var response = await _httpClient.SendAsync(request);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        return await ParseCPIDataAsync(response);
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Failed to fetch CPI from {Url}. Status: {StatusCode}", url, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error fetching CPI from {Url}, trying next endpoint", url);
                }
            }
            
            // If all endpoints failed
            _logger.LogError("All CPI endpoints failed");
            return new CPIDataDTO
            {
                Error = "Failed to fetch CPI data from all Eurostat endpoints. Please try again later.",
                Source = "Eurostat",
                LastUpdated = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Parse CPI data from Eurostat response
        /// </summary>
        private async Task<CPIDataDTO> ParseCPIDataAsync(HttpResponseMessage response)
        {
            try
            {
                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                
                // Eurostat JSON structure:
                // {
                //   "value": { "0": 2.5, "1": 2.3, ... },
                //   "dimension": {
                //     "time": { "category": { "index": { "2024M01": 0, "2024M02": 1, ... } } },
                //     ...
                //   }
                // }
                
                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("value", out var valuesObj))
                {
                    var timeDimension = data.GetProperty("dimension").GetProperty("time").GetProperty("category").GetProperty("index");
                    var timeLabels = data.GetProperty("dimension").GetProperty("time").GetProperty("category").GetProperty("label");
                    
                    // Get time periods sorted (most recent first)
                    var timePeriods = timeDimension.EnumerateObject()
                        .OrderByDescending(x => x.Name)
                        .Take(2)
                        .ToList();
                    
                    if (timePeriods.Count >= 1)
                    {
                        var latestPeriod = timePeriods[0];
                        var latestIndex = latestPeriod.Value.GetInt32();
                        var latestValue = valuesObj.TryGetProperty(latestIndex.ToString(), out var latestVal) 
                            ? latestVal.GetDecimal() 
                            : (decimal?)null;
                        
                        decimal? previousValue = null;
                        if (timePeriods.Count >= 2)
                        {
                            var previousPeriod = timePeriods[1];
                            var previousIndex = previousPeriod.Value.GetInt32();
                            previousValue = valuesObj.TryGetProperty(previousIndex.ToString(), out var prevVal) 
                                ? prevVal.GetDecimal() 
                                : (decimal?)null;
                        }
                        
                        decimal? change = null;
                        decimal? changePercent = null;
                        
                        if (latestValue.HasValue && previousValue.HasValue)
                        {
                            change = latestValue.Value - previousValue.Value;
                            changePercent = previousValue.Value != 0 
                                ? (change.Value / Math.Abs(previousValue.Value)) * 100 
                                : 0;
                        }
                        
                        return new CPIDataDTO
                        {
                            CurrentRate = latestValue,
                            PreviousRate = previousValue,
                            Change = change,
                            ChangePercent = changePercent,
                            LastUpdated = DateTime.UtcNow,
                            Source = "Eurostat",
                            Trend = change.HasValue && change.Value > 0 ? "increasing" : change.HasValue && change.Value < 0 ? "decreasing" : "stable"
                        };
                    }
                }
                
                return new CPIDataDTO
                {
                    Error = "Unable to parse Eurostat response. API structure may have changed.",
                    Source = "Eurostat",
                    LastUpdated = DateTime.UtcNow
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error fetching CPI data");
                return new CPIDataDTO
                {
                    Error = $"Network error while fetching CPI data: {ex.Message}",
                    LastUpdated = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching CPI data");
                return new CPIDataDTO
                {
                    Error = $"Error fetching CPI data: {ex.Message}",
                    LastUpdated = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Get food price data from Eurostat
        /// Note: Eurostat doesn't have detailed food price data by item
        /// This will return HICP data for food categories instead
        /// </summary>
        public async Task<FoodPricesDataDTO> GetFoodPricesAsync()
        {
            try
            {
                // Eurostat HICP for Food and non-alcoholic beverages
                // Dataset: prc_hicp_midx (Monthly Index)
                // COICOP codes: CP01 (Food and non-alcoholic beverages)
                // Try multiple endpoints
                var requests = new[]
                {
                    (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_midx?format=JSON&geo={GREECE_CODE}&coicop=CP01", useSdmx: false),
                    (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_midx?format=JSON&geo={GREECE_CODE}", useSdmx: false),
                    (url: $"{EUROSTAT_SDMX_BASE_URL}/prc_hicp_midx?format=JSON&geo={GREECE_CODE}&coicop=CP01", useSdmx: true),
                    (url: $"{EUROSTAT_SDMX_BASE_URL}/prc_hicp_midx?format=JSON&geo={GREECE_CODE}", useSdmx: true)
                };

                HttpResponseMessage? response = null;
                foreach (var (url, useSdmx) in requests)
                {
                    try
                    {
                        _logger.LogInformation("Fetching food price data from Eurostat: {Url}", url);
                        var request = CreateEurostatRequest(url, useSdmx);
                        response = await _httpClient.SendAsync(request);
                        
                        if (response.IsSuccessStatusCode)
                        {
                            break; // Success, use this response
                        }
                        else
                        {
                            var errorContent = await response.Content.ReadAsStringAsync();
                            _logger.LogWarning("Failed to fetch food prices from {Url}. Status: {StatusCode}", url, response.StatusCode);
                            response = null;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error fetching food prices from {Url}, trying next endpoint", url);
                        response = null;
                    }
                }

                if (response == null || !response.IsSuccessStatusCode)
                {
                    return new FoodPricesDataDTO
                    {
                        Error = "Failed to fetch food price data from all Eurostat endpoints.",
                        Source = "Eurostat",
                        LastUpdated = DateTime.UtcNow
                    };
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                
                // Parse Eurostat response and extract food price indices
                // Eurostat provides price indices (base year = 100), not actual prices
                var categories = new List<FoodPriceCategoryDTO>();
                
                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("value", out var valuesObj))
                {
                    // Try to get the latest index value
                    if (data.TryGetProperty("dimension", out var dimensionObj) &&
                        dimensionObj.TryGetProperty("time", out var timeObj) &&
                        timeObj.TryGetProperty("category", out var timeCategory) &&
                        timeCategory.TryGetProperty("index", out var timeIndex))
                    {
                        var timePeriods = timeIndex.EnumerateObject()
                            .OrderByDescending(x => x.Name)
                            .Take(2)
                            .ToList();
                        
                        decimal? currentIndex = null;
                        decimal? previousIndex = null;
                        
                        if (timePeriods.Count > 0)
                        {
                            var latestPeriod = timePeriods[0];
                            var latestIndex = latestPeriod.Value.GetInt32();
                            if (valuesObj.TryGetProperty(latestIndex.ToString(), out var latestVal))
                            {
                                var valueStr = latestVal.GetRawText().Trim('"');
                                if (decimal.TryParse(valueStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
                                {
                                    currentIndex = parsed;
                                }
                            }
                        }
                        
                        if (timePeriods.Count >= 2)
                        {
                            var previousPeriod = timePeriods[1];
                            var previousIndexNum = previousPeriod.Value.GetInt32();
                            if (valuesObj.TryGetProperty(previousIndexNum.ToString(), out var prevVal))
                            {
                                var valueStr = prevVal.GetRawText().Trim('"');
                                if (decimal.TryParse(valueStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
                                {
                                    previousIndex = parsed;
                                }
                            }
                        }
                        
                        decimal? change = null;
                        decimal? changePercent = null;
                        if (currentIndex.HasValue && previousIndex.HasValue)
                        {
                            change = currentIndex.Value - previousIndex.Value;
                            changePercent = previousIndex.Value != 0 
                                ? (change.Value / previousIndex.Value) * 100 
                                : 0;
                        }
                        
                        categories.Add(new FoodPriceCategoryDTO
                        {
                            Name = "Food and Non-Alcoholic Beverages",
                            AveragePrice = currentIndex ?? 0,
                            Change = change,
                            ChangePercent = changePercent,
                            Items = new List<FoodPriceItemDTO>()
                        });
                    }
                }
                
                // Try to fetch more detailed food categories
                // Eurostat COICOP codes for food subcategories:
                // CP0111: Bread and cereals
                // CP0112: Meat
                // CP0113: Fish
                // CP0114: Milk, cheese and eggs
                // CP0115: Oils and fats
                // CP0116: Fruit
                // CP0117: Vegetables
                // CP0118: Sugar, jam, honey, chocolate and confectionery
                // CP0119: Food products n.e.c.
                // CP012: Non-alcoholic beverages
                
                var detailedCategories = await FetchDetailedFoodCategoriesAsync();
                if (detailedCategories.Any())
                {
                    categories.AddRange(detailedCategories);
                }
                
                return new FoodPricesDataDTO
                {
                    Categories = categories,
                    LastUpdated = DateTime.UtcNow,
                    Source = "Eurostat",
                    Error = categories.Any() ? null : "Eurostat provides price indices (base year = 100), not actual prices. For detailed food prices, data.gov.gr would be needed when available."
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error fetching food prices");
                return new FoodPricesDataDTO
                {
                    Error = $"Network error while fetching food prices: {ex.Message}",
                    LastUpdated = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching food prices");
                return new FoodPricesDataDTO
                {
                    Error = $"Error fetching food prices: {ex.Message}",
                    LastUpdated = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Get economic indicators summary (GDP, unemployment, inflation, household income) from Eurostat
        /// </summary>
        public async Task<EconomicIndicatorsDTO> GetEconomicIndicatorsAsync()
        {
            try
            {
                // Fetch all indicators in parallel from Eurostat
                // Using simplified queries without complex filters to avoid dimension errors
                var gdpTask = FetchGDPAsync();
                var unemploymentTask = FetchUnemploymentAsync();
                var inflationTask = FetchInflationAsync();
                // Household income is not directly available in Eurostat, will return null
                var incomeTask = Task.FromResult<EconomicIndicatorDTO>(new EconomicIndicatorDTO
                {
                    Value = null,
                    Unit = "EUR/year",
                    Error = "Household income data not available in Eurostat. Would require data.gov.gr or ELSTAT."
                });
                
                await Task.WhenAll(gdpTask, unemploymentTask, inflationTask, incomeTask);
                
                return new EconomicIndicatorsDTO
                {
                    GDP = await gdpTask,
                    Unemployment = await unemploymentTask,
                    Inflation = await inflationTask,
                    HouseholdIncome = await incomeTask,
                    LastUpdated = DateTime.UtcNow,
                    Source = "Eurostat"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching economic indicators");
                return new EconomicIndicatorsDTO
                {
                    Error = $"Error fetching economic indicators: {ex.Message}",
                    LastUpdated = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Fetch GDP data from Eurostat
        /// Dataset: nama_10_gdp (GDP and main components)
        /// Tries multiple endpoints and query formats
        /// </summary>
        private async Task<EconomicIndicatorDTO> FetchGDPAsync()
        {
            // Try multiple endpoints and query formats
            var requests = new[]
            {
                // Try JSON-stat API first (more reliable)
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/nama_10_gdp?format=JSON&geo={GREECE_CODE}&na_item=B1GQ", useSdmx: false),
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/nama_10_gdp?format=JSON&geo={GREECE_CODE}", useSdmx: false),
                // Try SDMX API as fallback
                (url: $"{EUROSTAT_SDMX_BASE_URL}/nama_10_gdp?format=JSON&geo={GREECE_CODE}&na_item=B1GQ&unit=CP_MEUR", useSdmx: true),
                (url: $"{EUROSTAT_SDMX_BASE_URL}/nama_10_gdp?format=JSON&geo={GREECE_CODE}", useSdmx: true)
            };

            foreach (var (url, useSdmx) in requests)
            {
                try
                {
                    _logger.LogInformation("Fetching GDP from Eurostat: {Url}", url);
                    var request = CreateEurostatRequest(url, useSdmx);
                    var response = await _httpClient.SendAsync(request);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var result = await ParseEurostatResponseAsync(response, "billion EUR", "GDP");
                        if (result.Value.HasValue)
                        {
                            return result;
                        }
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Failed to fetch GDP from {Url}. Status: {StatusCode}", url, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error fetching GDP from {Url}, trying next endpoint", url);
                }
            }

            return new EconomicIndicatorDTO
            {
                Value = null,
                Unit = "billion EUR",
                Error = "Failed to fetch GDP from all Eurostat endpoints. The dataset may require specific dimension filters."
            };
        }

        /// <summary>
        /// Fetch unemployment rate from Eurostat
        /// Dataset: une_rt_m (Monthly unemployment rate)
        /// Tries multiple endpoints with different dimension filters
        /// </summary>
        private async Task<EconomicIndicatorDTO> FetchUnemploymentAsync()
        {
            // Try multiple endpoints with different filters
            var requests = new[]
            {
                // Try JSON-stat API first
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/une_rt_m?format=JSON&geo={GREECE_CODE}&age=TOTAL", useSdmx: false),
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/une_rt_m?format=JSON&geo={GREECE_CODE}", useSdmx: false),
                // Try SDMX API as fallback
                (url: $"{EUROSTAT_SDMX_BASE_URL}/une_rt_m?format=JSON&geo={GREECE_CODE}&age=TOTAL&sex=T", useSdmx: true),
                (url: $"{EUROSTAT_SDMX_BASE_URL}/une_rt_m?format=JSON&geo={GREECE_CODE}", useSdmx: true)
            };

            foreach (var (url, useSdmx) in requests)
            {
                try
                {
                    _logger.LogInformation("Fetching Unemployment from Eurostat: {Url}", url);
                    var request = CreateEurostatRequest(url, useSdmx);
                    var response = await _httpClient.SendAsync(request);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var result = await ParseEurostatResponseAsync(response, "%", "Unemployment");
                        if (result.Value.HasValue)
                        {
                            return result;
                        }
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Failed to fetch Unemployment from {Url}. Status: {StatusCode}", url, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error fetching Unemployment from {Url}, trying next endpoint", url);
                }
            }

            return new EconomicIndicatorDTO
            {
                Value = null,
                Unit = "%",
                Error = "Failed to fetch Unemployment from all Eurostat endpoints."
            };
        }

        /// <summary>
        /// Fetch inflation rate from Eurostat (uses same CPI dataset)
        /// Tries multiple endpoints for reliability
        /// </summary>
        private async Task<EconomicIndicatorDTO> FetchInflationAsync()
        {
            // Use the same CPI dataset for inflation - try multiple endpoints
            var requests = new[]
            {
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}&coicop=CP00", useSdmx: false),
                (url: $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}", useSdmx: false),
                (url: $"{EUROSTAT_SDMX_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}&coicop=CP00", useSdmx: true),
                (url: $"{EUROSTAT_SDMX_BASE_URL}/prc_hicp_aind?format=JSON&geo={GREECE_CODE}", useSdmx: true)
            };

            foreach (var (url, useSdmx) in requests)
            {
                try
                {
                    _logger.LogInformation("Fetching Inflation from Eurostat: {Url}", url);
                    var request = CreateEurostatRequest(url, useSdmx);
                    var response = await _httpClient.SendAsync(request);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var result = await ParseEurostatResponseAsync(response, "%", "Inflation");
                        if (result.Value.HasValue)
                        {
                            return result;
                        }
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Failed to fetch Inflation from {Url}. Status: {StatusCode}", url, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error fetching Inflation from {Url}, trying next endpoint", url);
                }
            }

            return new EconomicIndicatorDTO
            {
                Value = null,
                Unit = "%",
                Error = "Failed to fetch Inflation from all Eurostat endpoints."
            };
        }

        /// <summary>
        /// Helper method to parse Eurostat JSON response
        /// </summary>
        private async Task<EconomicIndicatorDTO> ParseEurostatResponseAsync(HttpResponseMessage response, string unit, string indicatorName)
        {
            try
            {
                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                
                // Parse Eurostat JSON-stat response
                // Structure: { "value": { "0": val1, "1": val2, ... }, "dimension": { "time": {...}, ... } }
                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("value", out var valuesObj))
                {
                    // Get time dimension
                    if (data.TryGetProperty("dimension", out var dimensionObj) &&
                        dimensionObj.TryGetProperty("time", out var timeObj) &&
                        timeObj.TryGetProperty("category", out var timeCategory) &&
                        timeCategory.TryGetProperty("index", out var timeIndex))
                    {
                        // Get all time periods and find the latest with a valid value
                        var timePeriods = timeIndex.EnumerateObject()
                            .OrderByDescending(x => x.Name)
                            .ToList();
                        
                        if (timePeriods.Count > 0)
                        {
                            // Try to get a valid value from the most recent periods
                            // Note: Eurostat uses special values: ":" = not available, "b" = break in series
                            decimal? latestValue = null;
                            string latestPeriod = "";
                            
                            foreach (var period in timePeriods)
                            {
                                var periodIndex = period.Value.GetInt32();
                                
                                // Check if value exists and is not null
                                if (valuesObj.TryGetProperty(periodIndex.ToString(), out var valueProp))
                                {
                                    // Eurostat uses special values: ":" = not available, "b" = break in series
                                    var valueStr = valueProp.GetRawText().Trim('"');
                                    if (valueStr != ":" && valueStr != "b" && valueStr != "null" && !string.IsNullOrEmpty(valueStr))
                                    {
                                        if (decimal.TryParse(valueStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedValue))
                                        {
                                            latestValue = parsedValue;
                                            latestPeriod = period.Name;
                                            break; // Found a valid value
                                        }
                                    }
                                }
                            }
                            
                            if (latestValue.HasValue)
                            {
                                // Format period (e.g., "2024M01" -> "January 2024", "2024Q1" -> "Q1 2024")
                                string formattedPeriod = latestPeriod;
                                if (latestPeriod.Length >= 6 && latestPeriod[4] == 'M')
                                {
                                    var year = latestPeriod.Substring(0, 4);
                                    var month = int.Parse(latestPeriod.Substring(5));
                                    var monthName = new DateTime(2000, month, 1).ToString("MMMM");
                                    formattedPeriod = $"{monthName} {year}";
                                }
                                else if (latestPeriod.Length >= 6 && latestPeriod[4] == 'Q')
                                {
                                    var year = latestPeriod.Substring(0, 4);
                                    var quarter = latestPeriod.Substring(5);
                                    formattedPeriod = $"Q{quarter} {year}";
                                }
                                
                                return new EconomicIndicatorDTO
                                {
                                    Value = latestValue,
                                    Unit = unit,
                                    Period = formattedPeriod
                                };
                            }
                        }
                    }
                }
                
                return new EconomicIndicatorDTO
                {
                    Value = null,
                    Unit = unit,
                    Error = $"No valid data found for {indicatorName}. Response may be empty or format changed."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing Eurostat response for {Indicator}", indicatorName);
                return new EconomicIndicatorDTO
                {
                    Value = null,
                    Unit = unit,
                    Error = $"Parse error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Get latest economic news articles from Greece
        /// Aggregates articles from multiple free news APIs:
        /// - GNews (https://gnews.io/) - Free tier: 100 requests/day
        /// - NewsAPI (https://newsapi.org/) - Free tier: 100 requests/day
        /// - Currents API (https://currentsapi.services/) - Free tier: 200 requests/day
        /// Searches for economic news in Greece with keywords: economy, finance, inflation, GDP, unemployment
        /// </summary>
        public async Task<NewsDataDTO> GetNewsAsync()
        {
            try
            {
                // Fetch from all APIs in parallel
                var gnewsTask = FetchFromGNewsAsync();
                var newsApiTask = FetchFromNewsAPIAsync();
                var currentsTask = FetchFromCurrentsAPIAsync();

                await Task.WhenAll(gnewsTask, newsApiTask, currentsTask);

                // Aggregate all articles
                var allArticles = new List<NewsArticleDTO>();
                allArticles.AddRange(await gnewsTask);
                allArticles.AddRange(await newsApiTask);
                allArticles.AddRange(await currentsTask);

                // Remove duplicates by URL (case-insensitive)
                var uniqueArticles = allArticles
                    .GroupBy(a => a.Url.ToLowerInvariant())
                    .Select(g => g.First())
                    .OrderByDescending(a => a.PublishedAt ?? DateTime.MinValue)
                    .Take(15) // Limit to 15 unique articles
                    .ToList();

                return new NewsDataDTO
                {
                    Articles = uniqueArticles,
                    LastUpdated = DateTime.UtcNow,
                    Source = "Multiple Sources (GNews, NewsAPI, Currents)"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error aggregating news from multiple sources");
                return new NewsDataDTO
                {
                    Error = $"Error fetching news: {ex.Message}",
                    LastUpdated = DateTime.UtcNow
                };
            }
        }

        /// <summary>
        /// Fetch news articles from GNews API
        /// </summary>
        private async Task<List<NewsArticleDTO>> FetchFromGNewsAsync()
        {
            try
            {
                var apiKey = _configuration["GNews:ApiKey"] ?? string.Empty;
                var query = "Greece economy OR Greece finance OR Greece inflation OR Greece GDP OR Greece unemployment";
                var language = "en";
                var maxArticles = 8;

                var url = string.IsNullOrEmpty(apiKey)
                    ? $"https://gnews.io/api/v4/search?q={Uri.EscapeDataString(query)}&lang={language}&max={maxArticles}"
                    : $"https://gnews.io/api/v4/search?q={Uri.EscapeDataString(query)}&lang={language}&max={maxArticles}&apikey={apiKey}";

                _logger.LogInformation("Fetching economic news from GNews API");
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("GNews API returned status {StatusCode}", response.StatusCode);
                    return new List<NewsArticleDTO>();
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                var articles = new List<NewsArticleDTO>();

                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("articles", out var articlesArray))
                {
                    foreach (var article in articlesArray.EnumerateArray())
                    {
                        try
                        {
                            var newsArticle = ParseGNewsArticle(article);
                            if (newsArticle != null && !string.IsNullOrEmpty(newsArticle.Title) && !string.IsNullOrEmpty(newsArticle.Url))
                            {
                                articles.Add(newsArticle);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Error parsing GNews article");
                        }
                    }
                }

                return articles;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching from GNews API");
                return new List<NewsArticleDTO>();
            }
        }

        /// <summary>
        /// Parse a GNews article from JSON
        /// </summary>
        private NewsArticleDTO? ParseGNewsArticle(JsonElement article)
        {
            return new NewsArticleDTO
            {
                Title = article.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? string.Empty : string.Empty,
                Description = article.TryGetProperty("description", out var descProp) ? descProp.GetString() ?? string.Empty : string.Empty,
                Url = article.TryGetProperty("url", out var urlProp) ? urlProp.GetString() ?? string.Empty : string.Empty,
                ImageUrl = article.TryGetProperty("image", out var imgProp) ? imgProp.GetString() : null,
                Source = article.TryGetProperty("source", out var sourceObj) && sourceObj.TryGetProperty("name", out var sourceName)
                    ? sourceName.GetString() : null,
                PublishedAt = article.TryGetProperty("publishedAt", out var publishedProp)
                    && DateTime.TryParse(publishedProp.GetString(), out var publishedDate) ? publishedDate : null,
                Author = article.TryGetProperty("author", out var authorProp) ? authorProp.GetString() : null
            };
        }

        /// <summary>
        /// Fetch news articles from NewsAPI
        /// </summary>
        private async Task<List<NewsArticleDTO>> FetchFromNewsAPIAsync()
        {
            try
            {
                var apiKey = _configuration["NewsAPI:ApiKey"] ?? string.Empty;
                if (string.IsNullOrEmpty(apiKey))
                {
                    _logger.LogDebug("NewsAPI key not configured, skipping");
                    return new List<NewsArticleDTO>();
                }

                // NewsAPI free tier: country=gr (Greece), category=business
                // Note: Free tier requires API key and has rate limits
                var url = $"https://newsapi.org/v2/top-headlines?country=gr&category=business&pageSize=8&apiKey={apiKey}";

                _logger.LogInformation("Fetching economic news from NewsAPI");
                
                // Use shorter timeout for NewsAPI (10 seconds)
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var response = await _httpClient.GetAsync(url, cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                    {
                        _logger.LogWarning("NewsAPI returned BadRequest (400). This usually means invalid API key or rate limit exceeded. Error: {Error}", errorContent);
                    }
                    else
                    {
                        _logger.LogWarning("NewsAPI returned status {StatusCode}: {Error}", response.StatusCode, errorContent);
                    }
                    return new List<NewsArticleDTO>();
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                var articles = new List<NewsArticleDTO>();

                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("articles", out var articlesArray))
                {
                    foreach (var article in articlesArray.EnumerateArray())
                    {
                        try
                        {
                            var newsArticle = ParseNewsAPIArticle(article);
                            if (newsArticle != null && !string.IsNullOrEmpty(newsArticle.Title) && !string.IsNullOrEmpty(newsArticle.Url))
                            {
                                articles.Add(newsArticle);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Error parsing NewsAPI article");
                        }
                    }
                }

                return articles;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching from NewsAPI");
                return new List<NewsArticleDTO>();
            }
        }

        /// <summary>
        /// Parse a NewsAPI article from JSON
        /// </summary>
        private NewsArticleDTO? ParseNewsAPIArticle(JsonElement article)
        {
            return new NewsArticleDTO
            {
                Title = article.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? string.Empty : string.Empty,
                Description = article.TryGetProperty("description", out var descProp) ? descProp.GetString() ?? string.Empty : string.Empty,
                Url = article.TryGetProperty("url", out var urlProp) ? urlProp.GetString() ?? string.Empty : string.Empty,
                ImageUrl = article.TryGetProperty("urlToImage", out var imgProp) ? imgProp.GetString() : null,
                Source = article.TryGetProperty("source", out var sourceObj) && sourceObj.TryGetProperty("name", out var sourceName)
                    ? sourceName.GetString() : null,
                PublishedAt = article.TryGetProperty("publishedAt", out var publishedProp)
                    && DateTime.TryParse(publishedProp.GetString(), out var publishedDate) ? publishedDate : null,
                Author = article.TryGetProperty("author", out var authorProp) ? authorProp.GetString() : null
            };
        }

        /// <summary>
        /// Fetch news articles from Currents API
        /// </summary>
        private async Task<List<NewsArticleDTO>> FetchFromCurrentsAPIAsync()
        {
            try
            {
                var apiKey = _configuration["CurrentsAPI:ApiKey"] ?? string.Empty;
                if (string.IsNullOrEmpty(apiKey))
                {
                    _logger.LogDebug("Currents API key not configured, skipping");
                    return new List<NewsArticleDTO>();
                }

                // Currents API: search for Greece economic news
                var query = "Greece economy OR Greece finance OR Greece inflation";
                var url = $"https://api.currentsapi.services/v1/search?keywords={Uri.EscapeDataString(query)}&language=en&page_size=8&apiKey={apiKey}";

                _logger.LogInformation("Fetching economic news from Currents API");
                
                // Use shorter timeout for Currents API (10 seconds instead of 30)
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var response = await _httpClient.GetAsync(url, cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Currents API returned status {StatusCode}", response.StatusCode);
                    return new List<NewsArticleDTO>();
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                var articles = new List<NewsArticleDTO>();

                if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("news", out var newsArray))
                {
                    foreach (var article in newsArray.EnumerateArray())
                    {
                        try
                        {
                            var newsArticle = ParseCurrentsAPIArticle(article);
                            if (newsArticle != null && !string.IsNullOrEmpty(newsArticle.Title) && !string.IsNullOrEmpty(newsArticle.Url))
                            {
                                articles.Add(newsArticle);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Error parsing Currents API article");
                        }
                    }
                }

                return articles;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching from Currents API");
                return new List<NewsArticleDTO>();
            }
        }

        /// <summary>
        /// Parse a Currents API article from JSON
        /// </summary>
        private NewsArticleDTO? ParseCurrentsAPIArticle(JsonElement article)
        {
            return new NewsArticleDTO
            {
                Title = article.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? string.Empty : string.Empty,
                Description = article.TryGetProperty("description", out var descProp) ? descProp.GetString() ?? string.Empty : string.Empty,
                Url = article.TryGetProperty("url", out var urlProp) ? urlProp.GetString() ?? string.Empty : string.Empty,
                ImageUrl = article.TryGetProperty("image", out var imgProp) ? imgProp.GetString() : null,
                Source = article.TryGetProperty("author", out var sourceProp) ? sourceProp.GetString() : null,
                PublishedAt = article.TryGetProperty("published", out var publishedProp)
                    && DateTime.TryParse(publishedProp.GetString(), out var publishedDate) ? publishedDate : null,
                Author = article.TryGetProperty("author", out var authorProp) ? authorProp.GetString() : null
            };
        }

        /// <summary>
        /// Fetch detailed food price categories from Eurostat
        /// Gets price indices for different food subcategories
        /// Optimized to use parallel requests with timeout and concurrency limits
        /// </summary>
        private async Task<List<FoodPriceCategoryDTO>> FetchDetailedFoodCategoriesAsync()
        {
            var categories = new List<FoodPriceCategoryDTO>();
            
            // COICOP codes for food subcategories (limited to most important ones to avoid timeout)
            var foodCategories = new Dictionary<string, string>
            {
                { "CP0111", "Bread and Cereals" },
                { "CP0112", "Meat" },
                { "CP0114", "Milk, Cheese and Eggs" },
                { "CP0116", "Fruit" },
                { "CP0117", "Vegetables" },
                { "CP012", "Non-Alcoholic Beverages" }
            };

            // Use semaphore to limit concurrent requests (max 3 at a time)
            using var semaphore = new SemaphoreSlim(3, 3);
            
            // Create cancellation token with overall timeout (15 seconds total)
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            
            // Create tasks for all categories in parallel
            var tasks = foodCategories.Select(async category =>
            {
                // Wait for semaphore slot
                await semaphore.WaitAsync(cts.Token);
                try
                {
                    return await FetchSingleFoodCategoryAsync(category.Key, category.Value, cts.Token);
                }
                finally
                {
                    semaphore.Release();
                }
            });

            // Wait for all tasks with timeout
            try
            {
                var results = await Task.WhenAll(tasks);
                categories.AddRange(results.Where(c => c != null).Cast<FoodPriceCategoryDTO>());
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("FetchDetailedFoodCategoriesAsync timed out after 15 seconds");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching detailed food categories");
            }
            
            return categories;
        }

        /// <summary>
        /// Fetch a single food category with timeout per request
        /// </summary>
        private async Task<FoodPriceCategoryDTO?> FetchSingleFoodCategoryAsync(string coicopCode, string categoryName, CancellationToken cancellationToken)
        {
            try
            {
                // Try JSON-stat API first (more reliable), with shorter timeout per request
                var url = $"{EUROSTAT_JSONSTAT_BASE_URL}/prc_hicp_midx?format=JSON&geo={GREECE_CODE}&coicop={coicopCode}";
                
                using var requestCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                requestCts.CancelAfter(TimeSpan.FromSeconds(8)); // 8 seconds per request
                
                var request = CreateEurostatRequest(url, useSdmx: false);
                var response = await _httpClient.SendAsync(request, requestCts.Token);
                
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync(requestCts.Token);
                    var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                    
                    if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("value", out var valuesObj))
                    {
                        if (data.TryGetProperty("dimension", out var dimensionObj) &&
                            dimensionObj.TryGetProperty("time", out var timeObj) &&
                            timeObj.TryGetProperty("category", out var timeCategory) &&
                            timeCategory.TryGetProperty("index", out var timeIndex))
                        {
                            var timePeriods = timeIndex.EnumerateObject()
                                .OrderByDescending(x => x.Name)
                                .Take(2)
                                .ToList();
                            
                            decimal? currentIndex = null;
                            decimal? previousIndex = null;
                            
                            if (timePeriods.Count > 0)
                            {
                                var latestPeriod = timePeriods[0];
                                var latestIndex = latestPeriod.Value.GetInt32();
                                if (valuesObj.TryGetProperty(latestIndex.ToString(), out var latestVal))
                                {
                                    var valueStr = latestVal.GetRawText().Trim('"');
                                    if (decimal.TryParse(valueStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
                                    {
                                        currentIndex = parsed;
                                    }
                                }
                            }
                            
                            if (timePeriods.Count >= 2)
                            {
                                var previousPeriod = timePeriods[1];
                                var previousIndexNum = previousPeriod.Value.GetInt32();
                                if (valuesObj.TryGetProperty(previousIndexNum.ToString(), out var prevVal))
                                {
                                    var valueStr = prevVal.GetRawText().Trim('"');
                                    if (decimal.TryParse(valueStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
                                    {
                                        previousIndex = parsed;
                                    }
                                }
                            }
                            
                            if (currentIndex.HasValue)
                            {
                                decimal? change = null;
                                decimal? changePercent = null;
                                if (currentIndex.HasValue && previousIndex.HasValue)
                                {
                                    change = currentIndex.Value - previousIndex.Value;
                                    changePercent = previousIndex.Value != 0 
                                        ? (change.Value / previousIndex.Value) * 100 
                                        : 0;
                                }
                                
                                return new FoodPriceCategoryDTO
                                {
                                    Name = categoryName,
                                    AveragePrice = currentIndex.Value,
                                    Change = change,
                                    ChangePercent = changePercent,
                                    Items = new List<FoodPriceItemDTO>()
                                };
                            }
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogDebug("Request for food category {Category} was cancelled due to timeout", categoryName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching food category {Category}", categoryName);
            }
            
            return null;
        }

        /// <summary>
        /// Get all economic data at once
        /// </summary>
        public async Task<GreeceEconomicDataDTO> GetAllDataAsync()
        {
            try
            {
                // Fetch all data in parallel for better performance
                var cpiTask = GetCPIDataAsync();
                var foodPricesTask = GetFoodPricesAsync();
                var indicatorsTask = GetEconomicIndicatorsAsync();
                var newsTask = GetNewsAsync();

                await Task.WhenAll(cpiTask, foodPricesTask, indicatorsTask, newsTask);

                return new GreeceEconomicDataDTO
                {
                    CPI = await cpiTask,
                    FoodPrices = await foodPricesTask,
                    Indicators = await indicatorsTask,
                    News = await newsTask,
                    LastUpdated = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all economic data");
                return new GreeceEconomicDataDTO
                {
                    CPI = new CPIDataDTO { Error = "Failed to load CPI data" },
                    FoodPrices = new FoodPricesDataDTO { Error = "Failed to load food prices" },
                    Indicators = new EconomicIndicatorsDTO { Error = "Failed to load indicators" },
                    News = new NewsDataDTO { Error = "Failed to load news" },
                    LastUpdated = DateTime.UtcNow
                };
            }
        }
    }
}

