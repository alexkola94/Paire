using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// DTO for travel notification preferences
    /// </summary>
    public class TravelNotificationPreferencesDto
    {
        public Guid? TripId { get; set; }

        // Document notifications
        public bool DocumentExpiryEnabled { get; set; } = true;
        public List<int> DocumentExpiryDays { get; set; } = new() { 30, 14, 7, 1 };

        // Budget notifications
        public bool BudgetAlertsEnabled { get; set; } = true;
        public bool BudgetThreshold75Enabled { get; set; } = true;
        public bool BudgetThreshold90Enabled { get; set; } = true;
        public bool BudgetExceededEnabled { get; set; } = true;

        // Itinerary notifications
        public bool ItineraryRemindersEnabled { get; set; } = true;
        public List<int> ItineraryReminderHours { get; set; } = new() { 24, 6, 1 };

        // Packing notifications
        public bool PackingProgressEnabled { get; set; } = true;

        // Trip notifications
        public bool TripApproachingEnabled { get; set; } = true;
        public int TripApproachingDays { get; set; } = 7;

        // Delivery channels
        public bool EmailEnabled { get; set; } = true;
        public bool PushEnabled { get; set; } = true;
        public bool InAppEnabled { get; set; } = true;

        /// <summary>
        /// Converts entity to DTO
        /// </summary>
        public static TravelNotificationPreferencesDto FromEntity(TravelNotificationPreferences entity)
        {
            return new TravelNotificationPreferencesDto
            {
                TripId = entity.TripId,
                DocumentExpiryEnabled = entity.DocumentExpiryEnabled,
                DocumentExpiryDays = ParseCsvToIntList(entity.DocumentExpiryDays),
                BudgetAlertsEnabled = entity.BudgetAlertsEnabled,
                BudgetThreshold75Enabled = entity.BudgetThreshold75Enabled,
                BudgetThreshold90Enabled = entity.BudgetThreshold90Enabled,
                BudgetExceededEnabled = entity.BudgetExceededEnabled,
                ItineraryRemindersEnabled = entity.ItineraryRemindersEnabled,
                ItineraryReminderHours = ParseCsvToIntList(entity.ItineraryReminderHours),
                PackingProgressEnabled = entity.PackingProgressEnabled,
                TripApproachingEnabled = entity.TripApproachingEnabled,
                TripApproachingDays = entity.TripApproachingDays,
                EmailEnabled = entity.EmailEnabled,
                PushEnabled = entity.PushEnabled,
                InAppEnabled = entity.InAppEnabled
            };
        }

        /// <summary>
        /// Updates entity from DTO
        /// </summary>
        public void ApplyToEntity(TravelNotificationPreferences entity)
        {
            entity.TripId = TripId;
            entity.DocumentExpiryEnabled = DocumentExpiryEnabled;
            entity.DocumentExpiryDays = string.Join(",", DocumentExpiryDays);
            entity.BudgetAlertsEnabled = BudgetAlertsEnabled;
            entity.BudgetThreshold75Enabled = BudgetThreshold75Enabled;
            entity.BudgetThreshold90Enabled = BudgetThreshold90Enabled;
            entity.BudgetExceededEnabled = BudgetExceededEnabled;
            entity.ItineraryRemindersEnabled = ItineraryRemindersEnabled;
            entity.ItineraryReminderHours = string.Join(",", ItineraryReminderHours);
            entity.PackingProgressEnabled = PackingProgressEnabled;
            entity.TripApproachingEnabled = TripApproachingEnabled;
            entity.TripApproachingDays = TripApproachingDays;
            entity.EmailEnabled = EmailEnabled;
            entity.PushEnabled = PushEnabled;
            entity.InAppEnabled = InAppEnabled;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        private static List<int> ParseCsvToIntList(string csv)
        {
            if (string.IsNullOrWhiteSpace(csv))
                return new List<int>();

            return csv.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s.Trim(), out var num) ? num : 0)
                .Where(n => n > 0)
                .ToList();
        }
    }

    /// <summary>
    /// DTO for registering a push subscription
    /// </summary>
    public class PushSubscriptionDto
    {
        public string Endpoint { get; set; } = string.Empty;
        public string P256dhKey { get; set; } = string.Empty;
        public string AuthKey { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
    }

    /// <summary>
    /// DTO for notification response
    /// </summary>
    public class TravelNotificationDto
    {
        public Guid Id { get; set; }
        public Guid? TripId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string Priority { get; set; } = "medium";
        public object? Data { get; set; }
        public Guid? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Converts entity to DTO
        /// </summary>
        public static TravelNotificationDto FromEntity(TravelNotification entity)
        {
            object? data = null;
            if (!string.IsNullOrEmpty(entity.DataJson))
            {
                try
                {
                    data = System.Text.Json.JsonSerializer.Deserialize<object>(entity.DataJson);
                }
                catch
                {
                    data = null;
                }
            }

            return new TravelNotificationDto
            {
                Id = entity.Id,
                TripId = entity.TripId,
                Type = entity.Type.ToString(),
                Title = entity.Title,
                Body = entity.Body,
                Priority = entity.Priority,
                Data = data,
                ReferenceId = entity.ReferenceId,
                ReferenceType = entity.ReferenceType,
                IsRead = entity.ReadAt.HasValue,
                CreatedAt = entity.CreatedAt
            };
        }
    }

    /// <summary>
    /// DTO for notification check result
    /// </summary>
    public class NotificationCheckResult
    {
        public bool Success { get; set; }
        public int NotificationsSent { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Details { get; set; } = new();
    }

    /// <summary>
    /// DTO for unread count response
    /// </summary>
    public class UnreadCountDto
    {
        public int Count { get; set; }
    }
}
