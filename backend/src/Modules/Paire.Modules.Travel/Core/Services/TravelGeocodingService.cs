using System.Net.Http.Headers;
using System.Text.Json;
using Paire.Modules.Travel.Core.DTOs;
using Paire.Modules.Travel.Core.Interfaces;

namespace Paire.Modules.Travel.Core.Services;

public class TravelGeocodingService : ITravelGeocodingService
{
    private readonly ILogger<TravelGeocodingService> _logger;
    private readonly HttpClient _httpClient;

    public TravelGeocodingService(ILogger<TravelGeocodingService> logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<(IReadOnlyList<TravelLocationResult> results, int? statusCode, string? errorMessage)> SearchLocationsAsync(
        string query, int limit, CancellationToken cancellationToken = default)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.UserAgent.Clear();
            _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("TravelCommandCenter", "1.0"));

            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&limit={limit}&addressdetails=1";
            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Nominatim API returned {StatusCode} for query: {Query}", response.StatusCode, query);
                return (Array.Empty<TravelLocationResult>(), (int)response.StatusCode, "Geocoding service unavailable");
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var results = JsonSerializer.Deserialize<List<JsonElement>>(content);

            if (results == null || results.Count == 0)
                return (Array.Empty<TravelLocationResult>(), 200, null);

            var transformed = results.Select(r =>
            {
                string displayName = r.TryGetProperty("display_name", out var displayNameElement)
                    ? displayNameElement.GetString() ?? string.Empty : string.Empty;

                string cityName = string.Empty;
                string countryName = string.Empty;

                if (r.TryGetProperty("address", out var addressElement) && addressElement.ValueKind == JsonValueKind.Object)
                {
                    if (addressElement.TryGetProperty("city", out var city)) cityName = city.GetString() ?? string.Empty;
                    else if (addressElement.TryGetProperty("town", out var town)) cityName = town.GetString() ?? string.Empty;
                    else if (addressElement.TryGetProperty("village", out var village)) cityName = village.GetString() ?? string.Empty;
                    else if (addressElement.TryGetProperty("hamlet", out var hamlet)) cityName = hamlet.GetString() ?? string.Empty;
                    if (addressElement.TryGetProperty("country", out var country)) countryName = country.GetString() ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(cityName) && !string.IsNullOrWhiteSpace(displayName))
                    cityName = displayName.Split(',')[0].Trim();

                double latitude = 0.0, longitude = 0.0;
                if (r.TryGetProperty("lat", out var lat) && double.TryParse(lat.GetString(), out var latVal)) latitude = latVal;
                if (r.TryGetProperty("lon", out var lon) && double.TryParse(lon.GetString(), out var lonVal)) longitude = lonVal;

                return new TravelLocationResult { Name = cityName, FullName = displayName, Country = countryName, Latitude = latitude, Longitude = longitude };
            }).ToList();

            return (transformed, 200, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error geocoding location: {Query}", query);
            return (Array.Empty<TravelLocationResult>(), 500, "Error geocoding location");
        }
    }
}
