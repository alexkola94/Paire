using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.DTOs;
using System.Text.Json;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Travel notification service implementation
    /// Handles document expiry alerts, budget warnings, itinerary reminders, and packing progress
    /// </summary>
    public class TravelNotificationService : ITravelNotificationService
    {
        private readonly AppDbContext _dbContext;
        private readonly IEmailService _emailService;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<TravelNotificationService> _logger;
        private readonly IConfiguration _configuration;

        public TravelNotificationService(
            AppDbContext dbContext,
            IEmailService emailService,
            UserManager<ApplicationUser> userManager,
            ILogger<TravelNotificationService> logger,
            IConfiguration configuration)
        {
            _dbContext = dbContext;
            _emailService = emailService;
            _userManager = userManager;
            _logger = logger;
            _configuration = configuration;
        }

        private string GetFrontendUrl()
        {
            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
            if (frontendUrl.Contains(';'))
                frontendUrl = frontendUrl.Split(';')[0].Trim();
            else if (frontendUrl.Contains(','))
                frontendUrl = frontendUrl.Split(',')[0].Trim();
            return frontendUrl;
        }

        #region Preferences

        public async Task<TravelNotificationPreferences> GetPreferencesAsync(string userId, Guid? tripId = null)
        {
            try
            {
                var preferences = await _dbContext.TravelNotificationPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.TripId == tripId);

                if (preferences == null)
                {
                    preferences = new TravelNotificationPreferences
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        TripId = tripId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }

                return preferences;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting travel notification preferences for user {UserId}", userId);
                throw;
            }
        }

        public async Task<TravelNotificationPreferences> UpdatePreferencesAsync(string userId, TravelNotificationPreferencesDto dto)
        {
            try
            {
                var existing = await _dbContext.TravelNotificationPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.TripId == dto.TripId);

                if (existing != null)
                {
                    dto.ApplyToEntity(existing);
                    await _dbContext.SaveChangesAsync();
                    _logger.LogInformation("Travel notification preferences updated for user {UserId}", userId);
                    return existing;
                }

                var preferences = new TravelNotificationPreferences
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                dto.ApplyToEntity(preferences);

                _dbContext.TravelNotificationPreferences.Add(preferences);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Travel notification preferences created for user {UserId}", userId);
                return preferences;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating travel notification preferences for user {UserId}", userId);
                throw;
            }
        }

        #endregion

        #region Push Subscriptions

        public async Task<PushSubscription> RegisterPushSubscriptionAsync(string userId, PushSubscriptionDto dto)
        {
            try
            {
                // Check if subscription already exists
                var existing = await _dbContext.PushSubscriptions
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == dto.Endpoint);

                if (existing != null)
                {
                    existing.P256dhKey = dto.P256dhKey;
                    existing.AuthKey = dto.AuthKey;
                    existing.UserAgent = dto.UserAgent;
                    existing.IsActive = true;
                    existing.LastUsedAt = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync();
                    return existing;
                }

                var subscription = new PushSubscription
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Endpoint = dto.Endpoint,
                    P256dhKey = dto.P256dhKey,
                    AuthKey = dto.AuthKey,
                    UserAgent = dto.UserAgent,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.PushSubscriptions.Add(subscription);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Push subscription registered for user {UserId}", userId);
                return subscription;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering push subscription for user {UserId}", userId);
                throw;
            }
        }

        public async Task UnregisterPushSubscriptionAsync(string userId, string endpoint)
        {
            try
            {
                var subscription = await _dbContext.PushSubscriptions
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);

                if (subscription != null)
                {
                    subscription.IsActive = false;
                    await _dbContext.SaveChangesAsync();
                    _logger.LogInformation("Push subscription unregistered for user {UserId}", userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unregistering push subscription for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<PushSubscription>> GetPushSubscriptionsAsync(string userId)
        {
            return await _dbContext.PushSubscriptions
                .Where(s => s.UserId == userId && s.IsActive)
                .ToListAsync();
        }

        #endregion

        #region Notification Sending

        public async Task<int> SendDocumentExpiryNotificationsAsync(Guid tripId)
        {
            try
            {
                var trip = await _dbContext.Trips
                    .Include(t => t.Documents)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null || string.IsNullOrEmpty(trip.UserId))
                {
                    _logger.LogWarning("Trip {TripId} not found or has no user", tripId);
                    return 0;
                }

                var preferences = await GetPreferencesAsync(trip.UserId, tripId);
                if (!preferences.DocumentExpiryEnabled || !preferences.EmailEnabled)
                {
                    _logger.LogDebug("Document expiry notifications disabled for trip {TripId}", tripId);
                    return 0;
                }

                var (userEmail, displayName) = await GetUserEmailAsync(trip.UserId);
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning("No email found for user {UserId}", trip.UserId);
                    return 0;
                }

                var expiryDays = TravelNotificationPreferencesDto.FromEntity(preferences).DocumentExpiryDays;
                var today = DateTime.UtcNow.Date;
                var notificationsSent = 0;

                foreach (var document in trip.Documents.Where(d => d.ExpiryDate.HasValue))
                {
                    var daysUntilExpiry = (document.ExpiryDate!.Value.Date - today).Days;

                    // Check if already notified for this document at this threshold
                    var alreadyNotified = await _dbContext.TravelNotifications
                        .AnyAsync(n => n.ReferenceId == document.Id
                            && n.Type == TravelNotificationType.DocumentExpiring
                            && n.CreatedAt >= today);

                    if (alreadyNotified) continue;

                    TravelNotificationType? notificationType = null;
                    string urgency = "";

                    if (daysUntilExpiry < 0)
                    {
                        notificationType = TravelNotificationType.DocumentExpired;
                        urgency = $"EXPIRED {Math.Abs(daysUntilExpiry)} days ago";
                    }
                    else if (expiryDays.Contains(daysUntilExpiry) || (daysUntilExpiry <= 1 && expiryDays.Any(d => d <= 1)))
                    {
                        notificationType = TravelNotificationType.DocumentExpiring;
                        urgency = daysUntilExpiry == 0 ? "EXPIRES TODAY" : $"Expires in {daysUntilExpiry} day(s)";
                    }

                    if (notificationType.HasValue)
                    {
                        var notification = await CreateAndSendNotificationAsync(
                            trip.UserId,
                            tripId,
                            notificationType.Value,
                            $"Document Alert: {document.Name}",
                            $"Your {document.Type} '{document.Name}' {urgency}. Please review before your trip to {trip.Destination}.",
                            daysUntilExpiry < 0 ? "critical" : "high",
                            document.Id,
                            "document",
                            userEmail,
                            displayName
                        );

                        if (notification != null) notificationsSent++;
                    }
                }

                _logger.LogInformation("Sent {Count} document expiry notification(s) for trip {TripId}", notificationsSent, tripId);
                return notificationsSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending document expiry notifications for trip {TripId}", tripId);
                return 0;
            }
        }

        public async Task<int> SendBudgetAlertNotificationsAsync(Guid tripId)
        {
            try
            {
                var trip = await _dbContext.Trips
                    .Include(t => t.Expenses)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null || string.IsNullOrEmpty(trip.UserId) || trip.Budget <= 0)
                {
                    return 0;
                }

                var preferences = await GetPreferencesAsync(trip.UserId, tripId);
                if (!preferences.BudgetAlertsEnabled || !preferences.EmailEnabled)
                {
                    return 0;
                }

                var (userEmail, displayName) = await GetUserEmailAsync(trip.UserId);
                if (string.IsNullOrEmpty(userEmail)) return 0;

                var totalSpent = trip.Expenses.Sum(e => e.AmountInBaseCurrency);
                var percentUsed = (totalSpent / trip.Budget) * 100;

                // Check which threshold we've crossed
                TravelNotificationType? notificationType = null;
                string message = "";

                if (percentUsed >= 100 && preferences.BudgetExceededEnabled)
                {
                    notificationType = TravelNotificationType.BudgetExceeded;
                    message = $"You've exceeded your travel budget! Spent {trip.BudgetCurrency} {totalSpent:N2} of {trip.BudgetCurrency} {trip.Budget:N2} ({percentUsed:F1}%)";
                }
                else if (percentUsed >= 90 && preferences.BudgetThreshold90Enabled)
                {
                    notificationType = TravelNotificationType.BudgetThreshold90;
                    message = $"You've used 90% of your travel budget. Spent {trip.BudgetCurrency} {totalSpent:N2} of {trip.BudgetCurrency} {trip.Budget:N2}";
                }
                else if (percentUsed >= 75 && preferences.BudgetThreshold75Enabled)
                {
                    notificationType = TravelNotificationType.BudgetThreshold75;
                    message = $"You've used 75% of your travel budget. Spent {trip.BudgetCurrency} {totalSpent:N2} of {trip.BudgetCurrency} {trip.Budget:N2}";
                }

                if (notificationType.HasValue)
                {
                    // Check if already notified for this threshold today
                    var today = DateTime.UtcNow.Date;
                    var alreadyNotified = await _dbContext.TravelNotifications
                        .AnyAsync(n => n.TripId == tripId
                            && n.Type == notificationType.Value
                            && n.CreatedAt >= today);

                    if (!alreadyNotified)
                    {
                        var notification = await CreateAndSendNotificationAsync(
                            trip.UserId,
                            tripId,
                            notificationType.Value,
                            $"Budget Alert: {trip.Name}",
                            message,
                            percentUsed >= 100 ? "critical" : "medium",
                            tripId,
                            "trip",
                            userEmail,
                            displayName
                        );

                        if (notification != null)
                        {
                            _logger.LogInformation("Sent budget alert ({Type}) for trip {TripId}", notificationType, tripId);
                            return 1;
                        }
                    }
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending budget alerts for trip {TripId}", tripId);
                return 0;
            }
        }

        public async Task<int> SendItineraryRemindersAsync(Guid tripId)
        {
            try
            {
                var trip = await _dbContext.Trips
                    .Include(t => t.ItineraryEvents)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null || string.IsNullOrEmpty(trip.UserId))
                    return 0;

                var preferences = await GetPreferencesAsync(trip.UserId, tripId);
                if (!preferences.ItineraryRemindersEnabled || !preferences.EmailEnabled)
                    return 0;

                var (userEmail, displayName) = await GetUserEmailAsync(trip.UserId);
                if (string.IsNullOrEmpty(userEmail)) return 0;

                var reminderHours = TravelNotificationPreferencesDto.FromEntity(preferences).ItineraryReminderHours;
                var now = DateTime.UtcNow;
                var notificationsSent = 0;

                foreach (var evt in trip.ItineraryEvents.Where(e => e.Date.HasValue && e.Date.Value >= now.Date))
                {
                    var eventDateTime = evt.Date!.Value.Date;
                    if (!string.IsNullOrEmpty(evt.StartTime) && TimeSpan.TryParse(evt.StartTime, out var startTime))
                    {
                        eventDateTime = eventDateTime.Add(startTime);
                    }

                    var hoursUntilEvent = (eventDateTime - now).TotalHours;

                    foreach (var hours in reminderHours.OrderByDescending(h => h))
                    {
                        if (hoursUntilEvent <= hours && hoursUntilEvent > hours - 1)
                        {
                            // Check if already notified
                            var notificationType = hours switch
                            {
                                1 => TravelNotificationType.ItineraryReminder1Hour,
                                6 => TravelNotificationType.ItineraryReminder6Hours,
                                _ => TravelNotificationType.ItineraryReminder24Hours
                            };

                            var alreadyNotified = await _dbContext.TravelNotifications
                                .AnyAsync(n => n.ReferenceId == evt.Id && n.Type == notificationType);

                            if (!alreadyNotified)
                            {
                                var notification = await CreateAndSendNotificationAsync(
                                    trip.UserId,
                                    tripId,
                                    notificationType,
                                    $"Upcoming: {evt.Name}",
                                    $"Your {evt.Type} '{evt.Name}' starts in {hours} hour(s). {(string.IsNullOrEmpty(evt.Location) ? "" : $"Location: {evt.Location}")}",
                                    "high",
                                    evt.Id,
                                    "itinerary_event",
                                    userEmail,
                                    displayName
                                );

                                if (notification != null) notificationsSent++;
                            }
                            break;
                        }
                    }
                }

                _logger.LogInformation("Sent {Count} itinerary reminder(s) for trip {TripId}", notificationsSent, tripId);
                return notificationsSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending itinerary reminders for trip {TripId}", tripId);
                return 0;
            }
        }

        public async Task<int> SendPackingProgressNotificationAsync(Guid tripId)
        {
            try
            {
                var trip = await _dbContext.Trips
                    .Include(t => t.PackingItems)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null || string.IsNullOrEmpty(trip.UserId) || !trip.PackingItems.Any())
                    return 0;

                var preferences = await GetPreferencesAsync(trip.UserId, tripId);
                if (!preferences.PackingProgressEnabled)
                    return 0;

                var total = trip.PackingItems.Count;
                var packed = trip.PackingItems.Count(i => i.IsChecked);
                var percentage = (packed * 100.0) / total;

                TravelNotificationType? notificationType = null;

                if (packed == total)
                    notificationType = TravelNotificationType.PackingComplete;
                else if (percentage >= 75)
                    notificationType = TravelNotificationType.PackingMilestone75;
                else if (percentage >= 50)
                    notificationType = TravelNotificationType.PackingMilestone50;

                if (notificationType.HasValue)
                {
                    // Check if already notified for this milestone
                    var alreadyNotified = await _dbContext.TravelNotifications
                        .AnyAsync(n => n.TripId == tripId && n.Type == notificationType.Value);

                    if (!alreadyNotified)
                    {
                        // Packing notifications are typically in-app only (toast)
                        var notification = new TravelNotification
                        {
                            Id = Guid.NewGuid(),
                            UserId = trip.UserId,
                            TripId = tripId,
                            Type = notificationType.Value,
                            Title = notificationType == TravelNotificationType.PackingComplete
                                ? "Packing Complete!"
                                : $"Packing Progress: {percentage:F0}%",
                            Body = $"You've packed {packed} of {total} items for {trip.Name}.",
                            Priority = "low",
                            CreatedAt = DateTime.UtcNow
                        };

                        _dbContext.TravelNotifications.Add(notification);
                        await _dbContext.SaveChangesAsync();

                        _logger.LogInformation("Sent packing progress notification for trip {TripId}", tripId);
                        return 1;
                    }
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending packing progress notification for trip {TripId}", tripId);
                return 0;
            }
        }

        public async Task<int> SendTripApproachingNotificationAsync(Guid tripId)
        {
            try
            {
                var trip = await _dbContext.Trips.FindAsync(tripId);
                if (trip == null || string.IsNullOrEmpty(trip.UserId) || !trip.StartDate.HasValue)
                    return 0;

                var preferences = await GetPreferencesAsync(trip.UserId, tripId);
                if (!preferences.TripApproachingEnabled || !preferences.EmailEnabled)
                    return 0;

                var daysUntilTrip = (trip.StartDate.Value.Date - DateTime.UtcNow.Date).Days;

                if (daysUntilTrip != preferences.TripApproachingDays)
                    return 0;

                // Check if already notified
                var alreadyNotified = await _dbContext.TravelNotifications
                    .AnyAsync(n => n.TripId == tripId && n.Type == TravelNotificationType.TripApproaching);

                if (alreadyNotified) return 0;

                var (userEmail, displayName) = await GetUserEmailAsync(trip.UserId);
                if (string.IsNullOrEmpty(userEmail)) return 0;

                var notification = await CreateAndSendNotificationAsync(
                    trip.UserId,
                    tripId,
                    TravelNotificationType.TripApproaching,
                    $"Trip Coming Up: {trip.Name}",
                    $"Your trip to {trip.Destination} starts in {daysUntilTrip} days! Make sure everything is ready.",
                    "medium",
                    tripId,
                    "trip",
                    userEmail,
                    displayName
                );

                return notification != null ? 1 : 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending trip approaching notification for trip {TripId}", tripId);
                return 0;
            }
        }

        public async Task<int> CheckAndSendAllTripNotificationsAsync(Guid tripId)
        {
            var total = 0;
            total += await SendDocumentExpiryNotificationsAsync(tripId);
            total += await SendBudgetAlertNotificationsAsync(tripId);
            total += await SendItineraryRemindersAsync(tripId);
            total += await SendPackingProgressNotificationAsync(tripId);
            total += await SendTripApproachingNotificationAsync(tripId);
            return total;
        }

        #endregion

        #region Notification Management

        public async Task<List<TravelNotification>> GetNotificationsAsync(string userId, Guid? tripId = null, bool unreadOnly = false, int limit = 50)
        {
            var query = _dbContext.TravelNotifications
                .Where(n => n.UserId == userId);

            if (tripId.HasValue)
                query = query.Where(n => n.TripId == tripId);

            if (unreadOnly)
                query = query.Where(n => n.ReadAt == null);

            return await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountAsync(string userId, Guid? tripId = null)
        {
            var query = _dbContext.TravelNotifications
                .Where(n => n.UserId == userId && n.ReadAt == null);

            if (tripId.HasValue)
                query = query.Where(n => n.TripId == tripId);

            return await query.CountAsync();
        }

        public async Task MarkAsReadAsync(Guid notificationId)
        {
            var notification = await _dbContext.TravelNotifications.FindAsync(notificationId);
            if (notification != null && notification.ReadAt == null)
            {
                notification.ReadAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();
            }
        }

        public async Task MarkAllAsReadAsync(string userId, Guid? tripId = null)
        {
            var query = _dbContext.TravelNotifications
                .Where(n => n.UserId == userId && n.ReadAt == null);

            if (tripId.HasValue)
                query = query.Where(n => n.TripId == tripId);

            var notifications = await query.ToListAsync();
            var now = DateTime.UtcNow;

            foreach (var notification in notifications)
            {
                notification.ReadAt = now;
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteNotificationAsync(Guid notificationId)
        {
            var notification = await _dbContext.TravelNotifications.FindAsync(notificationId);
            if (notification != null)
            {
                _dbContext.TravelNotifications.Remove(notification);
                await _dbContext.SaveChangesAsync();
            }
        }

        #endregion

        #region Background Job Entry Points

        public async Task<int> CheckAllTripsNotificationsAsync()
        {
            try
            {
                // Get all active trips
                var activeTrips = await _dbContext.Trips
                    .Where(t => t.Status == "planning" || t.Status == "active")
                    .Select(t => t.Id)
                    .ToListAsync();

                var totalSent = 0;
                foreach (var tripId in activeTrips)
                {
                    try
                    {
                        totalSent += await CheckAndSendAllTripNotificationsAsync(tripId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error checking notifications for trip {TripId}", tripId);
                    }
                }

                _logger.LogInformation("Sent {Count} total travel notifications across all trips", totalSent);
                return totalSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CheckAllTripsNotificationsAsync");
                return 0;
            }
        }

        #endregion

        #region Private Helpers

        private async Task<TravelNotification?> CreateAndSendNotificationAsync(
            string userId,
            Guid tripId,
            TravelNotificationType type,
            string title,
            string body,
            string priority,
            Guid? referenceId,
            string? referenceType,
            string userEmail,
            string? displayName)
        {
            try
            {
                var notification = new TravelNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TripId = tripId,
                    Type = type,
                    Title = title,
                    Body = body,
                    Priority = priority,
                    ReferenceId = referenceId,
                    ReferenceType = referenceType,
                    CreatedAt = DateTime.UtcNow
                };

                // Send email
                var htmlBody = $@"
                    <p>Hi {displayName ?? userEmail}!</p>
                    <div class='alert-box'>
                        <h3>{GetNotificationIcon(type)} {title}</h3>
                        <p>{body}</p>
                    </div>
                    <p>Open the app to view more details.</p>";

                var emailMessage = new EmailMessage
                {
                    ToEmail = userEmail,
                    ToName = displayName ?? userEmail,
                    Subject = $"{GetNotificationIcon(type)} {title}",
                    Body = EmailService.CreateReminderEmailTemplate(title, htmlBody, GetFrontendUrl()),
                    IsHtml = true
                };

                if (await _emailService.SendEmailAsync(emailMessage))
                {
                    notification.EmailSent = true;
                    notification.EmailSentAt = DateTime.UtcNow;
                }

                _dbContext.TravelNotifications.Add(notification);
                await _dbContext.SaveChangesAsync();

                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating and sending notification for user {UserId}", userId);
                return null;
            }
        }

        private static string GetNotificationIcon(TravelNotificationType type)
        {
            return type switch
            {
                TravelNotificationType.DocumentExpired => "🚨",
                TravelNotificationType.DocumentExpiring => "📄",
                TravelNotificationType.BudgetExceeded => "💸",
                TravelNotificationType.BudgetThreshold90 => "⚠️",
                TravelNotificationType.BudgetThreshold75 => "💰",
                TravelNotificationType.ItineraryReminder1Hour => "⏰",
                TravelNotificationType.ItineraryReminder6Hours => "🕐",
                TravelNotificationType.ItineraryReminder24Hours => "📅",
                TravelNotificationType.FlightStatusChange => "✈️",
                TravelNotificationType.HotelCheckIn => "🏨",
                TravelNotificationType.HotelCheckOut => "🏨",
                TravelNotificationType.PackingMilestone50 => "🧳",
                TravelNotificationType.PackingMilestone75 => "🧳",
                TravelNotificationType.PackingComplete => "✅",
                TravelNotificationType.TripApproaching => "🗺️",
                _ => "🔔"
            };
        }

        private async Task<(string? email, string? displayName)> GetUserEmailAsync(string userId)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    return (user.Email, user.DisplayName ?? user.Email);
                }

                if (Guid.TryParse(userId, out var userIdGuid))
                {
                    var profile = await _dbContext.UserProfiles
                        .FirstOrDefaultAsync(p => p.Id == userIdGuid);

                    if (profile != null && !string.IsNullOrEmpty(profile.Email))
                    {
                        return (profile.Email, profile.DisplayName ?? profile.Email);
                    }
                }

                return (null, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user email for user {UserId}", userId);
                return (null, null);
            }
        }

        #endregion
    }
}
