using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Repositories;
using YouAndMeExpensesAPI.Utils;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Implementation of core travel domain operations (trips and related entities).
    /// Keeps controllers thin and hides persistence details behind ITravelRepository.
    /// </summary>
    public class TravelService : ITravelService
    {
        private readonly ITravelRepository _repository;
        private readonly ILogger<TravelService> _logger;

        public TravelService(ITravelRepository repository, ILogger<TravelService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<IReadOnlyList<Trip>> GetTripsAsync(string userId)
        {
            return await _repository.GetTripsForUserAsync(userId);
        }

        public async Task<Trip?> GetTripAsync(string userId, Guid tripId)
        {
            return await _repository.GetTripAsync(userId, tripId);
        }

        public async Task<Trip> CreateTripAsync(string userId, Trip trip)
        {
            trip.Id = Guid.NewGuid();
            trip.UserId = userId;
            trip.StartDate = DateTimeUtils.ToUtc(trip.StartDate);
            trip.EndDate = DateTimeUtils.ToUtc(trip.EndDate);
            trip.CreatedAt = DateTime.UtcNow;
            trip.UpdatedAt = DateTime.UtcNow;

            if (string.IsNullOrWhiteSpace(trip.TripType))
            {
                trip.TripType = "single";
            }

            await _repository.AddTripAsync(trip);
            await _repository.SaveChangesAsync();

            _logger.LogInformation("User {UserId} created trip {TripId} to {Destination}", userId, trip.Id, trip.Destination);

            return trip;
        }

        public async Task<Trip?> UpdateTripAsync(string userId, Guid tripId, Trip updates)
        {
            var existing = await _repository.GetTripAsync(userId, tripId);
            if (existing == null)
            {
                return null;
            }

            existing.Name = updates.Name;
            existing.Destination = updates.Destination;
            existing.Country = updates.Country;
            existing.Latitude = updates.Latitude;
            existing.Longitude = updates.Longitude;
            existing.StartDate = DateTimeUtils.ToUtc(updates.StartDate);
            existing.EndDate = DateTimeUtils.ToUtc(updates.EndDate);
            existing.Budget = updates.Budget;
            existing.BudgetCurrency = updates.BudgetCurrency;
            existing.Status = updates.Status;
            existing.CoverImage = updates.CoverImage;
            existing.Notes = updates.Notes;
            existing.TripType = string.IsNullOrWhiteSpace(updates.TripType) ? existing.TripType : updates.TripType;
            existing.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteTripAsync(string userId, Guid tripId)
        {
            var existing = await _repository.GetTripAsync(userId, tripId);
            if (existing == null)
            {
                return false;
            }

            await _repository.RemoveTripAsync(existing);
            await _repository.SaveChangesAsync();
            _logger.LogInformation("User {UserId} deleted trip {TripId}", userId, tripId);
            return true;
        }

        // Trip cities

        public async Task<IReadOnlyList<TripCity>?> GetTripCitiesAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetTripCitiesAsync(tripId);
        }

        public async Task<TripCity?> CreateTripCityAsync(string userId, Guid tripId, TripCity city)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            city.Id = Guid.NewGuid();
            city.TripId = tripId;
            city.StartDate = DateTimeUtils.ToUtc(city.StartDate);
            city.EndDate = DateTimeUtils.ToUtc(city.EndDate);
            city.CreatedAt = DateTime.UtcNow;
            city.UpdatedAt = DateTime.UtcNow;

            if (city.OrderIndex <= 0)
            {
                var existingCities = await _repository.GetTripCitiesForReorderAsync(tripId);
                var maxOrder = existingCities.Select(c => (int?)c.OrderIndex).Max() ?? -1;
                city.OrderIndex = maxOrder + 1;
            }

            await _repository.AddTripCityAsync(city);
            await _repository.SaveChangesAsync();
            return city;
        }

        public async Task<TripCity?> UpdateTripCityAsync(string userId, Guid tripId, Guid cityId, TripCity updates)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            var city = await _repository.GetTripCityAsync(tripId, cityId);
            if (city == null)
            {
                return null;
            }

            city.Name = updates.Name;
            city.Country = updates.Country;
            city.Latitude = updates.Latitude;
            city.Longitude = updates.Longitude;
            city.StartDate = DateTimeUtils.ToUtc(updates.StartDate);
            city.EndDate = DateTimeUtils.ToUtc(updates.EndDate);

            if (updates.OrderIndex >= 0)
            {
                city.OrderIndex = updates.OrderIndex;
            }

            city.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return city;
        }

        public async Task<bool> ReorderTripCitiesAsync(string userId, Guid tripId, List<Guid> orderedCityIds)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists || orderedCityIds == null || orderedCityIds.Count == 0)
            {
                return false;
            }

            var cities = await _repository.GetTripCitiesForReorderAsync(tripId);
            var lookup = cities.ToDictionary(c => c.Id, c => c);

            for (var index = 0; index < orderedCityIds.Count; index++)
            {
                var id = orderedCityIds[index];
                if (lookup.TryGetValue(id, out var city))
                {
                    city.OrderIndex = index;
                    city.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _repository.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteTripCityAsync(string userId, Guid tripId, Guid cityId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return false;
            }

            var city = await _repository.GetTripCityAsync(tripId, cityId);
            if (city == null)
            {
                return false;
            }

            await _repository.RemoveTripCityAsync(city);
            await _repository.SaveChangesAsync();
            return true;
        }

        // Events

        public async Task<IReadOnlyList<ItineraryEvent>?> GetEventsAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetEventsAsync(tripId);
        }

        public async Task<ItineraryEvent?> CreateEventAsync(string userId, Guid tripId, ItineraryEvent evt)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            evt.Id = Guid.NewGuid();
            evt.TripId = tripId;
            evt.Date = DateTimeUtils.ToUtc(evt.Date);
            evt.CreatedAt = DateTime.UtcNow;
            evt.UpdatedAt = DateTime.UtcNow;

            await _repository.AddEventAsync(evt);
            await _repository.SaveChangesAsync();
            return evt;
        }

        public async Task<ItineraryEvent?> UpdateEventAsync(string userId, Guid tripId, Guid eventId, ItineraryEvent updates)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            var evt = await _repository.GetEventAsync(tripId, eventId);
            if (evt == null)
            {
                return null;
            }

            evt.Type = updates.Type;
            evt.Name = updates.Name;
            evt.Date = DateTimeUtils.ToUtc(updates.Date);
            evt.StartTime = updates.StartTime;
            evt.EndTime = updates.EndTime;
            evt.Location = updates.Location;
            evt.Address = updates.Address;
            evt.Latitude = updates.Latitude;
            evt.Longitude = updates.Longitude;
            evt.ConfirmationNumber = updates.ConfirmationNumber;
            evt.Notes = updates.Notes;
            evt.FlightNumber = updates.FlightNumber;
            evt.Airline = updates.Airline;
            evt.DepartureAirport = updates.DepartureAirport;
            evt.ArrivalAirport = updates.ArrivalAirport;
            evt.CheckInTime = updates.CheckInTime;
            evt.CheckOutTime = updates.CheckOutTime;
            evt.RoomType = updates.RoomType;
            evt.Status = updates.Status;
            evt.ReminderMinutes = updates.ReminderMinutes;
            evt.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return evt;
        }

        public async Task<bool> DeleteEventAsync(string userId, Guid tripId, Guid eventId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return false;
            }

            var evt = await _repository.GetEventAsync(tripId, eventId);
            if (evt == null)
            {
                return false;
            }

            await _repository.RemoveEventAsync(evt);
            await _repository.SaveChangesAsync();
            return true;
        }

        // Packing items

        public async Task<IReadOnlyList<PackingItem>?> GetPackingItemsAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetPackingItemsAsync(tripId);
        }

        public async Task<PackingItem?> CreatePackingItemAsync(string userId, Guid tripId, PackingItem item)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            item.Id = Guid.NewGuid();
            item.TripId = tripId;
            item.CreatedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            await _repository.AddPackingItemAsync(item);
            await _repository.SaveChangesAsync();
            return item;
        }

        public async Task<PackingItem?> UpdatePackingItemAsync(string userId, Guid tripId, Guid itemId, PackingItem updates)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            var item = await _repository.GetPackingItemAsync(tripId, itemId);
            if (item == null)
            {
                return null;
            }

            item.Category = updates.Category;
            item.Name = updates.Name;
            item.Quantity = updates.Quantity;
            item.IsChecked = updates.IsChecked;
            item.IsEssential = updates.IsEssential;
            item.Notes = updates.Notes;
            item.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return item;
        }

        public async Task<bool> DeletePackingItemAsync(string userId, Guid tripId, Guid itemId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return false;
            }

            var item = await _repository.GetPackingItemAsync(tripId, itemId);
            if (item == null)
            {
                return false;
            }

            await _repository.RemovePackingItemAsync(item);
            await _repository.SaveChangesAsync();
            return true;
        }

        // Documents

        public async Task<IReadOnlyList<TravelDocument>?> GetDocumentsAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetDocumentsAsync(tripId);
        }

        public async Task<TravelDocument?> CreateDocumentAsync(string userId, Guid tripId, TravelDocument document)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            document.Id = Guid.NewGuid();
            document.TripId = tripId;
            document.ExpiryDate = DateTimeUtils.ToUtc(document.ExpiryDate);
            document.IssueDate = DateTimeUtils.ToUtc(document.IssueDate);
            document.CreatedAt = DateTime.UtcNow;
            document.UpdatedAt = DateTime.UtcNow;

            await _repository.AddDocumentAsync(document);
            await _repository.SaveChangesAsync();
            return document;
        }

        public async Task<TravelDocument?> UpdateDocumentAsync(string userId, Guid tripId, Guid documentId, TravelDocument updates)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            var document = await _repository.GetDocumentAsync(tripId, documentId);
            if (document == null)
            {
                return null;
            }

            document.Type = updates.Type;
            document.Name = updates.Name;
            document.DocumentNumber = updates.DocumentNumber;
            document.ExpiryDate = DateTimeUtils.ToUtc(updates.ExpiryDate);
            document.IssueDate = DateTimeUtils.ToUtc(updates.IssueDate);
            document.IssuingCountry = updates.IssuingCountry;
            document.FileUrl = updates.FileUrl;
            document.FileThumbnail = updates.FileThumbnail;
            document.Notes = updates.Notes;
            document.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return document;
        }

        public async Task<bool> DeleteDocumentAsync(string userId, Guid tripId, Guid documentId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return false;
            }

            var document = await _repository.GetDocumentAsync(tripId, documentId);
            if (document == null)
            {
                return false;
            }

            await _repository.RemoveDocumentAsync(document);
            await _repository.SaveChangesAsync();
            return true;
        }

        // Expenses

        public async Task<IReadOnlyList<TravelExpense>?> GetExpensesAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetExpensesAsync(tripId);
        }

        public async Task<TravelExpense?> CreateExpenseAsync(string userId, Guid tripId, TravelExpense expense)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            expense.Id = Guid.NewGuid();
            expense.TripId = tripId;
            expense.Date = DateTimeUtils.ToUtc(expense.Date);
            expense.CreatedAt = DateTime.UtcNow;
            expense.UpdatedAt = DateTime.UtcNow;

            if (expense.AmountInBaseCurrency == 0)
            {
                expense.AmountInBaseCurrency = expense.Amount;
            }

            await _repository.AddExpenseAsync(expense);
            await _repository.SaveChangesAsync();
            return expense;
        }

        public async Task<TravelExpense?> UpdateExpenseAsync(string userId, Guid tripId, Guid expenseId, TravelExpense updates)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            var expense = await _repository.GetExpenseAsync(tripId, expenseId);
            if (expense == null)
            {
                return null;
            }

            expense.Category = updates.Category;
            expense.Amount = updates.Amount;
            expense.Currency = updates.Currency;
            expense.AmountInBaseCurrency = updates.AmountInBaseCurrency;
            expense.ExchangeRate = updates.ExchangeRate;
            expense.Description = updates.Description;
            expense.Date = DateTimeUtils.ToUtc(updates.Date);
            expense.PaymentMethod = updates.PaymentMethod;
            expense.ReceiptUrl = updates.ReceiptUrl;
            expense.Notes = updates.Notes;
            expense.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return expense;
        }

        public async Task<bool> DeleteExpenseAsync(string userId, Guid tripId, Guid expenseId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return false;
            }

            var expense = await _repository.GetExpenseAsync(tripId, expenseId);
            if (expense == null)
            {
                return false;
            }

            await _repository.RemoveExpenseAsync(expense);
            await _repository.SaveChangesAsync();
            return true;
        }
    }

    /// <summary>
    /// Implementation of the geocoding service using Nominatim (OpenStreetMap).
    /// </summary>
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
            string query,
            int limit,
            CancellationToken cancellationToken = default)
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
                {
                    return (Array.Empty<TravelLocationResult>(), 200, null);
                }

                var transformed = results.Select(r =>
                {
                    string displayName = r.TryGetProperty("display_name", out var displayNameElement)
                        ? displayNameElement.GetString() ?? string.Empty
                        : string.Empty;

                    JsonElement addressElement;
                    string cityName = string.Empty;
                    string countryName = string.Empty;

                    if (r.TryGetProperty("address", out addressElement) && addressElement.ValueKind == JsonValueKind.Object)
                    {
                        if (addressElement.TryGetProperty("city", out var city))
                        {
                            cityName = city.GetString() ?? string.Empty;
                        }
                        else if (addressElement.TryGetProperty("town", out var town))
                        {
                            cityName = town.GetString() ?? string.Empty;
                        }
                        else if (addressElement.TryGetProperty("village", out var village))
                        {
                            cityName = village.GetString() ?? string.Empty;
                        }
                        else if (addressElement.TryGetProperty("hamlet", out var hamlet))
                        {
                            cityName = hamlet.GetString() ?? string.Empty;
                        }

                        if (addressElement.TryGetProperty("country", out var country))
                        {
                            countryName = country.GetString() ?? string.Empty;
                        }
                    }

                    if (string.IsNullOrWhiteSpace(cityName) && !string.IsNullOrWhiteSpace(displayName))
                    {
                        cityName = displayName.Split(',')[0].Trim();
                    }

                    double latitude = 0.0;
                    double longitude = 0.0;

                    if (r.TryGetProperty("lat", out var lat) && double.TryParse(lat.GetString(), out var latVal))
                    {
                        latitude = latVal;
                    }

                    if (r.TryGetProperty("lon", out var lon) && double.TryParse(lon.GetString(), out var lonVal))
                    {
                        longitude = lonVal;
                    }

                    return new TravelLocationResult
                    {
                        Name = cityName,
                        FullName = displayName,
                        Country = countryName,
                        Latitude = latitude,
                        Longitude = longitude
                    };
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

    /// <summary>
    /// Implementation of the travel advisory service using TuGo TravelSafe API.
    /// </summary>
    public class TravelAdvisoryService : ITravelAdvisoryService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<TravelAdvisoryService> _logger;
        private readonly HttpClient _httpClient;

        public TravelAdvisoryService(IConfiguration configuration, ILogger<TravelAdvisoryService> logger, HttpClient httpClient)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClient;
        }

        public async Task<TravelAdvisoryResult> GetAdvisoryAsync(string countryCode, CancellationToken cancellationToken = default)
        {
            var result = new TravelAdvisoryResult
            {
                CountryCode = countryCode.Trim().ToUpperInvariant()
            };

            try
            {
                var apiKey = _configuration["TuGo:ApiKey"];
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    _logger.LogWarning("TuGo API key is not configured. Unable to fetch travel advisory for {CountryCode}", result.CountryCode);
                    result.HasData = false;
                    result.ErrorMessage = "Advisory service unavailable";
                    return result;
                }

                var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

                if (string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
                {
                    _httpClient.DefaultRequestHeaders.ExpectContinue = false;
                }

                _httpClient.DefaultRequestHeaders.UserAgent.Clear();
                _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("YouMeExpenses-TravelAdvisory", "1.0"));
                _httpClient.Timeout = TimeSpan.FromSeconds(10);

                var url = $"https://api.tugo.com/v1/travelsafe/countries/{Uri.EscapeDataString(result.CountryCode)}?lang=en";

                _httpClient.DefaultRequestHeaders.Remove("Auth-Key");
                _httpClient.DefaultRequestHeaders.Add("Auth-Key", apiKey);

                _logger.LogInformation("Fetching TuGo travel advisory from {Url} for country {CountryCode}", url, result.CountryCode);

                var response = await _httpClient.GetAsync(url, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "TuGo API returned {StatusCode} {StatusText} for country {CountryCode}. Response URL: {ResponseUrl}",
                        response.StatusCode,
                        response.ReasonPhrase,
                        result.CountryCode,
                        response.RequestMessage?.RequestUri);

                    result.HasData = false;
                    result.ErrorMessage = "Advisory service unavailable";
                    result.StatusCode = (int)response.StatusCode;
                    return result;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
                if (!contentType.Contains("json", StringComparison.OrdinalIgnoreCase) &&
                    !content.TrimStart().StartsWith("{") &&
                    !content.TrimStart().StartsWith("["))
                {
                    _logger.LogWarning(
                        "TuGo API returned non-JSON content (Content-Type: {ContentType}) for country {CountryCode}. Content preview: {Preview}",
                        contentType,
                        result.CountryCode,
                        content.Length > 200 ? content[..200] : content);

                    result.HasData = false;
                    result.ErrorMessage = "Invalid response format from advisory service";
                    result.StatusCode = 200;
                    return result;
                }

                JsonDocument doc;
                try
                {
                    doc = JsonDocument.Parse(content);
                }
                catch (JsonException ex)
                {
                    _logger.LogError(
                        ex,
                        "Failed to parse TuGo API JSON response for country {CountryCode}. Content: {Content}",
                        result.CountryCode,
                        content.Length > 500 ? content[..500] : content);

                    result.HasData = false;
                    result.ErrorMessage = "Failed to parse advisory response";
                    result.StatusCode = 200;
                    return result;
                }

                using (doc)
                {
                    var root = doc.RootElement;

                    string countryName = result.CountryCode;
                    if (root.TryGetProperty("destinationName", out var destNameElement) &&
                        destNameElement.ValueKind == JsonValueKind.String)
                    {
                        countryName = destNameElement.GetString() ?? result.CountryCode;
                    }
                    else if (root.TryGetProperty("countryName", out var countryNameElement) &&
                             countryNameElement.ValueKind == JsonValueKind.String)
                    {
                        countryName = countryNameElement.GetString() ?? result.CountryCode;
                    }

                    result.CountryName = countryName;

                    double score = 0;
                    string level = "unknown";
                    string message = string.Empty;
                    string updated = string.Empty;
                    int sourcesActive = 0;
                    bool hasData = false;

                    if (root.TryGetProperty("advisories", out var advisoriesElement) &&
                        advisoriesElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var adv in advisoriesElement.EnumerateArray())
                        {
                            hasData = true;

                            if (string.IsNullOrEmpty(message))
                            {
                                if (adv.TryGetProperty("description", out var descEl) &&
                                    descEl.ValueKind == JsonValueKind.String)
                                {
                                    message = descEl.GetString() ?? string.Empty;
                                }
                                else if (adv.TryGetProperty("text", out var textEl) &&
                                         textEl.ValueKind == JsonValueKind.String)
                                {
                                    message = textEl.GetString() ?? string.Empty;
                                }
                                else if (adv.TryGetProperty("message", out var msgEl) &&
                                         msgEl.ValueKind == JsonValueKind.String)
                                {
                                    message = msgEl.GetString() ?? string.Empty;
                                }
                            }

                            if (string.IsNullOrEmpty(updated))
                            {
                                if (adv.TryGetProperty("updatedDate", out var updEl) &&
                                    updEl.ValueKind == JsonValueKind.String)
                                {
                                    updated = updEl.GetString() ?? string.Empty;
                                }
                                else if (adv.TryGetProperty("lastUpdated", out var lastUpdEl) &&
                                         lastUpdEl.ValueKind == JsonValueKind.String)
                                {
                                    updated = lastUpdEl.GetString() ?? string.Empty;
                                }
                            }

                            if (adv.TryGetProperty("severity", out var severityEl))
                            {
                                if (severityEl.ValueKind == JsonValueKind.Number &&
                                    severityEl.TryGetDouble(out var sev))
                                {
                                    score = sev;
                                }
                                else if (severityEl.ValueKind == JsonValueKind.String)
                                {
                                    var sevStr = severityEl.GetString();
                                    if (!string.IsNullOrWhiteSpace(sevStr))
                                    {
                                        level = sevStr.ToLowerInvariant();
                                    }
                                }
                            }
                            else if (adv.TryGetProperty("level", out var levelEl))
                            {
                                if (levelEl.ValueKind == JsonValueKind.Number &&
                                    levelEl.TryGetDouble(out var lvlNum))
                                {
                                    score = lvlNum;
                                }
                                else if (levelEl.ValueKind == JsonValueKind.String)
                                {
                                    var lvlStr = levelEl.GetString();
                                    if (!string.IsNullOrWhiteSpace(lvlStr))
                                    {
                                        level = lvlStr.ToLowerInvariant();
                                    }
                                }
                            }

                            break;
                        }
                    }

                    result.HasData = hasData;
                    result.Score = score;
                    result.Level = level;
                    result.Message = message;
                    result.Updated = updated;
                    result.SourcesActive = sourcesActive;
                    result.StatusCode = 200;

                    if (!hasData)
                    {
                        return result;
                    }

                    if (level == "unknown" && score > 0)
                    {
                        result.Level = score switch
                        {
                            >= 4.0 => "critical",
                            >= 3.0 => "high",
                            >= 2.0 => "medium",
                            > 0.0 => "low",
                            _ => "unknown"
                        };
                    }

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
    }

    /// <summary>
    /// Implementation of the attachment service, delegating file storage to IStorageService.
    /// </summary>
    public class TravelAttachmentService : ITravelAttachmentService
    {
        private readonly ITravelRepository _repository;
        private readonly IStorageService _storageService;
        private readonly ILogger<TravelAttachmentService> _logger;

        // 5MB max attachment size (same as previous controller constant)
        private const long MaxBytes = 5 * 1024 * 1024;

        public TravelAttachmentService(
            ITravelRepository repository,
            IStorageService storageService,
            ILogger<TravelAttachmentService> logger)
        {
            _repository = repository;
            _storageService = storageService;
            _logger = logger;
        }

        public async Task<(TravelAttachmentDto? attachment, string? errorMessage, int? statusCode)> UploadAttachmentAsync(
            string userId,
            Guid tripId,
            IFormFile file,
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                return (null, "No file uploaded", 400);
            }

            if (file.Length > MaxBytes)
            {
                return (null, "File too large. Max size is 5MB.", 400);
            }

            try
            {
                var tripExists = await _repository.TripExistsForUserAsync(tripId, userId);
                if (!tripExists)
                {
                    return (null, "Trip not found", 404);
                }

                var extension = Path.GetExtension(file.FileName);
                var storageFileName = $"travel/{userId}/{tripId}/{Guid.NewGuid()}{extension}";

                // Reuse the existing Supabase/S3 bucket used for receipts to avoid extra config
                var url = await _storageService.UploadFileAsync(file, storageFileName, "receipts");

                var dto = new TravelAttachmentDto
                {
                    Url = url,
                    Name = file.FileName,
                    Type = file.ContentType,
                    Size = file.Length,
                    Path = storageFileName
                };

                return (dto, null, 200);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading travel attachment for trip {TripId}", tripId);
                return (null, "Error uploading attachment", 500);
            }
        }
    }
}

