using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// High-level service for trip and related entities (cities, events, packing, documents, expenses).
    /// </summary>
    public interface ITravelService
    {
        Task<IReadOnlyList<Trip>> GetTripsAsync(string userId);
        Task<Trip?> GetTripAsync(string userId, Guid tripId);
        Task<Trip> CreateTripAsync(string userId, Trip trip);
        Task<Trip?> UpdateTripAsync(string userId, Guid tripId, Trip updates);
        Task<bool> DeleteTripAsync(string userId, Guid tripId);

        // Cities
        Task<IReadOnlyList<TripCity>?> GetTripCitiesAsync(string userId, Guid tripId);
        Task<TripCity?> CreateTripCityAsync(string userId, Guid tripId, TripCity city);
        Task<TripCity?> UpdateTripCityAsync(string userId, Guid tripId, Guid cityId, TripCity updates);
        Task<bool> ReorderTripCitiesAsync(string userId, Guid tripId, List<Guid> orderedCityIds);
        Task<bool> DeleteTripCityAsync(string userId, Guid tripId, Guid cityId);

        // Events
        Task<IReadOnlyList<ItineraryEvent>?> GetEventsAsync(string userId, Guid tripId);
        Task<ItineraryEvent?> CreateEventAsync(string userId, Guid tripId, ItineraryEvent evt);
        Task<ItineraryEvent?> UpdateEventAsync(string userId, Guid tripId, Guid eventId, ItineraryEvent updates);
        Task<bool> DeleteEventAsync(string userId, Guid tripId, Guid eventId);

        // Packing items
        Task<IReadOnlyList<PackingItem>?> GetPackingItemsAsync(string userId, Guid tripId);
        Task<PackingItem?> CreatePackingItemAsync(string userId, Guid tripId, PackingItem item);
        Task<PackingItem?> UpdatePackingItemAsync(string userId, Guid tripId, Guid itemId, PackingItem updates);
        Task<bool> DeletePackingItemAsync(string userId, Guid tripId, Guid itemId);

        // Documents
        Task<IReadOnlyList<TravelDocument>?> GetDocumentsAsync(string userId, Guid tripId);
        Task<TravelDocument?> CreateDocumentAsync(string userId, Guid tripId, TravelDocument document);
        Task<TravelDocument?> UpdateDocumentAsync(string userId, Guid tripId, Guid documentId, TravelDocument updates);
        Task<bool> DeleteDocumentAsync(string userId, Guid tripId, Guid documentId);

        // Expenses
        Task<IReadOnlyList<TravelExpense>?> GetExpensesAsync(string userId, Guid tripId);
        Task<TravelExpense?> CreateExpenseAsync(string userId, Guid tripId, TravelExpense expense);
        Task<TravelExpense?> UpdateExpenseAsync(string userId, Guid tripId, Guid expenseId, TravelExpense updates);
        Task<bool> DeleteExpenseAsync(string userId, Guid tripId, Guid expenseId);

        // Layout preferences
        Task<TripLayoutPreferences?> GetLayoutPreferencesAsync(string userId, Guid tripId);
        Task<TripLayoutPreferences> SaveLayoutPreferencesAsync(string userId, Guid tripId, string layoutConfig, string? preset);

        // Saved Places
        Task<IReadOnlyList<SavedPlace>?> GetSavedPlacesAsync(string userId, Guid tripId);
        Task<SavedPlace?> CreateSavedPlaceAsync(string userId, Guid tripId, SavedPlace place);
        Task<bool> DeleteSavedPlaceAsync(string userId, Guid tripId, Guid placeId);

        // Notes
        Task<IReadOnlyList<TravelNote>?> GetNotesAsync(string userId, Guid tripId);
        Task<TravelNote?> CreateNoteAsync(string userId, Guid tripId, TravelNote note);
        Task<TravelNote?> UpdateNoteAsync(string userId, Guid tripId, Guid noteId, TravelNote updates);
        Task<bool> DeleteNoteAsync(string userId, Guid tripId, Guid noteId);
    }

    /// <summary>
    /// Service responsible for geocoding / location search.
    /// </summary>
    public interface ITravelGeocodingService
    {
        Task<(IReadOnlyList<TravelLocationResult> results, int? statusCode, string? errorMessage)> SearchLocationsAsync(string query, int limit, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Service responsible for fetching travel advisories from TuGo.
    /// </summary>
    public interface ITravelAdvisoryService
    {
        Task<TravelAdvisoryResult> GetAdvisoryAsync(string countryCode, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Service responsible for uploading and validating travel attachments.
    /// </summary>
    public interface ITravelAttachmentService
    {
        Task<(TravelAttachmentDto? attachment, string? errorMessage, int? statusCode)> UploadAttachmentAsync(
            string userId,
            Guid tripId,
            IFormFile file,
            CancellationToken cancellationToken = default);
    }
}

