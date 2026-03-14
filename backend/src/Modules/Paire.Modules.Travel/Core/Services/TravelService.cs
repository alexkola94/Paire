using Paire.Modules.Travel.Core.Entities;
using Paire.Modules.Travel.Core.Interfaces;
using Paire.Modules.Travel.Core.Utils;
using Paire.Modules.Travel.Infrastructure;

namespace Paire.Modules.Travel.Core.Services;

public class TravelService : ITravelService
{
    private readonly ITravelRepository _repository;
    private readonly ILogger<TravelService> _logger;

    public TravelService(ITravelRepository repository, ILogger<TravelService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Trip>> GetTripsAsync(string userId) =>
        await _repository.GetTripsForUserAsync(userId);

    public async Task<Trip?> GetTripAsync(string userId, Guid tripId) =>
        await _repository.GetTripAsync(userId, tripId);

    public async Task<Trip> CreateTripAsync(string userId, Trip trip)
    {
        trip.Id = Guid.NewGuid();
        trip.UserId = userId;
        trip.StartDate = DateTimeUtils.ToUtc(trip.StartDate);
        trip.EndDate = DateTimeUtils.ToUtc(trip.EndDate);
        trip.CreatedAt = DateTime.UtcNow;
        trip.UpdatedAt = DateTime.UtcNow;

        if (string.IsNullOrWhiteSpace(trip.TripType))
            trip.TripType = "single";

        await _repository.AddTripAsync(trip);
        await _repository.SaveChangesAsync();

        _logger.LogInformation("User {UserId} created trip {TripId} to {Destination}", userId, trip.Id, trip.Destination);
        return trip;
    }

    public async Task<Trip?> UpdateTripAsync(string userId, Guid tripId, Trip updates)
    {
        var existing = await _repository.GetTripAsync(userId, tripId);
        if (existing == null) return null;

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
        if (existing == null) return false;

        await _repository.RemoveTripAsync(existing);
        await _repository.SaveChangesAsync();
        _logger.LogInformation("User {UserId} deleted trip {TripId}", userId, tripId);
        return true;
    }

    public async Task<IReadOnlyList<TripCity>?> GetTripCitiesAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetTripCitiesAsync(tripId);
    }

    public async Task<TripCity?> CreateTripCityAsync(string userId, Guid tripId, TripCity city)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;

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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        var city = await _repository.GetTripCityAsync(tripId, cityId);
        if (city == null) return null;

        city.Name = updates.Name;
        city.Country = updates.Country;
        city.Latitude = updates.Latitude;
        city.Longitude = updates.Longitude;
        city.StartDate = DateTimeUtils.ToUtc(updates.StartDate);
        city.EndDate = DateTimeUtils.ToUtc(updates.EndDate);
        if (updates.OrderIndex >= 0) city.OrderIndex = updates.OrderIndex;
        city.UpdatedAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync();
        return city;
    }

    public async Task<bool> ReorderTripCitiesAsync(string userId, Guid tripId, List<Guid> orderedCityIds)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId) || orderedCityIds == null || orderedCityIds.Count == 0)
            return false;

        var cities = await _repository.GetTripCitiesForReorderAsync(tripId);
        var lookup = cities.ToDictionary(c => c.Id, c => c);

        for (var index = 0; index < orderedCityIds.Count; index++)
        {
            if (lookup.TryGetValue(orderedCityIds[index], out var city))
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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return false;
        var city = await _repository.GetTripCityAsync(tripId, cityId);
        if (city == null) return false;
        await _repository.RemoveTripCityAsync(city);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<ItineraryEvent>?> GetEventsAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetEventsAsync(tripId);
    }

    public async Task<ItineraryEvent?> CreateEventAsync(string userId, Guid tripId, ItineraryEvent evt)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;

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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        var evt = await _repository.GetEventAsync(tripId, eventId);
        if (evt == null) return null;

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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return false;
        var evt = await _repository.GetEventAsync(tripId, eventId);
        if (evt == null) return false;
        await _repository.RemoveEventAsync(evt);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PackingItem>?> GetPackingItemsAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetPackingItemsAsync(tripId);
    }

    public async Task<PackingItem?> CreatePackingItemAsync(string userId, Guid tripId, PackingItem item)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        var item = await _repository.GetPackingItemAsync(tripId, itemId);
        if (item == null) return null;

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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return false;
        var item = await _repository.GetPackingItemAsync(tripId, itemId);
        if (item == null) return false;
        await _repository.RemovePackingItemAsync(item);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<TravelDocument>?> GetDocumentsAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetDocumentsAsync(tripId);
    }

    public async Task<TravelDocument?> CreateDocumentAsync(string userId, Guid tripId, TravelDocument document)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        var document = await _repository.GetDocumentAsync(tripId, documentId);
        if (document == null) return null;

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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return false;
        var document = await _repository.GetDocumentAsync(tripId, documentId);
        if (document == null) return false;
        await _repository.RemoveDocumentAsync(document);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<TravelExpense>?> GetExpensesAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetExpensesAsync(tripId);
    }

    public async Task<TravelExpense?> CreateExpenseAsync(string userId, Guid tripId, TravelExpense expense)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        expense.Id = Guid.NewGuid();
        expense.TripId = tripId;
        expense.Date = DateTimeUtils.ToUtc(expense.Date);
        expense.CreatedAt = DateTime.UtcNow;
        expense.UpdatedAt = DateTime.UtcNow;
        if (expense.AmountInBaseCurrency == 0) expense.AmountInBaseCurrency = expense.Amount;
        await _repository.AddExpenseAsync(expense);
        await _repository.SaveChangesAsync();
        return expense;
    }

    public async Task<TravelExpense?> UpdateExpenseAsync(string userId, Guid tripId, Guid expenseId, TravelExpense updates)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        var expense = await _repository.GetExpenseAsync(tripId, expenseId);
        if (expense == null) return null;

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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return false;
        var expense = await _repository.GetExpenseAsync(tripId, expenseId);
        if (expense == null) return false;
        await _repository.RemoveExpenseAsync(expense);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<TripLayoutPreferences?> GetLayoutPreferencesAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetLayoutPreferencesAsync(tripId);
    }

    public async Task<TripLayoutPreferences> SaveLayoutPreferencesAsync(string userId, Guid tripId, string layoutConfig, string? preset)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId))
            throw new InvalidOperationException("Trip not found");

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
        place.Id = Guid.NewGuid();
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

    public async Task<IReadOnlyList<TravelNote>?> GetNotesAsync(string userId, Guid tripId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        return await _repository.GetNotesAsync(tripId);
    }

    public async Task<TravelNote?> CreateNoteAsync(string userId, Guid tripId, TravelNote note)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
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
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return null;
        var note = await _repository.GetNoteAsync(tripId, noteId);
        if (note == null) return null;
        note.Title = updates.Title;
        note.Body = updates.Body;
        note.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveChangesAsync();
        return note;
    }

    public async Task<bool> DeleteNoteAsync(string userId, Guid tripId, Guid noteId)
    {
        if (!await _repository.TripExistsForUserAsync(tripId, userId)) return false;
        var note = await _repository.GetNoteAsync(tripId, noteId);
        if (note == null) return false;
        await _repository.RemoveNoteAsync(note);
        await _repository.SaveChangesAsync();
        return true;
    }
}
