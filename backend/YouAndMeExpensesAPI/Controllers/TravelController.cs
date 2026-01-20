using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using YouAndMeExpensesAPI.Services;
using Microsoft.Extensions.Configuration;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Travel Controller - CRUD operations for travel planning
    /// Supports offline-first sync with frontend IndexedDB
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/travel")]
    public class TravelController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TravelController> _logger;
        private readonly IStorageService _storageService;
        private readonly IConfiguration _configuration;

        public TravelController(
            AppDbContext context,
            ILogger<TravelController> logger,
            IStorageService storageService,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _storageService = storageService;
            _configuration = configuration;
        }

        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

        /// <summary>
        /// Ensure DateTime is in UTC format for PostgreSQL
        /// </summary>
        private static DateTime? ToUtc(DateTime? date)
        {
            if (!date.HasValue) return null;
            return date.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(date.Value, DateTimeKind.Utc)
                : date.Value.ToUniversalTime();
        }

        private static DateTime ToUtc(DateTime date)
        {
            return date.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(date, DateTimeKind.Utc)
                : date.ToUniversalTime();
        }

        // ========================================
        // GEOCODING
        // ========================================

        /// <summary>
        /// Search for locations using Nominatim (OpenStreetMap)
        /// Proxies requests to avoid CORS issues, especially on mobile
        /// </summary>
        [HttpGet("geocode")]
        public async Task<IActionResult> GeocodeLocation([FromQuery] string q, [FromQuery] int limit = 5)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 3)
            {
                return BadRequest(new { message = "Query must be at least 3 characters" });
            }

            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("User-Agent", "TravelCommandCenter/1.0");
                
                var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(q)}&format=json&limit={limit}&addressdetails=1";
                var response = await httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Nominatim API returned {StatusCode} for query: {Query}", 
                        response.StatusCode, q);
                    return StatusCode((int)response.StatusCode, 
                        new { message = "Geocoding service unavailable" });
                }

                var content = await response.Content.ReadAsStringAsync();
                var results = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(content);

                // If no results, return empty list (avoids null + anonymous-type issues)
                if (results == null || results.Count == 0)
                {
                    return Ok(new List<object>());
                }

                // Transform results to match frontend expectations
                var transformedResults = results.Select(r =>
                {
                    // Extract display_name once
                    string displayName = r.TryGetProperty("display_name", out var displayNameElement)
                        ? displayNameElement.GetString() ?? string.Empty
                        : string.Empty;

                    // Extract address object (may contain city/town/etc.)
                    System.Text.Json.JsonElement addressElement;
                    string cityName = string.Empty;
                    string countryName = string.Empty;

                    if (r.TryGetProperty("address", out addressElement) && addressElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        // Prefer city-level components over street names
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

                        // Country
                        if (addressElement.TryGetProperty("country", out var country))
                        {
                            countryName = country.GetString() ?? string.Empty;
                        }
                    }

                    // Fallback: if we couldn't determine a city-level name, use the first part of display_name
                    if (string.IsNullOrWhiteSpace(cityName) && !string.IsNullOrWhiteSpace(displayName))
                    {
                        cityName = displayName.Split(',')[0].Trim();
                    }

                    return new
                    {
                        name = cityName,
                        fullName = displayName,
                        country = countryName,
                        latitude = r.TryGetProperty("lat", out var lat)
                            ? double.TryParse(lat.GetString(), out var latVal) ? latVal : 0.0
                            : 0.0,
                        longitude = r.TryGetProperty("lon", out var lon)
                            ? double.TryParse(lon.GetString(), out var lonVal) ? lonVal : 0.0
                            : 0.0
                    };
                }).ToList();

                return Ok(transformedResults);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error geocoding location: {Query}", q);
                return StatusCode(500, new { message = "Error geocoding location" });
            }
        }

        // ========================================
        // TRAVEL ADVISORY (RISK SCORES)
        // ========================================

        /// <summary>
        /// Get travel advisory / risk score for a given country.
        /// Proxies the TuGo TravelSafe API to avoid CORS issues and to keep
        /// external API details away from the frontend.
        /// </summary>
        /// <param name="countryCode">
        /// ISO country code (2-letter like \"US\" or 3-letter like \"USA\").
        /// </param>
        [HttpGet("advisory/{countryCode}")]
        public async Task<IActionResult> GetTravelAdvisory(string countryCode)
        {
            if (string.IsNullOrWhiteSpace(countryCode))
            {
                return BadRequest(new { message = "Country code is required" });
            }

            try
            {
                // Normalise to upper-case, TuGo expects ISO codes.
                var normalizedCode = countryCode.Trim().ToUpperInvariant();

                // Read TuGo API key from configuration (appsettings / env).
                // Configure it under: "TuGo": { "ApiKey": "YOUR_KEY_HERE" }
                var apiKey = _configuration["TuGo:ApiKey"];
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    _logger.LogWarning("TuGo API key is not configured. Unable to fetch travel advisory for {CountryCode}", normalizedCode);
                    return Ok(new { countryCode = normalizedCode, hasData = false, message = "Advisory service unavailable" });
                }

                var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

                var handler = new HttpClientHandler();

                if (string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
                {
                    handler.ServerCertificateCustomValidationCallback =
                        HttpClientHandler.DangerousAcceptAnyServerCertificateValidator;
                }

                using var httpClient = new HttpClient(handler);
                httpClient.DefaultRequestHeaders.Add("User-Agent", "YouMeExpenses-TravelAdvisory/1.0");
                httpClient.Timeout = TimeSpan.FromSeconds(10); // 10 second timeout

                // TuGo TravelSafe endpoint pattern:
                // https://api.tugo.com/v1/travelsafe/countries/{countryCode}?lang=en
                var url = $"https://api.tugo.com/v1/travelsafe/countries/{Uri.EscapeDataString(normalizedCode)}?lang=en";

                // According to TuGo docs the API key must be sent in the Auth-Key header.
                // If your portal shows a different header name, update this to match.
                httpClient.DefaultRequestHeaders.Add("Auth-Key", apiKey);

                _logger.LogInformation("Fetching TuGo travel advisory from {Url} for country {CountryCode}", url, normalizedCode);

                var response = await httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("TuGo API returned {StatusCode} {StatusText} for country {CountryCode}. Response URL: {ResponseUrl}",
                        response.StatusCode, response.ReasonPhrase, normalizedCode, response.RequestMessage?.RequestUri);

                    // Treat all non-success as "no data" for a soft failure.
                    return Ok(new
                    {
                        countryCode = normalizedCode,
                        hasData = false,
                        message = "Advisory service unavailable"
                    });
                }

                var content = await response.Content.ReadAsStringAsync();

                // Check if response is actually JSON
                var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
                if (!contentType.Contains("json", StringComparison.OrdinalIgnoreCase) &&
                    !content.TrimStart().StartsWith("{") &&
                    !content.TrimStart().StartsWith("["))
                {
                    _logger.LogWarning("TuGo API returned non-JSON content (Content-Type: {ContentType}) for country {CountryCode}. Content preview: {Preview}",
                        contentType, normalizedCode, content.Length > 200 ? content.Substring(0, 200) : content);
                    return Ok(new { countryCode = normalizedCode, hasData = false, message = "Invalid response format from advisory service" });
                }

                // Parse JSON defensively – TuGo schema may evolve, so keep coupling light.
                System.Text.Json.JsonDocument doc;
                try
                {
                    doc = System.Text.Json.JsonDocument.Parse(content);
                }
                catch (System.Text.Json.JsonException ex)
                {
                    _logger.LogError(ex, "Failed to parse TuGo API JSON response for country {CountryCode}. Content: {Content}",
                        normalizedCode, content.Length > 500 ? content.Substring(0, 500) : content);
                    return Ok(new { countryCode = normalizedCode, hasData = false, message = "Failed to parse advisory response" });
                }

                using (doc)
                {
                    var root = doc.RootElement;

                    // Best-effort extraction based on TuGo docs:
                    // - Destination / country name
                    // - Advisories collection with description/level/updated
                    string countryName = normalizedCode;
                    if (root.TryGetProperty("destinationName", out var destNameElement) && destNameElement.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        countryName = destNameElement.GetString() ?? normalizedCode;
                    }
                    else if (root.TryGetProperty("countryName", out var countryNameElement) && countryNameElement.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        countryName = countryNameElement.GetString() ?? normalizedCode;
                    }

                    double score = 0;
                    string level = "unknown";
                    string message = string.Empty;
                    string updated = string.Empty;
                    int sourcesActive = 0;
                    bool hasData = false;

                    if (root.TryGetProperty("advisories", out var advisoriesElement) &&
                        advisoriesElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var adv in advisoriesElement.EnumerateArray())
                        {
                            hasData = true;

                            // Message / description (try multiple common field names)
                            if (string.IsNullOrEmpty(message))
                            {
                                if (adv.TryGetProperty("description", out var descEl) && descEl.ValueKind == System.Text.Json.JsonValueKind.String)
                                {
                                    message = descEl.GetString() ?? string.Empty;
                                }
                                else if (adv.TryGetProperty("text", out var textEl) && textEl.ValueKind == System.Text.Json.JsonValueKind.String)
                                {
                                    message = textEl.GetString() ?? string.Empty;
                                }
                                else if (adv.TryGetProperty("message", out var msgEl) && msgEl.ValueKind == System.Text.Json.JsonValueKind.String)
                                {
                                    message = msgEl.GetString() ?? string.Empty;
                                }
                            }

                            // Updated / lastUpdated
                            if (string.IsNullOrEmpty(updated))
                            {
                                if (adv.TryGetProperty("updatedDate", out var updEl) && updEl.ValueKind == System.Text.Json.JsonValueKind.String)
                                {
                                    updated = updEl.GetString() ?? string.Empty;
                                }
                                else if (adv.TryGetProperty("lastUpdated", out var lastUpdEl) && lastUpdEl.ValueKind == System.Text.Json.JsonValueKind.String)
                                {
                                    updated = lastUpdEl.GetString() ?? string.Empty;
                                }
                            }

                            // Severity / level (numeric or string)
                            if (adv.TryGetProperty("severity", out var severityEl))
                            {
                                if (severityEl.ValueKind == System.Text.Json.JsonValueKind.Number &&
                                    severityEl.TryGetDouble(out var sev))
                                {
                                    score = sev;
                                }
                                else if (severityEl.ValueKind == System.Text.Json.JsonValueKind.String)
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
                                if (levelEl.ValueKind == System.Text.Json.JsonValueKind.Number &&
                                    levelEl.TryGetDouble(out var lvlNum))
                                {
                                    score = lvlNum;
                                }
                                else if (levelEl.ValueKind == System.Text.Json.JsonValueKind.String)
                                {
                                    var lvlStr = levelEl.GetString();
                                    if (!string.IsNullOrWhiteSpace(lvlStr))
                                    {
                                        level = lvlStr.ToLowerInvariant();
                                    }
                                }
                            }

                            // We only need the first advisory for now – it's enough context for the UI.
                            break;
                        }
                    }

                    if (!hasData)
                    {
                        return Ok(new { countryCode = normalizedCode, hasData = false });
                    }

                    // If we only have a numeric score, map it to qualitative levels.
                    if (level == "unknown" && score > 0)
                    {
                        level = score switch
                        {
                            >= 4.0 => "critical",
                            >= 3.0 => "high",
                            >= 2.0 => "medium",
                            > 0.0 => "low",
                            _ => "unknown"
                        };
                    }

                    var result = new
                    {
                        countryCode = normalizedCode,
                        countryName,
                        score,
                        level,
                        message,
                        updated,
                        sourcesActive,
                        hasData = true
                    };

                    return Ok(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching TuGo travel advisory for country {CountryCode}", countryCode);
                return StatusCode(500, new { message = "Error fetching travel advisory" });
            }
        }

        // ========================================
        // FILE UPLOADS (TRAVEL ATTACHMENTS)
        // ========================================

        /// <summary>
        /// Upload a file attachment for the current trip.
        /// The returned metadata can be attached to itinerary events or travel documents.
        /// </summary>
        [HttpPost("trips/{tripId}/upload")]
        public async Task<IActionResult> UploadTravelAttachment(Guid tripId, IFormFile file)
        {
            var userId = GetUserId();

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            // Basic server-side guardrails – frontend also validates
            const long maxBytes = 5 * 1024 * 1024; // 5MB
            if (file.Length > maxBytes)
            {
                return BadRequest(new { message = "File too large. Max size is 5MB." });
            }

            try
            {
                var tripExists = await _context.Trips
                    .AnyAsync(t => t.Id == tripId && t.UserId == userId);

                if (!tripExists)
                {
                    return NotFound(new { message = "Trip not found" });
                }

                var extension = Path.GetExtension(file.FileName);
                var storageFileName = $"travel/{userId}/{tripId}/{Guid.NewGuid()}{extension}";

                // Reuse the existing Supabase/S3 bucket used for receipts to avoid extra config
                var url = await _storageService.UploadFileAsync(file, storageFileName, "receipts");

                return Ok(new
                {
                    url,
                    name = file.FileName,
                    type = file.ContentType,
                    size = file.Length,
                    path = storageFileName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading travel attachment for trip {TripId}", tripId);
                return StatusCode(500, new { message = "Error uploading attachment", error = ex.Message });
            }
        }

        // ========================================
        // TRIPS
        // ========================================

        /// <summary>
        /// Get all trips for current user
        /// </summary>
        [HttpGet("trips")]
        public async Task<ActionResult<IEnumerable<Trip>>> GetTrips()
        {
            var userId = GetUserId();
            var trips = await _context.Trips
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.StartDate)
                .ToListAsync();

            return Ok(trips);
        }

        /// <summary>
        /// Get a single trip by ID
        /// </summary>
        [HttpGet("trips/{id}")]
        public async Task<ActionResult<Trip>> GetTrip(Guid id)
        {
            var userId = GetUserId();
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (trip == null)
                return NotFound();

            return Ok(trip);
        }

        /// <summary>
        /// Create a new trip
        /// </summary>
        [HttpPost("trips")]
        public async Task<ActionResult<Trip>> CreateTrip([FromBody] Trip trip)
        {
            var userId = GetUserId();
            
            trip.Id = Guid.NewGuid();
            trip.UserId = userId;
            trip.StartDate = ToUtc(trip.StartDate);
            trip.EndDate = ToUtc(trip.EndDate);
            trip.CreatedAt = DateTime.UtcNow;
            trip.UpdatedAt = DateTime.UtcNow;
            // Ensure trip type is always set for backward compatibility
            if (string.IsNullOrWhiteSpace(trip.TripType))
            {
                trip.TripType = "single";
            }

            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} created trip {TripId} to {Destination}", 
                userId, trip.Id, trip.Destination);

            return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, trip);
        }

        /// <summary>
        /// Update an existing trip
        /// </summary>
        [HttpPut("trips/{id}")]
        public async Task<ActionResult<Trip>> UpdateTrip(Guid id, [FromBody] Trip updates)
        {
            var userId = GetUserId();
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (trip == null)
                return NotFound();

            // Update fields
            trip.Name = updates.Name;
            trip.Destination = updates.Destination;
            trip.Country = updates.Country;
            trip.Latitude = updates.Latitude;
            trip.Longitude = updates.Longitude;
            trip.StartDate = ToUtc(updates.StartDate);
            trip.EndDate = ToUtc(updates.EndDate);
            trip.Budget = updates.Budget;
            trip.BudgetCurrency = updates.BudgetCurrency;
            trip.Status = updates.Status;
            trip.CoverImage = updates.CoverImage;
            trip.Notes = updates.Notes;
            // Allow client to switch between single and multi-city modes
            trip.TripType = string.IsNullOrWhiteSpace(updates.TripType)
                ? trip.TripType
                : updates.TripType;
            trip.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(trip);
        }

        /// <summary>
        /// Delete a trip and all related data
        /// </summary>
        [HttpDelete("trips/{id}")]
        public async Task<IActionResult> DeleteTrip(Guid id)
        {
            var userId = GetUserId();
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (trip == null)
                return NotFound();

            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} deleted trip {TripId}", userId, id);

            return NoContent();
        }

        // ========================================
        // TRIP CITIES (MULTI-CITY TRIPS)
        // ========================================

        /// <summary>
        /// Get all cities for a trip in route order.
        /// </summary>
        [HttpGet("trips/{tripId}/cities")]
        public async Task<ActionResult<IEnumerable<TripCity>>> GetTripCities(Guid tripId)
        {
            var userId = GetUserId();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);

            if (!tripExists)
                return NotFound("Trip not found");

            var cities = await _context.TripCities
                .Where(c => c.TripId == tripId)
                .OrderBy(c => c.OrderIndex)
                .ToListAsync();

            return Ok(cities);
        }

        /// <summary>
        /// Create a city for a trip.
        /// </summary>
        [HttpPost("trips/{tripId}/cities")]
        public async Task<ActionResult<TripCity>> CreateTripCity(Guid tripId, [FromBody] TripCity city)
        {
            var userId = GetUserId();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);

            if (!tripExists)
                return NotFound("Trip not found");

            city.Id = Guid.NewGuid();
            city.TripId = tripId;
            city.StartDate = ToUtc(city.StartDate);
            city.EndDate = ToUtc(city.EndDate);
            city.CreatedAt = DateTime.UtcNow;
            city.UpdatedAt = DateTime.UtcNow;

            // If order index is not set, append to the end of the route
            if (city.OrderIndex <= 0)
            {
                var maxOrder = await _context.TripCities
                    .Where(c => c.TripId == tripId)
                    .Select(c => (int?)c.OrderIndex)
                    .MaxAsync() ?? -1;

                city.OrderIndex = maxOrder + 1;
            }

            _context.TripCities.Add(city);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTripCities), new { tripId }, city);
        }

        /// <summary>
        /// Update a city within a trip.
        /// </summary>
        [HttpPut("trips/{tripId}/cities/{cityId}")]
        public async Task<ActionResult<TripCity>> UpdateTripCity(Guid tripId, Guid cityId, [FromBody] TripCity updates)
        {
            var userId = GetUserId();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);

            if (!tripExists)
                return NotFound("Trip not found");

            var city = await _context.TripCities
                .FirstOrDefaultAsync(c => c.Id == cityId && c.TripId == tripId);

            if (city == null)
                return NotFound("City not found");

            city.Name = updates.Name;
            city.Country = updates.Country;
            city.Latitude = updates.Latitude;
            city.Longitude = updates.Longitude;
            city.StartDate = ToUtc(updates.StartDate);
            city.EndDate = ToUtc(updates.EndDate);

            // Only update order index if explicitly provided (>= 0)
            if (updates.OrderIndex >= 0)
            {
                city.OrderIndex = updates.OrderIndex;
            }

            city.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(city);
        }

        /// <summary>
        /// Reorder cities within a trip by providing the new ordered list of IDs.
        /// </summary>
        [HttpPost("trips/{tripId}/cities/reorder")]
        public async Task<IActionResult> ReorderTripCities(Guid tripId, [FromBody] List<Guid> orderedCityIds)
        {
            var userId = GetUserId();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);

            if (!tripExists)
                return NotFound("Trip not found");

            if (orderedCityIds == null || orderedCityIds.Count == 0)
            {
                return BadRequest("City order list cannot be empty");
            }

            var cities = await _context.TripCities
                .Where(c => c.TripId == tripId)
                .ToListAsync();

            var cityLookup = cities.ToDictionary(c => c.Id, c => c);

            for (var index = 0; index < orderedCityIds.Count; index++)
            {
                var id = orderedCityIds[index];
                if (cityLookup.TryGetValue(id, out var city))
                {
                    city.OrderIndex = index;
                    city.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Delete a city from a trip.
        /// </summary>
        [HttpDelete("trips/{tripId}/cities/{cityId}")]
        public async Task<IActionResult> DeleteTripCity(Guid tripId, Guid cityId)
        {
            var userId = GetUserId();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);

            if (!tripExists)
                return NotFound("Trip not found");

            var city = await _context.TripCities
                .FirstOrDefaultAsync(c => c.Id == cityId && c.TripId == tripId);

            if (city == null)
                return NotFound("City not found");

            _context.TripCities.Remove(city);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ========================================
        // ITINERARY EVENTS
        // ========================================

        /// <summary>
        /// Get all events for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/events")]
        public async Task<ActionResult<IEnumerable<ItineraryEvent>>> GetEvents(Guid tripId)
        {
            var userId = GetUserId();
            
            // Verify trip ownership
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var events = await _context.ItineraryEvents
                .Where(e => e.TripId == tripId)
                .OrderBy(e => e.Date)
                .ThenBy(e => e.StartTime)
                .ToListAsync();

            return Ok(events);
        }

        /// <summary>
        /// Create an itinerary event
        /// </summary>
        [HttpPost("trips/{tripId}/events")]
        public async Task<ActionResult<ItineraryEvent>> CreateEvent(Guid tripId, [FromBody] ItineraryEvent evt)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            evt.Id = Guid.NewGuid();
            evt.TripId = tripId;
            evt.Date = ToUtc(evt.Date);
            evt.CreatedAt = DateTime.UtcNow;
            evt.UpdatedAt = DateTime.UtcNow;

            _context.ItineraryEvents.Add(evt);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEvents), new { tripId }, evt);
        }

        /// <summary>
        /// Update an itinerary event
        /// </summary>
        [HttpPut("trips/{tripId}/events/{eventId}")]
        public async Task<ActionResult<ItineraryEvent>> UpdateEvent(Guid tripId, Guid eventId, [FromBody] ItineraryEvent updates)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var evt = await _context.ItineraryEvents
                .FirstOrDefaultAsync(e => e.Id == eventId && e.TripId == tripId);

            if (evt == null)
                return NotFound("Event not found");

            // Update fields
            evt.Type = updates.Type;
            evt.Name = updates.Name;
            evt.Date = ToUtc(updates.Date);
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

            await _context.SaveChangesAsync();

            return Ok(evt);
        }

        /// <summary>
        /// Delete an itinerary event
        /// </summary>
        [HttpDelete("trips/{tripId}/events/{eventId}")]
        public async Task<IActionResult> DeleteEvent(Guid tripId, Guid eventId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var evt = await _context.ItineraryEvents
                .FirstOrDefaultAsync(e => e.Id == eventId && e.TripId == tripId);

            if (evt == null)
                return NotFound("Event not found");

            _context.ItineraryEvents.Remove(evt);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ========================================
        // PACKING ITEMS
        // ========================================

        /// <summary>
        /// Get all packing items for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/packing")]
        public async Task<ActionResult<IEnumerable<PackingItem>>> GetPackingItems(Guid tripId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var items = await _context.PackingItems
                .Where(p => p.TripId == tripId)
                .OrderBy(p => p.Category)
                .ThenBy(p => p.Name)
                .ToListAsync();

            return Ok(items);
        }

        /// <summary>
        /// Create a packing item
        /// </summary>
        [HttpPost("trips/{tripId}/packing")]
        public async Task<ActionResult<PackingItem>> CreatePackingItem(Guid tripId, [FromBody] PackingItem item)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            item.Id = Guid.NewGuid();
            item.TripId = tripId;
            item.CreatedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            _context.PackingItems.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPackingItems), new { tripId }, item);
        }

        /// <summary>
        /// Update a packing item
        /// </summary>
        [HttpPut("trips/{tripId}/packing/{itemId}")]
        public async Task<ActionResult<PackingItem>> UpdatePackingItem(Guid tripId, Guid itemId, [FromBody] PackingItem updates)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var item = await _context.PackingItems
                .FirstOrDefaultAsync(p => p.Id == itemId && p.TripId == tripId);

            if (item == null)
                return NotFound("Item not found");

            item.Category = updates.Category;
            item.Name = updates.Name;
            item.Quantity = updates.Quantity;
            item.IsChecked = updates.IsChecked;
            item.IsEssential = updates.IsEssential;
            item.Notes = updates.Notes;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(item);
        }

        /// <summary>
        /// Delete a packing item
        /// </summary>
        [HttpDelete("trips/{tripId}/packing/{itemId}")]
        public async Task<IActionResult> DeletePackingItem(Guid tripId, Guid itemId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var item = await _context.PackingItems
                .FirstOrDefaultAsync(p => p.Id == itemId && p.TripId == tripId);

            if (item == null)
                return NotFound("Item not found");

            _context.PackingItems.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ========================================
        // DOCUMENTS
        // ========================================

        /// <summary>
        /// Get all documents for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/documents")]
        public async Task<ActionResult<IEnumerable<TravelDocument>>> GetDocuments(Guid tripId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var docs = await _context.TravelDocuments
                .Where(d => d.TripId == tripId)
                .OrderBy(d => d.Type)
                .ThenBy(d => d.Name)
                .ToListAsync();

            return Ok(docs);
        }

        /// <summary>
        /// Create a document
        /// </summary>
        [HttpPost("trips/{tripId}/documents")]
        public async Task<ActionResult<TravelDocument>> CreateDocument(Guid tripId, [FromBody] TravelDocument doc)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            doc.Id = Guid.NewGuid();
            doc.TripId = tripId;
            doc.ExpiryDate = ToUtc(doc.ExpiryDate);
            doc.IssueDate = ToUtc(doc.IssueDate);
            doc.CreatedAt = DateTime.UtcNow;
            doc.UpdatedAt = DateTime.UtcNow;

            _context.TravelDocuments.Add(doc);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDocuments), new { tripId }, doc);
        }

        /// <summary>
        /// Update a document
        /// </summary>
        [HttpPut("trips/{tripId}/documents/{docId}")]
        public async Task<ActionResult<TravelDocument>> UpdateDocument(Guid tripId, Guid docId, [FromBody] TravelDocument updates)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var doc = await _context.TravelDocuments
                .FirstOrDefaultAsync(d => d.Id == docId && d.TripId == tripId);

            if (doc == null)
                return NotFound("Document not found");

            doc.Type = updates.Type;
            doc.Name = updates.Name;
            doc.DocumentNumber = updates.DocumentNumber;
            doc.ExpiryDate = ToUtc(updates.ExpiryDate);
            doc.IssueDate = ToUtc(updates.IssueDate);
            doc.IssuingCountry = updates.IssuingCountry;
            doc.FileUrl = updates.FileUrl;
            doc.FileThumbnail = updates.FileThumbnail;
            doc.Notes = updates.Notes;
            doc.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(doc);
        }

        /// <summary>
        /// Delete a document
        /// </summary>
        [HttpDelete("trips/{tripId}/documents/{docId}")]
        public async Task<IActionResult> DeleteDocument(Guid tripId, Guid docId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var doc = await _context.TravelDocuments
                .FirstOrDefaultAsync(d => d.Id == docId && d.TripId == tripId);

            if (doc == null)
                return NotFound("Document not found");

            _context.TravelDocuments.Remove(doc);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ========================================
        // TRAVEL EXPENSES
        // ========================================

        /// <summary>
        /// Get all expenses for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/expenses")]
        public async Task<ActionResult<IEnumerable<TravelExpense>>> GetExpenses(Guid tripId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var expenses = await _context.TravelExpenses
                .Where(e => e.TripId == tripId)
                .OrderByDescending(e => e.Date)
                .ToListAsync();

            return Ok(expenses);
        }

        /// <summary>
        /// Create a travel expense
        /// </summary>
        [HttpPost("trips/{tripId}/expenses")]
        public async Task<ActionResult<TravelExpense>> CreateExpense(Guid tripId, [FromBody] TravelExpense expense)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            expense.Id = Guid.NewGuid();
            expense.TripId = tripId;
            expense.Date = ToUtc(expense.Date);
            expense.CreatedAt = DateTime.UtcNow;
            expense.UpdatedAt = DateTime.UtcNow;

            // If base currency amount not set, use amount
            if (expense.AmountInBaseCurrency == 0)
                expense.AmountInBaseCurrency = expense.Amount;

            _context.TravelExpenses.Add(expense);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetExpenses), new { tripId }, expense);
        }

        /// <summary>
        /// Update a travel expense
        /// </summary>
        [HttpPut("trips/{tripId}/expenses/{expenseId}")]
        public async Task<ActionResult<TravelExpense>> UpdateExpense(Guid tripId, Guid expenseId, [FromBody] TravelExpense updates)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var expense = await _context.TravelExpenses
                .FirstOrDefaultAsync(e => e.Id == expenseId && e.TripId == tripId);

            if (expense == null)
                return NotFound("Expense not found");

            expense.Category = updates.Category;
            expense.Amount = updates.Amount;
            expense.Currency = updates.Currency;
            expense.AmountInBaseCurrency = updates.AmountInBaseCurrency;
            expense.ExchangeRate = updates.ExchangeRate;
            expense.Description = updates.Description;
            expense.Date = ToUtc(updates.Date);
            expense.PaymentMethod = updates.PaymentMethod;
            expense.ReceiptUrl = updates.ReceiptUrl;
            expense.Notes = updates.Notes;
            expense.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(expense);
        }

        /// <summary>
        /// Delete a travel expense
        /// </summary>
        [HttpDelete("trips/{tripId}/expenses/{expenseId}")]
        public async Task<IActionResult> DeleteExpense(Guid tripId, Guid expenseId)
        {
            var userId = GetUserId();
            
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId && t.UserId == userId);
            
            if (!tripExists)
                return NotFound("Trip not found");

            var expense = await _context.TravelExpenses
                .FirstOrDefaultAsync(e => e.Id == expenseId && e.TripId == tripId);

            if (expense == null)
                return NotFound("Expense not found");

            _context.TravelExpenses.Remove(expense);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
