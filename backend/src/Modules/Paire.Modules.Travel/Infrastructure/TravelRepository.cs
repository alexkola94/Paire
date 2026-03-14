using Paire.Modules.Travel.Core.Entities;

namespace Paire.Modules.Travel.Infrastructure;

public class TravelRepository : ITravelRepository
{
    private readonly TravelDbContext _dbContext;

    public TravelRepository(TravelDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Trip>> GetTripsForUserAsync(string userId) =>
        await _dbContext.Trips.AsNoTracking().Where(t => t.UserId == userId).OrderByDescending(t => t.StartDate).ToListAsync();

    public async Task<Trip?> GetTripAsync(string userId, Guid tripId) =>
        await _dbContext.Trips.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tripId && t.UserId == userId);

    public async Task AddTripAsync(Trip trip) => await _dbContext.Trips.AddAsync(trip);
    public Task RemoveTripAsync(Trip trip) { _dbContext.Trips.Remove(trip); return Task.CompletedTask; }

    public async Task<bool> TripExistsForUserAsync(Guid tripId, string userId) =>
        await _dbContext.Trips.AsNoTracking().AnyAsync(t => t.Id == tripId && t.UserId == userId);

    public async Task<IReadOnlyList<TripCity>> GetTripCitiesAsync(Guid tripId) =>
        await _dbContext.TripCities.AsNoTracking().Where(c => c.TripId == tripId).OrderBy(c => c.OrderIndex).ToListAsync();

    public async Task AddTripCityAsync(TripCity city) => await _dbContext.TripCities.AddAsync(city);

    public async Task<TripCity?> GetTripCityAsync(Guid tripId, Guid cityId) =>
        await _dbContext.TripCities.AsNoTracking().FirstOrDefaultAsync(c => c.Id == cityId && c.TripId == tripId);

    public async Task<IReadOnlyList<TripCity>> GetTripCitiesForReorderAsync(Guid tripId) =>
        await _dbContext.TripCities.Where(c => c.TripId == tripId).ToListAsync();

    public Task RemoveTripCityAsync(TripCity city) { _dbContext.TripCities.Remove(city); return Task.CompletedTask; }

    public async Task<IReadOnlyList<ItineraryEvent>> GetEventsAsync(Guid tripId) =>
        await _dbContext.ItineraryEvents.AsNoTracking().Where(e => e.TripId == tripId).OrderBy(e => e.Date).ThenBy(e => e.StartTime).ToListAsync();

    public async Task AddEventAsync(ItineraryEvent evt) => await _dbContext.ItineraryEvents.AddAsync(evt);

    public async Task<ItineraryEvent?> GetEventAsync(Guid tripId, Guid eventId) =>
        await _dbContext.ItineraryEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == eventId && e.TripId == tripId);

    public Task RemoveEventAsync(ItineraryEvent evt) { _dbContext.ItineraryEvents.Remove(evt); return Task.CompletedTask; }

    public async Task<IReadOnlyList<PackingItem>> GetPackingItemsAsync(Guid tripId) =>
        await _dbContext.PackingItems.AsNoTracking().Where(p => p.TripId == tripId).OrderBy(p => p.Category).ThenBy(p => p.Name).ToListAsync();

    public async Task AddPackingItemAsync(PackingItem item) => await _dbContext.PackingItems.AddAsync(item);

    public async Task<PackingItem?> GetPackingItemAsync(Guid tripId, Guid itemId) =>
        await _dbContext.PackingItems.AsNoTracking().FirstOrDefaultAsync(p => p.Id == itemId && p.TripId == tripId);

    public Task RemovePackingItemAsync(PackingItem item) { _dbContext.PackingItems.Remove(item); return Task.CompletedTask; }

    public async Task<IReadOnlyList<TravelDocument>> GetDocumentsAsync(Guid tripId) =>
        await _dbContext.TravelDocuments.AsNoTracking().Where(d => d.TripId == tripId).OrderBy(d => d.Type).ThenBy(d => d.Name).ToListAsync();

    public async Task AddDocumentAsync(TravelDocument document) => await _dbContext.TravelDocuments.AddAsync(document);

    public async Task<TravelDocument?> GetDocumentAsync(Guid tripId, Guid documentId) =>
        await _dbContext.TravelDocuments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == documentId && d.TripId == tripId);

    public Task RemoveDocumentAsync(TravelDocument document) { _dbContext.TravelDocuments.Remove(document); return Task.CompletedTask; }

    public async Task<IReadOnlyList<TravelExpense>> GetExpensesAsync(Guid tripId) =>
        await _dbContext.TravelExpenses.AsNoTracking().Where(e => e.TripId == tripId).OrderByDescending(e => e.Date).ToListAsync();

    public async Task AddExpenseAsync(TravelExpense expense) => await _dbContext.TravelExpenses.AddAsync(expense);

    public async Task<TravelExpense?> GetExpenseAsync(Guid tripId, Guid expenseId) =>
        await _dbContext.TravelExpenses.AsNoTracking().FirstOrDefaultAsync(e => e.Id == expenseId && e.TripId == tripId);

    public Task RemoveExpenseAsync(TravelExpense expense) { _dbContext.TravelExpenses.Remove(expense); return Task.CompletedTask; }

    public async Task<TripLayoutPreferences?> GetLayoutPreferencesAsync(Guid tripId) =>
        await _dbContext.TripLayoutPreferences.AsNoTracking().FirstOrDefaultAsync(p => p.TripId == tripId);

    public async Task AddLayoutPreferencesAsync(TripLayoutPreferences preferences) => await _dbContext.TripLayoutPreferences.AddAsync(preferences);
    public Task RemoveLayoutPreferencesAsync(TripLayoutPreferences preferences) { _dbContext.TripLayoutPreferences.Remove(preferences); return Task.CompletedTask; }

    public async Task<IReadOnlyList<SavedPlace>> GetSavedPlacesAsync(Guid tripId) =>
        await _dbContext.SavedPlaces.AsNoTracking().Where(p => p.TripId == tripId).OrderByDescending(p => p.CreatedAt).ToListAsync();

    public async Task AddSavedPlaceAsync(SavedPlace place) => await _dbContext.SavedPlaces.AddAsync(place);

    public async Task<SavedPlace?> GetSavedPlaceAsync(Guid tripId, Guid placeId) =>
        await _dbContext.SavedPlaces.AsNoTracking().FirstOrDefaultAsync(p => p.Id == placeId && p.TripId == tripId);

    public Task RemoveSavedPlaceAsync(SavedPlace place) { _dbContext.SavedPlaces.Remove(place); return Task.CompletedTask; }

    public async Task<IReadOnlyList<TravelNote>> GetNotesAsync(Guid tripId) =>
        await _dbContext.TravelNotes.AsNoTracking().Where(n => n.TripId == tripId).OrderByDescending(n => n.CreatedAt).ToListAsync();

    public async Task AddNoteAsync(TravelNote note) => await _dbContext.TravelNotes.AddAsync(note);

    public async Task<TravelNote?> GetNoteAsync(Guid tripId, Guid noteId) =>
        await _dbContext.TravelNotes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == noteId && n.TripId == tripId);

    public Task RemoveNoteAsync(TravelNote note) { _dbContext.TravelNotes.Remove(note); return Task.CompletedTask; }

    public async Task SaveChangesAsync() => await _dbContext.SaveChangesAsync();
}
