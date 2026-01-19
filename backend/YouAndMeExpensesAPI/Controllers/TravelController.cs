using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using YouAndMeExpensesAPI.Services;

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

        public TravelController(
            AppDbContext context,
            ILogger<TravelController> logger,
            IStorageService storageService)
        {
            _context = context;
            _logger = logger;
            _storageService = storageService;
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
                var transformedResults = results.Select(r => new
                {
                    name = r.TryGetProperty("display_name", out var displayName) 
                        ? displayName.GetString()?.Split(',')[0] ?? ""
                        : "",
                    fullName = r.TryGetProperty("display_name", out var fullName)
                        ? fullName.GetString() ?? ""
                        : "",
                    country = r.TryGetProperty("address", out var address) && address.ValueKind == System.Text.Json.JsonValueKind.Object
                        ? address.TryGetProperty("country", out var country) 
                            ? country.GetString() ?? ""
                            : ""
                        : "",
                    latitude = r.TryGetProperty("lat", out var lat)
                        ? double.TryParse(lat.GetString(), out var latVal) ? latVal : 0.0
                        : 0.0,
                    longitude = r.TryGetProperty("lon", out var lon)
                        ? double.TryParse(lon.GetString(), out var lonVal) ? lonVal : 0.0
                        : 0.0
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
