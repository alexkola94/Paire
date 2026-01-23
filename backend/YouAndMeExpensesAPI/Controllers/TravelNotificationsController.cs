using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Controller for managing travel notifications
    /// Handles document expiry alerts, budget warnings, itinerary reminders, and packing progress
    /// </summary>
    [ApiController]
    [Route("api/travel/notifications")]
    [Authorize]
    public class TravelNotificationsController : BaseApiController
    {
        private readonly ITravelNotificationService _notificationService;
        private readonly ILogger<TravelNotificationsController> _logger;

        public TravelNotificationsController(
            ITravelNotificationService notificationService,
            ILogger<TravelNotificationsController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        #region Notifications

        /// <summary>
        /// Get all notifications for the authenticated user
        /// </summary>
        /// <param name="tripId">Optional trip ID filter</param>
        /// <param name="unreadOnly">If true, only return unread notifications</param>
        /// <param name="limit">Maximum number of notifications to return (default 50)</param>
        [HttpGet]
        [ProducesResponseType(typeof(List<TravelNotificationDto>), 200)]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] Guid? tripId = null,
            [FromQuery] bool unreadOnly = false,
            [FromQuery] int limit = 50)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                var notifications = await _notificationService.GetNotificationsAsync(userId, tripId, unreadOnly, limit);
                var dtos = notifications.Select(TravelNotificationDto.FromEntity).ToList();
                return Ok(dtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve notifications" });
            }
        }

        /// <summary>
        /// Get unread notification count
        /// </summary>
        /// <param name="tripId">Optional trip ID filter</param>
        [HttpGet("unread")]
        [ProducesResponseType(typeof(UnreadCountDto), 200)]
        public async Task<IActionResult> GetUnreadCount([FromQuery] Guid? tripId = null)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                var count = await _notificationService.GetUnreadCountAsync(userId, tripId);
                return Ok(new UnreadCountDto { Count = count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread count for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to get unread count" });
            }
        }

        /// <summary>
        /// Mark a notification as read
        /// </summary>
        /// <param name="id">Notification ID</param>
        [HttpPut("{id}/read")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            try
            {
                await _notificationService.MarkAsReadAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification {NotificationId} as read", id);
                return StatusCode(500, new { error = "Failed to mark notification as read" });
            }
        }

        /// <summary>
        /// Mark all notifications as read
        /// </summary>
        /// <param name="tripId">Optional trip ID filter</param>
        [HttpPost("mark-all-read")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> MarkAllAsRead([FromQuery] Guid? tripId = null)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                await _notificationService.MarkAllAsReadAsync(userId, tripId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to mark notifications as read" });
            }
        }

        /// <summary>
        /// Delete a notification
        /// </summary>
        /// <param name="id">Notification ID</param>
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> DeleteNotification(Guid id)
        {
            try
            {
                await _notificationService.DeleteNotificationAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification {NotificationId}", id);
                return StatusCode(500, new { error = "Failed to delete notification" });
            }
        }

        #endregion

        #region Preferences

        /// <summary>
        /// Get notification preferences
        /// </summary>
        /// <param name="tripId">Optional trip ID for trip-specific preferences</param>
        [HttpGet("preferences")]
        [ProducesResponseType(typeof(TravelNotificationPreferencesDto), 200)]
        public async Task<IActionResult> GetPreferences([FromQuery] Guid? tripId = null)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                var preferences = await _notificationService.GetPreferencesAsync(userId, tripId);
                return Ok(TravelNotificationPreferencesDto.FromEntity(preferences));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notification preferences for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve preferences" });
            }
        }

        /// <summary>
        /// Update notification preferences
        /// </summary>
        /// <param name="dto">Updated preferences</param>
        [HttpPut("preferences")]
        [ProducesResponseType(typeof(TravelNotificationPreferencesDto), 200)]
        public async Task<IActionResult> UpdatePreferences([FromBody] TravelNotificationPreferencesDto dto)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                var updated = await _notificationService.UpdatePreferencesAsync(userId, dto);
                return Ok(TravelNotificationPreferencesDto.FromEntity(updated));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating notification preferences for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to update preferences" });
            }
        }

        #endregion

        #region Push Subscriptions

        /// <summary>
        /// Register a push notification subscription
        /// </summary>
        /// <param name="dto">Push subscription details</param>
        [HttpPost("push-subscription")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> RegisterPushSubscription([FromBody] PushSubscriptionDto dto)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                await _notificationService.RegisterPushSubscriptionAsync(userId, dto);
                return Ok(new { success = true, message = "Push subscription registered" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering push subscription for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to register push subscription" });
            }
        }

        /// <summary>
        /// Unregister a push notification subscription
        /// </summary>
        /// <param name="endpoint">Push endpoint to remove</param>
        [HttpDelete("push-subscription")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> UnregisterPushSubscription([FromQuery] string endpoint)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                await _notificationService.UnregisterPushSubscriptionAsync(userId, endpoint);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unregistering push subscription for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to unregister push subscription" });
            }
        }

        #endregion

        #region Manual Triggers

        /// <summary>
        /// Manually trigger notification check for a specific trip
        /// </summary>
        /// <param name="tripId">Trip ID to check</param>
        [HttpPost("check")]
        [ProducesResponseType(typeof(NotificationCheckResult), 200)]
        public async Task<IActionResult> CheckNotifications([FromQuery] Guid tripId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "User not authenticated" });

            try
            {
                _logger.LogInformation("Manual notification check triggered for trip {TripId}", tripId);
                var sent = await _notificationService.CheckAndSendAllTripNotificationsAsync(tripId);

                return Ok(new NotificationCheckResult
                {
                    Success = true,
                    NotificationsSent = sent,
                    Message = $"Sent {sent} notification(s) successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking notifications for trip {TripId}", tripId);
                return StatusCode(500, new NotificationCheckResult
                {
                    Success = false,
                    NotificationsSent = 0,
                    Message = "Failed to check notifications"
                });
            }
        }

        /// <summary>
        /// Check document expiry notifications for a trip
        /// </summary>
        [HttpPost("check-documents")]
        public async Task<IActionResult> CheckDocumentNotifications([FromQuery] Guid tripId)
        {
            try
            {
                var sent = await _notificationService.SendDocumentExpiryNotificationsAsync(tripId);
                return Ok(new { notificationsSent = sent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking document notifications for trip {TripId}", tripId);
                return StatusCode(500, new { error = "Failed to check document notifications" });
            }
        }

        /// <summary>
        /// Check budget alert notifications for a trip
        /// </summary>
        [HttpPost("check-budget")]
        public async Task<IActionResult> CheckBudgetNotifications([FromQuery] Guid tripId)
        {
            try
            {
                var sent = await _notificationService.SendBudgetAlertNotificationsAsync(tripId);
                return Ok(new { notificationsSent = sent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking budget notifications for trip {TripId}", tripId);
                return StatusCode(500, new { error = "Failed to check budget notifications" });
            }
        }

        /// <summary>
        /// Check itinerary reminder notifications for a trip
        /// </summary>
        [HttpPost("check-itinerary")]
        public async Task<IActionResult> CheckItineraryNotifications([FromQuery] Guid tripId)
        {
            try
            {
                var sent = await _notificationService.SendItineraryRemindersAsync(tripId);
                return Ok(new { notificationsSent = sent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking itinerary notifications for trip {TripId}", tripId);
                return StatusCode(500, new { error = "Failed to check itinerary notifications" });
            }
        }

        #endregion
    }
}
