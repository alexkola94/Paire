using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Types of travel notifications
    /// </summary>
    public enum TravelNotificationType
    {
        // Document notifications
        DocumentExpiring,
        DocumentExpired,

        // Budget notifications
        BudgetThreshold75,
        BudgetThreshold90,
        BudgetExceeded,

        // Itinerary notifications
        ItineraryReminder1Hour,
        ItineraryReminder6Hours,
        ItineraryReminder24Hours,
        FlightStatusChange,
        HotelCheckIn,
        HotelCheckOut,

        // Packing notifications
        PackingMilestone50,
        PackingMilestone75,
        PackingComplete,

        // Trip notifications
        TripApproaching,
        DailySpendingSummary,
        WeatherAlert
    }

    /// <summary>
    /// Travel notification preferences per user (optionally per trip)
    /// </summary>
    [Table("travel_notification_preferences")]
    public class TravelNotificationPreferences
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Optional trip ID for trip-specific preferences.
        /// Null means global defaults for the user.
        /// </summary>
        [Column("trip_id")]
        public Guid? TripId { get; set; }

        // Document notifications
        [Column("document_expiry_enabled")]
        public bool DocumentExpiryEnabled { get; set; } = true;

        /// <summary>
        /// Comma-separated list of days before expiry to notify (e.g., "30,14,7,1")
        /// </summary>
        [Column("document_expiry_days")]
        [MaxLength(50)]
        public string DocumentExpiryDays { get; set; } = "30,14,7,1";

        // Budget notifications
        [Column("budget_alerts_enabled")]
        public bool BudgetAlertsEnabled { get; set; } = true;

        [Column("budget_threshold_75_enabled")]
        public bool BudgetThreshold75Enabled { get; set; } = true;

        [Column("budget_threshold_90_enabled")]
        public bool BudgetThreshold90Enabled { get; set; } = true;

        [Column("budget_exceeded_enabled")]
        public bool BudgetExceededEnabled { get; set; } = true;

        // Itinerary notifications
        [Column("itinerary_reminders_enabled")]
        public bool ItineraryRemindersEnabled { get; set; } = true;

        /// <summary>
        /// Comma-separated list of hours before event to notify (e.g., "24,6,1")
        /// </summary>
        [Column("itinerary_reminder_hours")]
        [MaxLength(50)]
        public string ItineraryReminderHours { get; set; } = "24,6,1";

        // Packing notifications
        [Column("packing_progress_enabled")]
        public bool PackingProgressEnabled { get; set; } = true;

        // Trip notifications
        [Column("trip_approaching_enabled")]
        public bool TripApproachingEnabled { get; set; } = true;

        [Column("trip_approaching_days")]
        public int TripApproachingDays { get; set; } = 7;

        // Delivery channels
        [Column("email_enabled")]
        public bool EmailEnabled { get; set; } = true;

        [Column("push_enabled")]
        public bool PushEnabled { get; set; } = true;

        [Column("in_app_enabled")]
        public bool InAppEnabled { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation
        [ForeignKey("TripId")]
        public virtual Trip? Trip { get; set; }
    }

    /// <summary>
    /// Web push subscription for browser notifications
    /// </summary>
    [Table("push_subscriptions")]
    public class PushSubscription
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Push service endpoint URL
        /// </summary>
        [Column("endpoint")]
        public string Endpoint { get; set; } = string.Empty;

        /// <summary>
        /// P-256 public key for encryption
        /// </summary>
        [Column("p256dh_key")]
        public string P256dhKey { get; set; } = string.Empty;

        /// <summary>
        /// Authentication secret
        /// </summary>
        [Column("auth_key")]
        public string AuthKey { get; set; } = string.Empty;

        [Column("user_agent")]
        [MaxLength(500)]
        public string? UserAgent { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("last_used_at")]
        public DateTime? LastUsedAt { get; set; }
    }

    /// <summary>
    /// Travel notification history and delivery tracking
    /// </summary>
    [Table("travel_notifications")]
    public class TravelNotification
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("trip_id")]
        public Guid? TripId { get; set; }

        [Column("type")]
        public TravelNotificationType Type { get; set; }

        [Column("title")]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        [Column("body")]
        public string Body { get; set; } = string.Empty;

        /// <summary>
        /// Priority: critical, high, medium, low
        /// </summary>
        [Column("priority")]
        [MaxLength(20)]
        public string Priority { get; set; } = "medium";

        /// <summary>
        /// Additional JSON payload for the notification
        /// </summary>
        [Column("data_json")]
        public string? DataJson { get; set; }

        /// <summary>
        /// Reference ID for the related entity (document, event, etc.)
        /// </summary>
        [Column("reference_id")]
        public Guid? ReferenceId { get; set; }

        /// <summary>
        /// Type of referenced entity (document, itinerary_event, etc.)
        /// </summary>
        [Column("reference_type")]
        [MaxLength(50)]
        public string? ReferenceType { get; set; }

        [Column("email_sent")]
        public bool EmailSent { get; set; }

        [Column("email_sent_at")]
        public DateTime? EmailSentAt { get; set; }

        [Column("push_sent")]
        public bool PushSent { get; set; }

        [Column("push_sent_at")]
        public DateTime? PushSentAt { get; set; }

        [Column("read_at")]
        public DateTime? ReadAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        // Navigation
        [ForeignKey("TripId")]
        public virtual Trip? Trip { get; set; }
    }
}
