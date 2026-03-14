using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Paire.Modules.Travel.Core.DTOs;
using Paire.Modules.Travel.Core.Interfaces;

namespace Paire.Modules.Travel.Core.Services;

public class TravelAdvisoryService : ITravelAdvisoryService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TravelAdvisoryService> _logger;
    private readonly HttpClient _httpClient;

    private static readonly Dictionary<string, string> CountryNameToIso2 = new(StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> KnownIsoCodes = new(StringComparer.OrdinalIgnoreCase);
    private static bool _countryMapInitialised;
    private static readonly object CountryMapLock = new();

    private static void EnsureCountryMapInitialised()
    {
        if (_countryMapInitialised) return;
        lock (CountryMapLock)
        {
            if (_countryMapInitialised) return;
            try
            {
                var filePath = Path.Combine(AppContext.BaseDirectory, "Data", "CountryCodes.json");
                if (!File.Exists(filePath)) return;
                var json = File.ReadAllText(filePath);
                var entries = JsonSerializer.Deserialize<List<CountryCodeEntry>>(json);
                if (entries == null) return;

                foreach (var entry in entries)
                {
                    if (string.IsNullOrWhiteSpace(entry.Iso2)) continue;
                    KnownIsoCodes.Add(entry.Iso2);
                    if (!string.IsNullOrWhiteSpace(entry.Name))
                        CountryNameToIso2[entry.Name.ToUpperInvariant()] = entry.Iso2;
                    if (entry.Aliases != null)
                        foreach (var alias in entry.Aliases.Where(a => !string.IsNullOrWhiteSpace(a)))
                            CountryNameToIso2[alias.ToUpperInvariant()] = entry.Iso2;
                }
            }
            catch { }
            finally { _countryMapInitialised = true; }
        }
    }

    private sealed class CountryCodeEntry
    {
        [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
        [JsonPropertyName("iso2")] public string Iso2 { get; set; } = string.Empty;
        [JsonPropertyName("iso3")] public string? Iso3 { get; set; }
        [JsonPropertyName("aliases")] public List<string>? Aliases { get; set; }
    }

    private static string NormalizeToIsoCode(string raw)
    {
        EnsureCountryMapInitialised();
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        var trimmed = raw.Trim();

        if (trimmed.Length is 2 or 3 && trimmed.All(char.IsLetter) &&
            (KnownIsoCodes.Count == 0 || KnownIsoCodes.Contains(trimmed)))
            return trimmed.ToUpperInvariant();

        if (CountryNameToIso2.TryGetValue(trimmed, out var iso)) return iso;

        return trimmed.ToUpperInvariant() switch
        {
            "UNITED KINGDOM" or "GREAT BRITAIN" => "GB",
            "GREECE" or "HELLENIC REPUBLIC" => "GR",
            "UNITED STATES" or "UNITED STATES OF AMERICA" or "USA" => "US",
            "NORTH MACEDONIA" => "MK",
            _ => trimmed.ToUpperInvariant()
        };
    }

    public TravelAdvisoryService(IConfiguration configuration, ILogger<TravelAdvisoryService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<TravelAdvisoryResult> GetAdvisoryAsync(string countryCode, CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeToIsoCode(countryCode);
        var result = new TravelAdvisoryResult { CountryCode = normalizedCode };

        try
        {
            var apiKey = _configuration["TuGo:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                result.HasData = false;
                result.ErrorMessage = "Advisory service unavailable";
                return result;
            }

            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
                _httpClient.DefaultRequestHeaders.ExpectContinue = false;

            _httpClient.DefaultRequestHeaders.UserAgent.Clear();
            _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("YouMeExpenses-TravelAdvisory", "1.0"));
            _httpClient.Timeout = TimeSpan.FromSeconds(60);

            var url = $"https://api.tugo.com/v1/travelsafe/countries/{Uri.EscapeDataString(result.CountryCode)}";
            _httpClient.DefaultRequestHeaders.Remove("Auth-Key");
            _httpClient.DefaultRequestHeaders.Remove("X-Auth-API-Key");
            _httpClient.DefaultRequestHeaders.Add("X-Auth-API-Key", apiKey);

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.GetAsync(url, cancellationToken);
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                result.HasData = false;
                result.ErrorMessage = "Advisory service timeout";
                result.StatusCode = 504;
                return result;
            }

            if (!response.IsSuccessStatusCode)
            {
                result.HasData = false;
                result.ErrorMessage = "Advisory service unavailable";
                result.StatusCode = (int)response.StatusCode;
                return result;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
            if (!contentType.Contains("json", StringComparison.OrdinalIgnoreCase) &&
                !content.TrimStart().StartsWith("{") && !content.TrimStart().StartsWith("["))
            {
                result.HasData = false;
                result.ErrorMessage = "Invalid response format from advisory service";
                result.StatusCode = 200;
                return result;
            }

            JsonDocument doc;
            try { doc = JsonDocument.Parse(content); }
            catch (JsonException)
            {
                result.HasData = false;
                result.ErrorMessage = "Failed to parse advisory response";
                result.StatusCode = 200;
                return result;
            }

            using (doc)
            {
                var root = doc.RootElement;

                string countryName = result.CountryCode;
                if (root.TryGetProperty("destinationName", out var destNameEl) && destNameEl.ValueKind == JsonValueKind.String)
                    countryName = destNameEl.GetString() ?? result.CountryCode;
                else if (root.TryGetProperty("name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String)
                    countryName = nameEl.GetString() ?? result.CountryCode;
                result.CountryName = countryName;

                double score = 0;
                string level = "unknown", message = string.Empty, updated = string.Empty;
                int sourcesActive = 0;
                bool hasData = false;

                if (root.TryGetProperty("advisoryText", out var advisoryTextEl) && advisoryTextEl.ValueKind == JsonValueKind.String)
                {
                    message = advisoryTextEl.GetString() ?? string.Empty;
                    result.AdvisoryText = message;
                    if (!string.IsNullOrWhiteSpace(message)) hasData = true;
                }

                if (root.TryGetProperty("advisories", out var advisoriesEl) && advisoriesEl.ValueKind == JsonValueKind.Object)
                {
                    if (advisoriesEl.TryGetProperty("description", out var descEl) && descEl.ValueKind == JsonValueKind.String)
                    {
                        var longDesc = descEl.GetString() ?? string.Empty;
                        if (!string.IsNullOrWhiteSpace(longDesc))
                        {
                            result.AdvisoryLongDescription = longDesc;
                            if (string.IsNullOrWhiteSpace(message)) message = longDesc;
                            hasData = true;
                        }
                    }
                    if (advisoriesEl.TryGetProperty("regionalAdvisories", out var regionalEl) &&
                        regionalEl.ValueKind == JsonValueKind.Array && regionalEl.GetArrayLength() > 0)
                        sourcesActive++;
                }

                if (root.TryGetProperty("advisoryState", out var stateEl) && stateEl.ValueKind == JsonValueKind.Number && stateEl.TryGetDouble(out var stateScore))
                {
                    score = stateScore;
                    hasData = hasData || stateScore >= 0;
                }

                level = score switch { <= 0 => "low", >= 3 => "critical", >= 2 => "high", >= 1 => "medium", _ => "low" };

                if (root.TryGetProperty("publishedDate", out var publishedEl) && publishedEl.ValueKind == JsonValueKind.String)
                    updated = publishedEl.GetString() ?? string.Empty;
                else if (root.TryGetProperty("dateCreated", out var createdEl) && createdEl.ValueKind == JsonValueKind.String)
                    updated = createdEl.GetString() ?? string.Empty;

                if (root.TryGetProperty("hasAdvisoryWarning", out var hasWarningEl) && hasWarningEl.ValueKind == JsonValueKind.True)
                { sourcesActive++; result.HasAdvisoryWarning = true; }
                if (root.TryGetProperty("hasRegionalAdvisory", out var hasRegionalEl) && hasRegionalEl.ValueKind == JsonValueKind.True)
                { sourcesActive++; result.HasRegionalAdvisory = true; }

                if (root.TryGetProperty("recentUpdates", out var recentEl) && recentEl.ValueKind == JsonValueKind.String)
                { var recent = recentEl.GetString(); if (!string.IsNullOrWhiteSpace(recent)) result.RecentUpdates = recent; }

                ExtractHighlights(root, result);

                result.HasData = hasData;
                result.Score = score;
                result.Level = level;
                result.Message = message;
                result.Updated = updated;
                result.SourcesActive = sourcesActive;
                result.StatusCode = 200;
                return result;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching TuGo travel advisory for country {CountryCode}", result.CountryCode);
            result.HasData = false;
            result.ErrorMessage = "Error fetching travel advisory";
            result.StatusCode = 500;
            return result;
        }
    }

    private static void ExtractHighlights(JsonElement root, TravelAdvisoryResult result)
    {
        try
        {
            if (root.TryGetProperty("climate", out var climateEl) && climateEl.ValueKind == JsonValueKind.Object)
            {
                if (climateEl.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String)
                { var t = d.GetString(); if (!string.IsNullOrWhiteSpace(t)) result.ClimateSummary = t; }
                if (climateEl.TryGetProperty("climateInfo", out var ci) && ci.ValueKind == JsonValueKind.Array)
                    foreach (var item in ci.EnumerateArray())
                    { if (result.ClimateHighlights.Count >= 2) break; if (item.TryGetProperty("description", out var desc) && desc.ValueKind == JsonValueKind.String) { var t = desc.GetString(); if (!string.IsNullOrWhiteSpace(t)) result.ClimateHighlights.Add(t); } }
            }

            if (root.TryGetProperty("entryExitRequirement", out var eeEl) && eeEl.ValueKind == JsonValueKind.Object)
            {
                if (eeEl.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String)
                { var t = d.GetString(); if (!string.IsNullOrWhiteSpace(t)) { result.EntryExitHighlights.Add(t); result.EntryExitSummary = t; } }
                if (eeEl.TryGetProperty("requirementInfo", out var ri) && ri.ValueKind == JsonValueKind.Array)
                    foreach (var item in ri.EnumerateArray())
                    { if (result.EntryExitHighlights.Count >= 3) break; if (item.TryGetProperty("description", out var desc) && desc.ValueKind == JsonValueKind.String) { var t = desc.GetString(); if (!string.IsNullOrWhiteSpace(t)) result.EntryExitHighlights.Add(t); } }
            }

            if (root.TryGetProperty("health", out var healthEl) && healthEl.ValueKind == JsonValueKind.Object)
            {
                if (healthEl.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String)
                { var t = d.GetString(); if (!string.IsNullOrWhiteSpace(t)) { result.HealthHighlights.Add(t); result.HealthSummary = t; } }
                if (healthEl.TryGetProperty("healthInfo", out var hi) && hi.ValueKind == JsonValueKind.Array)
                    foreach (var item in hi.EnumerateArray())
                    { if (result.HealthHighlights.Count >= 3) break; if (item.TryGetProperty("description", out var desc) && desc.ValueKind == JsonValueKind.String) { var t = desc.GetString(); if (!string.IsNullOrWhiteSpace(t)) result.HealthHighlights.Add(t); } }
            }

            if (root.TryGetProperty("safety", out var safetyEl) && safetyEl.ValueKind == JsonValueKind.Object)
            {
                if (safetyEl.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String)
                { var t = d.GetString(); if (!string.IsNullOrWhiteSpace(t)) result.SafetySummary = t; }
                if (safetyEl.TryGetProperty("safetyInfo", out var si) && si.ValueKind == JsonValueKind.Array)
                    foreach (var item in si.EnumerateArray())
                    { if (result.SafetyHighlights.Count >= 3) break; if (item.TryGetProperty("description", out var desc) && desc.ValueKind == JsonValueKind.String) { var t = desc.GetString(); if (!string.IsNullOrWhiteSpace(t)) result.SafetyHighlights.Add(t); } }
            }
        }
        catch { }
    }
}
