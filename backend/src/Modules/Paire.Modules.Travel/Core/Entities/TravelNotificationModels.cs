using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Travel.Core.Entities;

public enum TravelNotificationType
{
    DocumentExpiring, DocumentExpired,
    BudgetThreshold75, BudgetThreshold90, BudgetExceeded,
    ItineraryReminder1Hour, ItineraryReminder6Hours, ItineraryReminder24Hours,
    FlightStatusChange, HotelCheckIn, HotelCheckOut,
    PackingMilestone50, PackingMilestone75, PackingComplete,
    TripApproaching, DailySpendingSummary, WeatherAlert
}

[Table("travel_notification_preferences")]
public class TravelNotificationPreferences
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("trip_id")] public Guid? TripId { get; set; }
    [Column("document_expiry_enabled")] public bool DocumentExpiryEnabled { get; set; } = true;
    [Column("document_expiry_days")] [MaxLength(50)] public string DocumentExpiryDays { get; set; } = "30,14,7,1";
    [Column("budget_alerts_enabled")] public bool BudgetAlertsEnabled { get; set; } = true;
    [Column("budget_threshold_75_enabled")] public bool BudgetThreshold75Enabled { get; set; } = true;
    [Column("budget_threshold_90_enabled")] public bool BudgetThreshold90Enabled { get; set; } = true;
    [Column("budget_exceeded_enabled")] public bool BudgetExceededEnabled { get; set; } = true;
    [Column("itinerary_reminders_enabled")] public bool ItineraryRemindersEnabled { get; set; } = true;
    [Column("itinerary_reminder_hours")] [MaxLength(50)] public string ItineraryReminderHours { get; set; } = "24,6,1";
    [Column("packing_progress_enabled")] public bool PackingProgressEnabled { get; set; } = true;
    [Column("trip_approaching_enabled")] public bool TripApproachingEnabled { get; set; } = true;
    [Column("trip_approaching_days")] public int TripApproachingDays { get; set; } = 7;
    [Column("email_enabled")] public bool EmailEnabled { get; set; } = true;
    [Column("push_enabled")] public bool PushEnabled { get; set; } = true;
    [Column("in_app_enabled")] public bool InAppEnabled { get; set; } = true;
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("push_subscriptions")]
public class PushSubscription
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("endpoint")] public string Endpoint { get; set; } = string.Empty;
    [Column("p256dh_key")] public string P256dhKey { get; set; } = string.Empty;
    [Column("auth_key")] public string AuthKey { get; set; } = string.Empty;
    [Column("user_agent")] [MaxLength(500)] public string? UserAgent { get; set; }
    [Column("is_active")] public bool IsActive { get; set; } = true;
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("last_used_at")] public DateTime? LastUsedAt { get; set; }
}

[Table("travel_notifications")]
public class TravelNotification
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("trip_id")] public Guid? TripId { get; set; }
    [Column("type")] public TravelNotificationType Type { get; set; }
    [Column("title")] [MaxLength(255)] public string Title { get; set; } = string.Empty;
    [Column("body")] public string Body { get; set; } = string.Empty;
    [Column("priority")] [MaxLength(20)] public string Priority { get; set; } = "medium";
    [Column("data_json")] public string? DataJson { get; set; }
    [Column("reference_id")] public Guid? ReferenceId { get; set; }
    [Column("reference_type")] [MaxLength(50)] public string? ReferenceType { get; set; }
    [Column("email_sent")] public bool EmailSent { get; set; }
    [Column("email_sent_at")] public DateTime? EmailSentAt { get; set; }
    [Column("push_sent")] public bool PushSent { get; set; }
    [Column("push_sent_at")] public DateTime? PushSentAt { get; set; }
    [Column("read_at")] public DateTime? ReadAt { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}
