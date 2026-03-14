using Paire.Modules.Travel.Core.DTOs;
using Paire.Modules.Travel.Core.Entities;

namespace Paire.Modules.Travel.Core.Interfaces;

public interface ITravelNotificationService
{
    Task<TravelNotificationPreferences> GetPreferencesAsync(string userId, Guid? tripId = null);
    Task<TravelNotificationPreferences> UpdatePreferencesAsync(string userId, TravelNotificationPreferencesDto dto);

    Task<PushSubscription> RegisterPushSubscriptionAsync(string userId, PushSubscriptionDto dto);
    Task UnregisterPushSubscriptionAsync(string userId, string endpoint);
    Task<List<PushSubscription>> GetPushSubscriptionsAsync(string userId);

    Task<int> SendDocumentExpiryNotificationsAsync(Guid tripId);
    Task<int> SendBudgetAlertNotificationsAsync(Guid tripId);
    Task<int> SendItineraryRemindersAsync(Guid tripId);
    Task<int> SendPackingProgressNotificationAsync(Guid tripId);
    Task<int> SendTripApproachingNotificationAsync(Guid tripId);
    Task<int> CheckAndSendAllTripNotificationsAsync(Guid tripId);

    Task<List<TravelNotification>> GetNotificationsAsync(string userId, Guid? tripId = null, bool unreadOnly = false, int limit = 50);
    Task<int> GetUnreadCountAsync(string userId, Guid? tripId = null);
    Task MarkAsReadAsync(Guid notificationId);
    Task MarkAllAsReadAsync(string userId, Guid? tripId = null);
    Task DeleteNotificationAsync(Guid notificationId);

    Task<int> CheckAllTripsNotificationsAsync();
}
