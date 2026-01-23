using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Travel notification service interface
    /// Handles document expiry alerts, budget warnings, itinerary reminders, and packing progress
    /// </summary>
    public interface ITravelNotificationService
    {
        #region Preferences

        /// <summary>
        /// Gets notification preferences for a user, optionally for a specific trip
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="tripId">Optional trip ID for trip-specific preferences</param>
        /// <returns>Notification preferences</returns>
        Task<TravelNotificationPreferences> GetPreferencesAsync(string userId, Guid? tripId = null);

        /// <summary>
        /// Updates or creates notification preferences for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="dto">Preferences DTO</param>
        /// <returns>Updated preferences</returns>
        Task<TravelNotificationPreferences> UpdatePreferencesAsync(string userId, TravelNotificationPreferencesDto dto);

        #endregion

        #region Push Subscriptions

        /// <summary>
        /// Registers a web push subscription for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="dto">Push subscription details</param>
        /// <returns>Registered subscription</returns>
        Task<PushSubscription> RegisterPushSubscriptionAsync(string userId, PushSubscriptionDto dto);

        /// <summary>
        /// Unregisters a push subscription
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="endpoint">Push endpoint to remove</param>
        Task UnregisterPushSubscriptionAsync(string userId, string endpoint);

        /// <summary>
        /// Gets all active push subscriptions for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of active subscriptions</returns>
        Task<List<PushSubscription>> GetPushSubscriptionsAsync(string userId);

        #endregion

        #region Notification Sending

        /// <summary>
        /// Checks and sends document expiry notifications for a trip
        /// </summary>
        /// <param name="tripId">Trip ID</param>
        /// <returns>Number of notifications sent</returns>
        Task<int> SendDocumentExpiryNotificationsAsync(Guid tripId);

        /// <summary>
        /// Checks and sends budget alert notifications for a trip
        /// </summary>
        /// <param name="tripId">Trip ID</param>
        /// <returns>Number of notifications sent</returns>
        Task<int> SendBudgetAlertNotificationsAsync(Guid tripId);

        /// <summary>
        /// Checks and sends itinerary reminder notifications for a trip
        /// </summary>
        /// <param name="tripId">Trip ID</param>
        /// <returns>Number of notifications sent</returns>
        Task<int> SendItineraryRemindersAsync(Guid tripId);

        /// <summary>
        /// Sends packing progress notification for a trip
        /// </summary>
        /// <param name="tripId">Trip ID</param>
        /// <returns>Number of notifications sent</returns>
        Task<int> SendPackingProgressNotificationAsync(Guid tripId);

        /// <summary>
        /// Sends trip approaching notification
        /// </summary>
        /// <param name="tripId">Trip ID</param>
        /// <returns>Number of notifications sent</returns>
        Task<int> SendTripApproachingNotificationAsync(Guid tripId);

        /// <summary>
        /// Checks and sends all notification types for a specific trip
        /// </summary>
        /// <param name="tripId">Trip ID</param>
        /// <returns>Total notifications sent</returns>
        Task<int> CheckAndSendAllTripNotificationsAsync(Guid tripId);

        #endregion

        #region Notification Management

        /// <summary>
        /// Gets notifications for a user, optionally filtered by trip and read status
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="tripId">Optional trip ID filter</param>
        /// <param name="unreadOnly">If true, only returns unread notifications</param>
        /// <param name="limit">Maximum number to return (default 50)</param>
        /// <returns>List of notifications</returns>
        Task<List<TravelNotification>> GetNotificationsAsync(string userId, Guid? tripId = null, bool unreadOnly = false, int limit = 50);

        /// <summary>
        /// Gets unread notification count for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="tripId">Optional trip ID filter</param>
        /// <returns>Unread count</returns>
        Task<int> GetUnreadCountAsync(string userId, Guid? tripId = null);

        /// <summary>
        /// Marks a notification as read
        /// </summary>
        /// <param name="notificationId">Notification ID</param>
        Task MarkAsReadAsync(Guid notificationId);

        /// <summary>
        /// Marks all notifications as read for a user
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <param name="tripId">Optional trip ID filter</param>
        Task MarkAllAsReadAsync(string userId, Guid? tripId = null);

        /// <summary>
        /// Deletes a notification
        /// </summary>
        /// <param name="notificationId">Notification ID</param>
        Task DeleteNotificationAsync(Guid notificationId);

        #endregion

        #region Background Job Entry Points

        /// <summary>
        /// Checks and sends notifications for all active trips (called by background service)
        /// </summary>
        /// <returns>Total notifications sent across all trips</returns>
        Task<int> CheckAllTripsNotificationsAsync();

        #endregion
    }
}
