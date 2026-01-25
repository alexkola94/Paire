using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
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

        // Layout preferences

        public async Task<TripLayoutPreferences?> GetLayoutPreferencesAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetLayoutPreferencesAsync(tripId);
        }

        public async Task<TripLayoutPreferences> SaveLayoutPreferencesAsync(string userId, Guid tripId, string layoutConfig, string? preset)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                throw new InvalidOperationException("Trip not found");
            }

            var existing = await _repository.GetLayoutPreferencesAsync(tripId);

            if (existing != null)
            {
                existing.LayoutConfig = layoutConfig;
                existing.Preset = preset;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new TripLayoutPreferences
                {
                    Id = Guid.NewGuid(),
                    TripId = tripId,
                    LayoutConfig = layoutConfig,
                    Preset = preset,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _repository.AddLayoutPreferencesAsync(existing);
            }

            await _repository.SaveChangesAsync();
            return existing;
        }

        // Saved Places

        public async Task<IReadOnlyList<SavedPlace>?> GetSavedPlacesAsync(string userId, Guid tripId)
        {
            var trip = await _repository.GetTripAsync(userId, tripId);
            if (trip == null) return null;

            return await _repository.GetSavedPlacesAsync(tripId);
        }

        public async Task<SavedPlace?> CreateSavedPlaceAsync(string userId, Guid tripId, SavedPlace place)
        {
            var trip = await _repository.GetTripAsync(userId, tripId);
            if (trip == null) return null;

            place.TripId = tripId;
            place.UserId = userId;
            place.Id = Guid.NewGuid(); // Ensure ID is generated
            place.CreatedAt = DateTime.UtcNow;
            place.UpdatedAt = DateTime.UtcNow;

            await _repository.AddSavedPlaceAsync(place);
            await _repository.SaveChangesAsync();

            return place;
        }

        public async Task<bool> DeleteSavedPlaceAsync(string userId, Guid tripId, Guid placeId)
        {
            var trip = await _repository.GetTripAsync(userId, tripId);
            if (trip == null) return false;

            var existing = await _repository.GetSavedPlaceAsync(tripId, placeId);
            if (existing == null) return false;

            await _repository.RemoveSavedPlaceAsync(existing);
            await _repository.SaveChangesAsync();

            return true;
        }

        // Notes

        public async Task<IReadOnlyList<TravelNote>?> GetNotesAsync(string userId, Guid tripId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            return await _repository.GetNotesAsync(tripId);
        }

        public async Task<TravelNote?> CreateNoteAsync(string userId, Guid tripId, TravelNote note)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            note.Id = Guid.NewGuid();
            note.TripId = tripId;
            note.CreatedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            await _repository.AddNoteAsync(note);
            await _repository.SaveChangesAsync();
            return note;
        }

        public async Task<TravelNote?> UpdateNoteAsync(string userId, Guid tripId, Guid noteId, TravelNote updates)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return null;
            }

            var note = await _repository.GetNoteAsync(tripId, noteId);
            if (note == null)
            {
                return null;
            }

            note.Title = updates.Title;
            note.Body = updates.Body;
            note.UpdatedAt = DateTime.UtcNow;

            await _repository.SaveChangesAsync();
            return note;
        }

        public async Task<bool> DeleteNoteAsync(string userId, Guid tripId, Guid noteId)
        {
            var exists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!exists)
            {
                return false;
            }

            var note = await _repository.GetNoteAsync(tripId, noteId);
            if (note == null)
            {
                return false;
            }

            await _repository.RemoveNoteAsync(note);
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

        // Global in-memory maps built from Data/CountryCodes.json on first use.
        private static readonly Dictionary<string, string> CountryNameToIso2 =
            new(StringComparer.OrdinalIgnoreCase);
        private static readonly HashSet<string> KnownIsoCodes =
            new(StringComparer.OrdinalIgnoreCase);
        private static bool _countryMapInitialised;
        private static readonly object CountryMapLock = new();

        private static void EnsureCountryMapInitialised()
        {
            if (_countryMapInitialised)
            {
                return;
            }

            lock (CountryMapLock)
            {
                if (_countryMapInitialised)
                {
                    return;
                }

                try
                {
                    // CountryCodes.json is copied to the application base directory
                    // via the project file configuration.
                    var basePath = AppContext.BaseDirectory;
                    var filePath = Path.Combine(basePath, "Data", "CountryCodes.json");
                    if (!File.Exists(filePath))
                    {
                        return;
                    }

                    var json = File.ReadAllText(filePath);
                    var entries = JsonSerializer.Deserialize<List<CountryCodeEntry>>(json);
                    if (entries == null)
                    {
                        return;
                    }

                    foreach (var entry in entries)
                    {
                        if (string.IsNullOrWhiteSpace(entry.Iso2))
                        {
                            continue;
                        }

                        KnownIsoCodes.Add(entry.Iso2);

                        if (!string.IsNullOrWhiteSpace(entry.Name))
                        {
                            // Normalise keys to upper-case so lookups using ToUpperInvariant succeed.
                            CountryNameToIso2[entry.Name.ToUpperInvariant()] = entry.Iso2;
                        }

                        if (entry.Aliases != null)
                        {
                            foreach (var alias in entry.Aliases)
                            {
                                if (!string.IsNullOrWhiteSpace(alias))
                                {
                                    CountryNameToIso2[alias.ToUpperInvariant()] = entry.Iso2;
                                }
                            }
                        }
                    }
                }
                catch
                {
                    // If anything goes wrong, we simply fall back to basic behaviour.
                }
                finally
                {
                    _countryMapInitialised = true;
                }
            }
        }

        private sealed class CountryCodeEntry
        {
            [JsonPropertyName("name")]
            public string Name { get; set; } = string.Empty;

            [JsonPropertyName("iso2")]
            public string Iso2 { get; set; } = string.Empty;

            [JsonPropertyName("iso3")]
            public string? Iso3 { get; set; }

            [JsonPropertyName("aliases")]
            public List<string>? Aliases { get; set; }
        }

        /// <summary>
        /// Normalise input country values to an ISO-style code TuGo expects.
        /// - If already a 2/3 letter code, return upper-cased.
        /// - If it's a full name like "GREECE", map via CountryNameToIso2 when possible.
        /// </summary>
        private static string NormalizeToIsoCode(string raw)
        {
            EnsureCountryMapInitialised();

            if (string.IsNullOrWhiteSpace(raw))
            {
                return string.Empty;
            }

            var trimmed = raw.Trim();

            // If this already looks like a code (2–3 letters, no spaces) and we know it,
            // just upper-case it.
            if (trimmed.Length is 2 or 3 &&
                trimmed.All(char.IsLetter) &&
                (KnownIsoCodes.Count == 0 || KnownIsoCodes.Contains(trimmed)))
            {
                return trimmed.ToUpperInvariant();
            }

            // Otherwise treat it as a name and attempt lookup.
            if (CountryNameToIso2.TryGetValue(trimmed, out var iso))
            {
                return iso;
            }

            // Hardening: handle a few very common full names explicitly even if
            // the JSON map failed to load for some reason.
            var upper = trimmed.ToUpperInvariant();
            switch (upper)
            {
                case "UNITED KINGDOM":
                case "UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND":
                case "GREAT BRITAIN":
                    return "GB";
                case "GREECE":
                case "HELLENIC REPUBLIC":
                    return "GR";
                case "UNITED STATES":
                case "UNITED STATES OF AMERICA":
                case "USA":
                    return "US";
                case "NORTH MACEDONIA":
                case "REPUBLIC OF NORTH MACEDONIA":
                    return "MK";
            }

            // Fallback: upper-case the original; TuGo may still recognise some names.
            return upper;
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

            var result = new TravelAdvisoryResult
            {
                CountryCode = normalizedCode
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
                _httpClient.Timeout = TimeSpan.FromSeconds(60);

                var url = $"https://api.tugo.com/v1/travelsafe/countries/{Uri.EscapeDataString(result.CountryCode)}";

                // TuGo API samples use the X-Auth-API-Key header for authentication.
                // We normalise the header each call to avoid duplicates.
                _httpClient.DefaultRequestHeaders.Remove("Auth-Key");
                _httpClient.DefaultRequestHeaders.Remove("X-Auth-API-Key");
                _httpClient.DefaultRequestHeaders.Add("X-Auth-API-Key", apiKey);

                _logger.LogInformation("Fetching TuGo travel advisory from {Url} for country {CountryCode}", url, result.CountryCode);

                HttpResponseMessage response;
                try
                {
                    // Wrap the outbound call so timeouts are handled gracefully and
                    // do not bubble up as noisy errors for the rest of the pipeline.
                    response = await _httpClient.GetAsync(url, cancellationToken);
                }
                catch (TaskCanceledException tex) when (!cancellationToken.IsCancellationRequested)
                {
                    // This usually means HttpClient.Timeout was reached.
                    _logger.LogWarning(
                        tex,
                        "TuGo travel advisory request timed out for country {CountryCode} after {TimeoutSeconds} seconds",
                        result.CountryCode,
                        _httpClient.Timeout.TotalSeconds);

                    result.HasData = false;
                    result.ErrorMessage = "Advisory service timeout";
                    result.StatusCode = 504; // Gateway Timeout semantics for external API
                    return result;
                }

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

                    // -------------------------------
                    // Country name normalisation
                    // -------------------------------
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
                    else if (root.TryGetProperty("name", out var nameElement) &&
                             nameElement.ValueKind == JsonValueKind.String)
                    {
                        countryName = nameElement.GetString() ?? result.CountryCode;
                    }

                    result.CountryName = countryName;

                    // -------------------------------
                    // Core advisory mapping
                    // TuGo sample shape (per user):
                    // {
                    //   "advisories": { "description": "...", "regionalAdvisories": [] },
                    //   "advisoryState": 0,
                    //   "advisoryText": "Exercise normal security precautions",
                    //   "dateCreated": "...",
                    //   "publishedDate": "...",
                    //   "hasAdvisoryWarning": false,
                    //   "hasRegionalAdvisory": false,
                    //   ...
                    // }
                    // -------------------------------

                    double score = 0;
                    string level = "unknown";
                    string message = string.Empty;
                    string updated = string.Empty;
                    int sourcesActive = 0;
                    bool hasData = false;

                    // advisoryText is a concise, user‑friendly summary
                    if (root.TryGetProperty("advisoryText", out var advisoryTextEl) &&
                        advisoryTextEl.ValueKind == JsonValueKind.String)
                    {
                        message = advisoryTextEl.GetString() ?? string.Empty;
                        result.AdvisoryText = message;
                        if (!string.IsNullOrWhiteSpace(message))
                        {
                            hasData = true;
                        }
                    }

                    // Fallback / additional detail from advisories.description
                    if (root.TryGetProperty("advisories", out var advisoriesElement) &&
                        advisoriesElement.ValueKind == JsonValueKind.Object)
                    {
                        if (advisoriesElement.TryGetProperty("description", out var descEl) &&
                            descEl.ValueKind == JsonValueKind.String)
                        {
                            var longDescription = descEl.GetString() ?? string.Empty;
                            if (!string.IsNullOrWhiteSpace(longDescription))
                            {
                                // Expose full text for richer UIs while still keeping a short message.
                                result.AdvisoryLongDescription = longDescription;
                                // If we don't have a short message yet, use this.
                                if (string.IsNullOrWhiteSpace(message))
                                {
                                    message = longDescription;
                                }

                                hasData = true;
                            }
                        }

                        // Regional advisories presence can be treated as an additional "source".
                        if (advisoriesElement.TryGetProperty("regionalAdvisories", out var regionalEl) &&
                            (regionalEl.ValueKind == JsonValueKind.Array && regionalEl.GetArrayLength() > 0))
                        {
                            sourcesActive++;
                        }
                    }

                    // advisoryState is a numeric risk indicator; we treat it as the score.
                    if (root.TryGetProperty("advisoryState", out var advisoryStateEl) &&
                        advisoryStateEl.ValueKind == JsonValueKind.Number &&
                        advisoryStateEl.TryGetDouble(out var stateScore))
                    {
                        score = stateScore;
                        hasData = hasData || stateScore >= 0;
                    }

                    // Map advisoryState to a friendly severity level when possible.
                    // 0 = normal, 1 = caution, 2 = avoid non-essential, 3 = avoid travel.
                    if (level == "unknown")
                    {
                        level = score switch
                        {
                            <= 0 => "low",
                            >= 3 => "critical",
                            >= 2 => "high",
                            >= 1 => "medium",
                            _ => "low"
                        };
                    }

                    // updated / published date
                    if (root.TryGetProperty("publishedDate", out var publishedEl) &&
                        publishedEl.ValueKind == JsonValueKind.String)
                    {
                        updated = publishedEl.GetString() ?? string.Empty;
                    }
                    else if (root.TryGetProperty("dateCreated", out var createdEl) &&
                             createdEl.ValueKind == JsonValueKind.String)
                    {
                        updated = createdEl.GetString() ?? string.Empty;
                    }

                    // Additional signal: if TuGo flags any warnings, treat as active sources.
                    if (root.TryGetProperty("hasAdvisoryWarning", out var hasWarningEl) &&
                        hasWarningEl.ValueKind == JsonValueKind.True)
                    {
                        sourcesActive++;
                        result.HasAdvisoryWarning = true;
                    }

                    if (root.TryGetProperty("hasRegionalAdvisory", out var hasRegionalEl) &&
                        hasRegionalEl.ValueKind == JsonValueKind.True)
                    {
                        sourcesActive++;
                        result.HasRegionalAdvisory = true;
                    }

                    // Recent updates from TuGo (plain text summary).
                    if (root.TryGetProperty("recentUpdates", out var recentUpdatesEl) &&
                        recentUpdatesEl.ValueKind == JsonValueKind.String)
                    {
                        var recent = recentUpdatesEl.GetString();
                        if (!string.IsNullOrWhiteSpace(recent))
                        {
                            result.RecentUpdates = recent;
                        }
                    }

                    // ----------------------------------------------------
                    // Rich highlight extraction for frontend "More details"
                    // ----------------------------------------------------
                    try
                    {
                        // Climate highlights – take up to 2 climateInfo descriptions.
                        if (root.TryGetProperty("climate", out var climateEl) &&
                            climateEl.ValueKind == JsonValueKind.Object)
                        {
                            if (climateEl.TryGetProperty("description", out var climateDescEl) &&
                                climateDescEl.ValueKind == JsonValueKind.String)
                            {
                                var text = climateDescEl.GetString();
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    result.ClimateSummary = text;
                                }
                            }

                            if (climateEl.TryGetProperty("climateInfo", out var climateInfoEl) &&
                                climateInfoEl.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in climateInfoEl.EnumerateArray())
                                {
                                    if (result.ClimateHighlights.Count >= 2) break;
                                    if (item.TryGetProperty("description", out var desc) &&
                                        desc.ValueKind == JsonValueKind.String)
                                    {
                                        var text = desc.GetString();
                                        if (!string.IsNullOrWhiteSpace(text))
                                        {
                                            result.ClimateHighlights.Add(text);
                                        }
                                    }
                                }
                            }
                        }

                        // Entry / exit highlights – top-level description + first 2 requirementInfo items.
                        if (root.TryGetProperty("entryExitRequirement", out var entryExitEl) &&
                            entryExitEl.ValueKind == JsonValueKind.Object)
                        {
                            if (entryExitEl.TryGetProperty("description", out var entryDesc) &&
                                entryDesc.ValueKind == JsonValueKind.String)
                            {
                                var text = entryDesc.GetString();
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    result.EntryExitHighlights.Add(text);
                                    result.EntryExitSummary = text;
                                }
                            }

                            if (entryExitEl.TryGetProperty("requirementInfo", out var reqInfoEl) &&
                                reqInfoEl.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in reqInfoEl.EnumerateArray())
                                {
                                    if (result.EntryExitHighlights.Count >= 3) break;

                                    if (item.TryGetProperty("description", out var desc) &&
                                        desc.ValueKind == JsonValueKind.String)
                                    {
                                        var text = desc.GetString();
                                        if (!string.IsNullOrWhiteSpace(text))
                                        {
                                            result.EntryExitHighlights.Add(text);
                                        }
                                    }
                                }
                            }
                        }

                        // Health highlights – global description + up to 2 healthInfo blocks.
                        if (root.TryGetProperty("health", out var healthEl) &&
                            healthEl.ValueKind == JsonValueKind.Object)
                        {
                            if (healthEl.TryGetProperty("description", out var healthDesc) &&
                                healthDesc.ValueKind == JsonValueKind.String)
                            {
                                var text = healthDesc.GetString();
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    result.HealthHighlights.Add(text);
                                    result.HealthSummary = text;
                                }
                            }

                            if (healthEl.TryGetProperty("healthInfo", out var healthInfoEl) &&
                                healthInfoEl.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in healthInfoEl.EnumerateArray())
                                {
                                    if (result.HealthHighlights.Count >= 3) break;

                                    if (item.TryGetProperty("description", out var desc) &&
                                        desc.ValueKind == JsonValueKind.String)
                                    {
                                        var text = desc.GetString();
                                        if (!string.IsNullOrWhiteSpace(text))
                                        {
                                            result.HealthHighlights.Add(text);
                                        }
                                    }
                                }
                            }
                        }

                        // Safety highlights – up to 3 key safetyInfo descriptions.
                        if (root.TryGetProperty("safety", out var safetyEl) &&
                            safetyEl.ValueKind == JsonValueKind.Object &&
                            safetyEl.TryGetProperty("safetyInfo", out var safetyInfoEl) &&
                            safetyInfoEl.ValueKind == JsonValueKind.Array)
                        {
                            if (safetyEl.TryGetProperty("description", out var safetyDescEl) &&
                                safetyDescEl.ValueKind == JsonValueKind.String)
                            {
                                var text = safetyDescEl.GetString();
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    result.SafetySummary = text;
                                }
                            }

                            foreach (var item in safetyInfoEl.EnumerateArray())
                            {
                                if (result.SafetyHighlights.Count >= 3) break;

                                if (item.TryGetProperty("description", out var desc) &&
                                    desc.ValueKind == JsonValueKind.String)
                                {
                                    var text = desc.GetString();
                                    if (!string.IsNullOrWhiteSpace(text))
                                    {
                                        result.SafetyHighlights.Add(text);
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Failed to extract rich highlights from TuGo advisory payload for {CountryCode}", result.CountryCode);
                    }

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

