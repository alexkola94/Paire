using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace YouAndMeExpensesAPI.Services
{
    public class CurrencyService : ICurrencyService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<CurrencyService> _logger;
        private const string BaseUrl = "https://api.frankfurter.app";

        public CurrencyService(HttpClient httpClient, ILogger<CurrencyService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<Dictionary<string, string>> GetCurrenciesAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{BaseUrl}/currencies");
                response.EnsureSuccessStatusCode();
                
                var content = await response.Content.ReadAsStringAsync();
                var currencies = JsonSerializer.Deserialize<Dictionary<string, string>>(content);
                
                return currencies ?? new Dictionary<string, string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching currencies from Frankfurter API");
                throw;
            }
        }

        public async Task<Dictionary<string, decimal>> GetExchangeRatesAsync(string baseCurrency)
        {
            try
            {
                // Frankfurter default base is EUR
                string url = $"{BaseUrl}/latest";
                if (!string.IsNullOrEmpty(baseCurrency))
                {
                    url += $"?from={baseCurrency}";
                }

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(content);
                var root = document.RootElement;
                
                var ratesElement = root.GetProperty("rates");
                var rates = new Dictionary<string, decimal>();
                
                foreach (var property in ratesElement.EnumerateObject())
                {
                    if (property.Value.TryGetDecimal(out var rate))
                    {
                        rates[property.Name] = rate;
                    }
                }
                
                return rates;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching exchange rates for base {baseCurrency}");
                throw;
            }
        }

        public async Task<decimal> ConvertCurrencyAsync(string from, string to, decimal amount)
        {
            if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
            {
                return amount;
            }

            try
            {
                // Frankfurter API conversion endpoint
                // /latest?amount=10&from=GBP&to=USD
                var url = $"{BaseUrl}/latest?amount={amount}&from={from}&to={to}";
                
                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(content);
                var root = document.RootElement;
                
                if (root.TryGetProperty("rates", out var ratesProperty) && 
                    ratesProperty.TryGetProperty(to, out var rateProperty) &&
                    rateProperty.TryGetDecimal(out var convertedAmount))
                {
                    return convertedAmount;
                }
                
                throw new InvalidOperationException("Could not retrieve converted amount from response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error converting {amount} {from} to {to}");
                throw;
            }
        }
    }
}
