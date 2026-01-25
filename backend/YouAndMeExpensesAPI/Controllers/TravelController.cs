using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;
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
    public class TravelController : BaseApiController
    {
        private readonly ILogger<TravelController> _logger;
        private readonly ITravelService _travelService;
        private readonly ITravelGeocodingService _geocodingService;
        private readonly ITravelAdvisoryService _advisoryService;
        private readonly ITravelAttachmentService _attachmentService;

        public TravelController(
            ILogger<TravelController> logger,
            ITravelService travelService,
            ITravelGeocodingService geocodingService,
            ITravelAdvisoryService advisoryService,
            ITravelAttachmentService attachmentService)
        {
            _logger = logger;
            _travelService = travelService;
            _geocodingService = geocodingService;
            _advisoryService = advisoryService;
            _attachmentService = attachmentService;
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

            var (results, statusCode, errorMessage) = await _geocodingService.SearchLocationsAsync(q, limit);

            if (statusCode.HasValue && statusCode != 200 && !string.IsNullOrWhiteSpace(errorMessage))
            {
                return StatusCode(statusCode.Value, new { message = errorMessage });
            }

            return Ok(results ?? Array.Empty<TravelLocationResult>());
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
            var result = await _advisoryService.GetAdvisoryAsync(countryCode);

            if (result.StatusCode == 500)
            {
                return StatusCode(500, new { message = result.ErrorMessage ?? "Error fetching travel advisory" });
            }

            if (!result.HasData && !string.IsNullOrWhiteSpace(result.ErrorMessage))
            {
                return Ok(new { countryCode = result.CountryCode, hasData = false, message = result.ErrorMessage });
            }

            if (!result.HasData)
            {
                // Return the full DTO so the frontend still receives error/status metadata.
                return Ok(result);
            }

            // When data is available, expose the entire normalised DTO. This includes:
            // - Core risk fields (score, level, message, updated, sourcesActive)
            // - HasAdvisoryWarning / HasRegionalAdvisory flags
            // - AdvisoryText / AdvisoryLongDescription and section summaries
            // - Highlight lists used by the "More details" modal
            return Ok(result);
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
            var userId = GetCurrentUserId();

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var (attachment, errorMessage, statusCode) = await _attachmentService.UploadAttachmentAsync(userId, tripId, file);

            if (!string.IsNullOrWhiteSpace(errorMessage) && statusCode.HasValue && statusCode != 200)
            {
                if (statusCode == 404)
                {
                    return NotFound(new { message = errorMessage });
                }

                if (statusCode == 400)
                {
                    return BadRequest(new { message = errorMessage });
                }

                return StatusCode(statusCode.Value, new { message = errorMessage });
            }

            if (attachment == null)
            {
                return StatusCode(500, new { message = "Error uploading attachment" });
            }

            return Ok(new
            {
                url = attachment.Url,
                name = attachment.Name,
                type = attachment.Type,
                size = attachment.Size,
                path = attachment.Path
            });
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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var trips = await _travelService.GetTripsAsync(userId);
            return Ok(trips);
        }

        /// <summary>
        /// Get a single trip by ID
        /// </summary>
        [HttpGet("trips/{id}")]
        public async Task<ActionResult<Trip>> GetTrip(Guid id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var trip = await _travelService.GetTripAsync(userId, id);

            if (trip == null)
            {
                return NotFound();
            }

            return Ok(trip);
        }

        /// <summary>
        /// Create a new trip
        /// </summary>
        [HttpPost("trips")]
        public async Task<ActionResult<Trip>> CreateTrip([FromBody] Trip trip)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var created = await _travelService.CreateTripAsync(userId, trip);

            return CreatedAtAction(nameof(GetTrip), new { id = created.Id }, created);
        }

        /// <summary>
        /// Update an existing trip
        /// </summary>
        [HttpPut("trips/{id}")]
        public async Task<ActionResult<Trip>> UpdateTrip(Guid id, [FromBody] Trip updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var updated = await _travelService.UpdateTripAsync(userId, id, updates);

            if (updated == null)
            {
                return NotFound();
            }

            return Ok(updated);
        }

        /// <summary>
        /// Delete a trip and all related data
        /// </summary>
        [HttpDelete("trips/{id}")]
        public async Task<IActionResult> DeleteTrip(Guid id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var deleted = await _travelService.DeleteTripAsync(userId, id);

            if (!deleted)
            {
                return NotFound();
            }

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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var cities = await _travelService.GetTripCitiesAsync(userId, tripId);

            if (cities == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(cities);
        }

        /// <summary>
        /// Create a city for a trip.
        /// </summary>
        [HttpPost("trips/{tripId}/cities")]
        public async Task<ActionResult<TripCity>> CreateTripCity(Guid tripId, [FromBody] TripCity city)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var created = await _travelService.CreateTripCityAsync(userId, tripId, city);

            if (created == null)
            {
                return NotFound("Trip not found");
            }

            return CreatedAtAction(nameof(GetTripCities), new { tripId }, created);
        }

        /// <summary>
        /// Update a city within a trip.
        /// </summary>
        [HttpPut("trips/{tripId}/cities/{cityId}")]
        public async Task<ActionResult<TripCity>> UpdateTripCity(Guid tripId, Guid cityId, [FromBody] TripCity updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var updated = await _travelService.UpdateTripCityAsync(userId, tripId, cityId, updates);

            if (updated == null)
            {
                // For backward compatibility we keep the generic message used previously
                return NotFound("Trip not found");
            }

            return Ok(updated);
        }

        /// <summary>
        /// Reorder cities within a trip by providing the new ordered list of IDs.
        /// </summary>
        [HttpPost("trips/{tripId}/cities/reorder")]
        public async Task<IActionResult> ReorderTripCities(Guid tripId, [FromBody] List<Guid> orderedCityIds)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            if (orderedCityIds == null || orderedCityIds.Count == 0)
            {
                return BadRequest("City order list cannot be empty");
            }

            var success = await _travelService.ReorderTripCitiesAsync(userId, tripId, orderedCityIds);

            if (!success)
            {
                return NotFound("Trip not found");
            }

            return NoContent();
        }

        /// <summary>
        /// Delete a city from a trip.
        /// </summary>
        [HttpDelete("trips/{tripId}/cities/{cityId}")]
        public async Task<IActionResult> DeleteTripCity(Guid tripId, Guid cityId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _travelService.DeleteTripCityAsync(userId, tripId, cityId);

            if (!success)
            {
                return NotFound("Trip not found");
            }

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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var events = await _travelService.GetEventsAsync(userId, tripId);

            if (events == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(events);
        }

        /// <summary>
        /// Create an itinerary event
        /// </summary>
        [HttpPost("trips/{tripId}/events")]
        public async Task<ActionResult<ItineraryEvent>> CreateEvent(Guid tripId, [FromBody] ItineraryEvent evt)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var created = await _travelService.CreateEventAsync(userId, tripId, evt);

            if (created == null)
            {
                return NotFound("Trip not found");
            }

            return CreatedAtAction(nameof(GetEvents), new { tripId }, created);
        }

        /// <summary>
        /// Update an itinerary event
        /// </summary>
        [HttpPut("trips/{tripId}/events/{eventId}")]
        public async Task<ActionResult<ItineraryEvent>> UpdateEvent(Guid tripId, Guid eventId, [FromBody] ItineraryEvent updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var updated = await _travelService.UpdateEventAsync(userId, tripId, eventId, updates);

            if (updated == null)
            {
                // Previously: "Trip not found" or "Event not found" – we keep a generic message
                return NotFound("Trip not found");
            }

            return Ok(updated);
        }

        /// <summary>
        /// Delete an itinerary event
        /// </summary>
        [HttpDelete("trips/{tripId}/events/{eventId}")]
        public async Task<IActionResult> DeleteEvent(Guid tripId, Guid eventId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _travelService.DeleteEventAsync(userId, tripId, eventId);

            if (!success)
            {
                return NotFound("Trip not found");
            }

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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var items = await _travelService.GetPackingItemsAsync(userId, tripId);

            if (items == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(items);
        }

        /// <summary>
        /// Create a packing item
        /// </summary>
        [HttpPost("trips/{tripId}/packing")]
        public async Task<ActionResult<PackingItem>> CreatePackingItem(Guid tripId, [FromBody] PackingItem item)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var created = await _travelService.CreatePackingItemAsync(userId, tripId, item);

            if (created == null)
            {
                return NotFound("Trip not found");
            }

            return CreatedAtAction(nameof(GetPackingItems), new { tripId }, created);
        }

        /// <summary>
        /// Update a packing item
        /// </summary>
        [HttpPut("trips/{tripId}/packing/{itemId}")]
        public async Task<ActionResult<PackingItem>> UpdatePackingItem(Guid tripId, Guid itemId, [FromBody] PackingItem updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var updated = await _travelService.UpdatePackingItemAsync(userId, tripId, itemId, updates);

            if (updated == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(updated);
        }

        /// <summary>
        /// Delete a packing item
        /// </summary>
        [HttpDelete("trips/{tripId}/packing/{itemId}")]
        public async Task<IActionResult> DeletePackingItem(Guid tripId, Guid itemId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _travelService.DeletePackingItemAsync(userId, tripId, itemId);

            if (!success)
            {
                return NotFound("Trip not found");
            }

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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var docs = await _travelService.GetDocumentsAsync(userId, tripId);

            if (docs == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(docs);
        }

        /// <summary>
        /// Create a document
        /// </summary>
        [HttpPost("trips/{tripId}/documents")]
        public async Task<ActionResult<TravelDocument>> CreateDocument(Guid tripId, [FromBody] TravelDocument doc)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var created = await _travelService.CreateDocumentAsync(userId, tripId, doc);

            if (created == null)
            {
                return NotFound("Trip not found");
            }

            return CreatedAtAction(nameof(GetDocuments), new { tripId }, created);
        }

        /// <summary>
        /// Update a document
        /// </summary>
        [HttpPut("trips/{tripId}/documents/{docId}")]
        public async Task<ActionResult<TravelDocument>> UpdateDocument(Guid tripId, Guid docId, [FromBody] TravelDocument updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var updated = await _travelService.UpdateDocumentAsync(userId, tripId, docId, updates);

            if (updated == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(updated);
        }

        /// <summary>
        /// Delete a document
        /// </summary>
        [HttpDelete("trips/{tripId}/documents/{docId}")]
        public async Task<IActionResult> DeleteDocument(Guid tripId, Guid docId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _travelService.DeleteDocumentAsync(userId, tripId, docId);

            if (!success)
            {
                return NotFound("Trip not found");
            }

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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var expenses = await _travelService.GetExpensesAsync(userId, tripId);

            if (expenses == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(expenses);
        }

        /// <summary>
        /// Create a travel expense
        /// </summary>
        [HttpPost("trips/{tripId}/expenses")]
        public async Task<ActionResult<TravelExpense>> CreateExpense(Guid tripId, [FromBody] TravelExpense expense)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var created = await _travelService.CreateExpenseAsync(userId, tripId, expense);

            if (created == null)
            {
                return NotFound("Trip not found");
            }

            return CreatedAtAction(nameof(GetExpenses), new { tripId }, created);
        }

        /// <summary>
        /// Update a travel expense
        /// </summary>
        [HttpPut("trips/{tripId}/expenses/{expenseId}")]
        public async Task<ActionResult<TravelExpense>> UpdateExpense(Guid tripId, Guid expenseId, [FromBody] TravelExpense updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var updated = await _travelService.UpdateExpenseAsync(userId, tripId, expenseId, updates);

            if (updated == null)
            {
                return NotFound("Trip not found");
            }

            return Ok(updated);
        }

        /// <summary>
        /// Delete a travel expense
        /// </summary>
        [HttpDelete("trips/{tripId}/expenses/{expenseId}")]
        public async Task<IActionResult> DeleteExpense(Guid tripId, Guid expenseId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _travelService.DeleteExpenseAsync(userId, tripId, expenseId);

            if (!success)
            {
                return NotFound("Trip not found");
            }

            return NoContent();
        }

        // ========================================
        // LAYOUT PREFERENCES
        // ========================================

        /// <summary>
        /// Get layout preferences for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/layout")]
        public async Task<IActionResult> GetLayoutPreferences(Guid tripId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var preferences = await _travelService.GetLayoutPreferencesAsync(userId, tripId);

            // Return empty object if no preferences exist yet
            if (preferences == null)
            {
                return Ok(new { tripId, layoutConfig = "{}", preset = (string?)null });
            }

            return Ok(new
            {
                id = preferences.Id,
                tripId = preferences.TripId,
                layoutConfig = preferences.LayoutConfig,
                preset = preferences.Preset,
                createdAt = preferences.CreatedAt,
                updatedAt = preferences.UpdatedAt
            });
        }

        /// <summary>
        /// Update layout preferences for a trip
        /// </summary>
        [HttpPut("trips/{tripId}/layout")]
        public async Task<IActionResult> UpdateLayoutPreferences(Guid tripId, [FromBody] LayoutPreferencesDto dto)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                var preferences = await _travelService.SaveLayoutPreferencesAsync(
                    userId,
                    tripId,
                    dto.LayoutConfig ?? "{}",
                    dto.Preset);

                return Ok(new
                {
                    id = preferences.Id,
                    tripId = preferences.TripId,
                    layoutConfig = preferences.LayoutConfig,
                    preset = preferences.Preset,
                    createdAt = preferences.CreatedAt,
                    updatedAt = preferences.UpdatedAt
                });
            }
            catch (InvalidOperationException)
            {
                return NotFound("Trip not found");
            }
        }

        // ==========================================
        // Saved Places (Pinned POIs)
        // ==========================================

        /// <summary>
        /// Get all saved places for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/saved-places")]
        public async Task<ActionResult<IEnumerable<SavedPlace>>> GetSavedPlaces(Guid tripId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var places = await _travelService.GetSavedPlacesAsync(userId, tripId);
            if (places == null) return NotFound("Trip not found");

            return Ok(places);
        }

        /// <summary>
        /// Save a place (pin a POI)
        /// </summary>
        [HttpPost("trips/{tripId}/saved-places")]
        public async Task<ActionResult<SavedPlace>> CreateSavedPlace(Guid tripId, [FromBody] SavedPlace place)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (tripId != place.TripId)
            {
                return BadRequest("Trip ID mismatch");
            }

            var created = await _travelService.CreateSavedPlaceAsync(userId, tripId, place);
            if (created == null) return NotFound("Trip not found");

            return CreatedAtAction(nameof(GetSavedPlaces), new { tripId = tripId }, created);
        }

        /// <summary>
        /// Remove a saved place
        /// </summary>
        [HttpDelete("trips/{tripId}/saved-places/{placeId}")]
        public async Task<ActionResult> DeleteSavedPlace(Guid tripId, Guid placeId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _travelService.DeleteSavedPlaceAsync(userId, tripId, placeId);
            if (!result) return NotFound("Trip or place not found");

            return NoContent();
        }

        // ==========================================
        // Travel Notes
        // ==========================================

        /// <summary>
        /// Get all notes for a trip
        /// </summary>
        [HttpGet("trips/{tripId}/notes")]
        public async Task<ActionResult<IEnumerable<TravelNote>>> GetNotes(Guid tripId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var notes = await _travelService.GetNotesAsync(userId, tripId);
            if (notes == null) return NotFound("Trip not found");

            return Ok(notes);
        }

        /// <summary>
        /// Create a note
        /// </summary>
        [HttpPost("trips/{tripId}/notes")]
        public async Task<ActionResult<TravelNote>> CreateNote(Guid tripId, [FromBody] TravelNote note)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var created = await _travelService.CreateNoteAsync(userId, tripId, note);
            if (created == null) return NotFound("Trip not found");

            return CreatedAtAction(nameof(GetNotes), new { tripId }, created);
        }

        /// <summary>
        /// Update a note
        /// </summary>
        [HttpPut("trips/{tripId}/notes/{noteId}")]
        public async Task<ActionResult<TravelNote>> UpdateNote(Guid tripId, Guid noteId, [FromBody] TravelNote updates)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var updated = await _travelService.UpdateNoteAsync(userId, tripId, noteId, updates);
            if (updated == null) return NotFound("Trip or note not found");

            return Ok(updated);
        }

        /// <summary>
        /// Delete a note
        /// </summary>
        [HttpDelete("trips/{tripId}/notes/{noteId}")]
        public async Task<IActionResult> DeleteNote(Guid tripId, Guid noteId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var success = await _travelService.DeleteNoteAsync(userId, tripId, noteId);
            if (!success) return NotFound("Trip or note not found");

            return NoContent();
        }
    }

    /// <summary>
    /// DTO for layout preferences request
    /// </summary>
    public class LayoutPreferencesDto
    {
        public string? LayoutConfig { get; set; }
        public string? Preset { get; set; }
    }
}
