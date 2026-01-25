using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Repositories
{
    /// <summary>
    /// Repository abstraction for all travel-related persistence concerns.
    /// Controllers should not depend on this directly – use services instead.
    /// </summary>
    public interface ITravelRepository
    {
        // Trips
        Task<IReadOnlyList<Trip>> GetTripsForUserAsync(string userId);
        Task<Trip?> GetTripAsync(string userId, Guid tripId);
        Task AddTripAsync(Trip trip);
        Task RemoveTripAsync(Trip trip);

        // Trip cities
        Task<bool> TripExistsForUserAsync(Guid tripId, string userId);
        Task<IReadOnlyList<TripCity>> GetTripCitiesAsync(Guid tripId);
        Task AddTripCityAsync(TripCity city);
        Task<TripCity?> GetTripCityAsync(Guid tripId, Guid cityId);
        Task<IReadOnlyList<TripCity>> GetTripCitiesForReorderAsync(Guid tripId);
        Task RemoveTripCityAsync(TripCity city);

        // Itinerary events
        Task<IReadOnlyList<ItineraryEvent>> GetEventsAsync(Guid tripId);
        Task AddEventAsync(ItineraryEvent evt);
        Task<ItineraryEvent?> GetEventAsync(Guid tripId, Guid eventId);
        Task RemoveEventAsync(ItineraryEvent evt);

        // Packing items
        Task<IReadOnlyList<PackingItem>> GetPackingItemsAsync(Guid tripId);
        Task AddPackingItemAsync(PackingItem item);
        Task<PackingItem?> GetPackingItemAsync(Guid tripId, Guid itemId);
        Task RemovePackingItemAsync(PackingItem item);

        // Documents
        Task<IReadOnlyList<TravelDocument>> GetDocumentsAsync(Guid tripId);
        Task AddDocumentAsync(TravelDocument document);
        Task<TravelDocument?> GetDocumentAsync(Guid tripId, Guid documentId);
        Task RemoveDocumentAsync(TravelDocument document);

        // Expenses
        Task<IReadOnlyList<TravelExpense>> GetExpensesAsync(Guid tripId);
        Task AddExpenseAsync(TravelExpense expense);
        Task<TravelExpense?> GetExpenseAsync(Guid tripId, Guid expenseId);
        Task RemoveExpenseAsync(TravelExpense expense);

        // Layout preferences
        Task<TripLayoutPreferences?> GetLayoutPreferencesAsync(Guid tripId);
        Task AddLayoutPreferencesAsync(TripLayoutPreferences preferences);
        Task RemoveLayoutPreferencesAsync(TripLayoutPreferences preferences);

        // Saved Places
        Task<IReadOnlyList<SavedPlace>> GetSavedPlacesAsync(Guid tripId);
        Task AddSavedPlaceAsync(SavedPlace place);
        Task<SavedPlace?> GetSavedPlaceAsync(Guid tripId, Guid placeId);
        Task RemoveSavedPlaceAsync(SavedPlace place);

        // Notes
        Task<IReadOnlyList<TravelNote>> GetNotesAsync(Guid tripId);
        Task AddNoteAsync(TravelNote note);
        Task<TravelNote?> GetNoteAsync(Guid tripId, Guid noteId);
        Task RemoveNoteAsync(TravelNote note);

        // Unit of work
        Task SaveChangesAsync();
    }
}

