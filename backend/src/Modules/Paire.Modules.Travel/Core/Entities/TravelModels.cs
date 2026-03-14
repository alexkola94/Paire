using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Travel.Core.Entities;

[Table("trips")]
public class Trip
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string? UserId { get; set; }
    [Column("name")] [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [Column("destination")] [MaxLength(255)] public string Destination { get; set; } = string.Empty;
    [Column("country")] [MaxLength(100)] public string? Country { get; set; }
    [Column("latitude")] public double? Latitude { get; set; }
    [Column("longitude")] public double? Longitude { get; set; }
    [Column("start_date")] public DateTime? StartDate { get; set; }
    [Column("end_date")] public DateTime? EndDate { get; set; }
    [Column("budget")] public decimal Budget { get; set; }
    [Column("budget_currency")] [MaxLength(10)] public string BudgetCurrency { get; set; } = "EUR";
    [Column("status")] [MaxLength(50)] public string Status { get; set; } = "planning";
    [Column("trip_type")] [MaxLength(50)] public string TripType { get; set; } = "single";
    [Column("cover_image")] public string? CoverImage { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ItineraryEvent> ItineraryEvents { get; set; } = new List<ItineraryEvent>();
    public virtual ICollection<PackingItem> PackingItems { get; set; } = new List<PackingItem>();
    public virtual ICollection<TravelDocument> Documents { get; set; } = new List<TravelDocument>();
    public virtual ICollection<TravelExpense> Expenses { get; set; } = new List<TravelExpense>();
    public virtual ICollection<TravelNote> TravelNotes { get; set; } = new List<TravelNote>();
    public virtual ICollection<TripCity> Cities { get; set; } = new List<TripCity>();
}

[Table("trip_cities")]
public class TripCity
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("name")] [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [Column("country")] [MaxLength(100)] public string? Country { get; set; }
    [Column("latitude")] public double? Latitude { get; set; }
    [Column("longitude")] public double? Longitude { get; set; }
    [Column("transport_mode")] [MaxLength(50)] public string? TransportMode { get; set; }
    [Column("order_index")] public int OrderIndex { get; set; }
    [Column("start_date")] public DateTime? StartDate { get; set; }
    [Column("end_date")] public DateTime? EndDate { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("itinerary_events")]
public class ItineraryEvent
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("type")] [MaxLength(50)] public string Type { get; set; } = "activity";
    [Column("name")] [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [Column("date")] public DateTime? Date { get; set; }
    [Column("start_time")] [MaxLength(10)] public string? StartTime { get; set; }
    [Column("end_time")] [MaxLength(10)] public string? EndTime { get; set; }
    [Column("location")] [MaxLength(255)] public string? Location { get; set; }
    [Column("address")] public string? Address { get; set; }
    [Column("latitude")] public double? Latitude { get; set; }
    [Column("longitude")] public double? Longitude { get; set; }
    [Column("confirmation_number")] [MaxLength(100)] public string? ConfirmationNumber { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("flight_number")] [MaxLength(20)] public string? FlightNumber { get; set; }
    [Column("airline")] [MaxLength(100)] public string? Airline { get; set; }
    [Column("departure_airport")] [MaxLength(10)] public string? DepartureAirport { get; set; }
    [Column("arrival_airport")] [MaxLength(10)] public string? ArrivalAirport { get; set; }
    [Column("check_in_time")] [MaxLength(10)] public string? CheckInTime { get; set; }
    [Column("check_out_time")] [MaxLength(10)] public string? CheckOutTime { get; set; }
    [Column("room_type")] [MaxLength(100)] public string? RoomType { get; set; }
    [Column("status")] [MaxLength(50)] public string Status { get; set; } = "confirmed";
    [Column("reminder_minutes")] public int? ReminderMinutes { get; set; }
    [Column("attachment_url")] public string? AttachmentUrl { get; set; }
    [Column("attachment_name")] [MaxLength(255)] public string? AttachmentName { get; set; }
    [Column("attachment_type")] [MaxLength(100)] public string? AttachmentType { get; set; }
    [Column("attachment_size")] public long? AttachmentSize { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("packing_items")]
public class PackingItem
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("category")] [MaxLength(50)] public string Category { get; set; } = "other";
    [Column("name")] [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [Column("quantity")] public int Quantity { get; set; } = 1;
    [Column("is_checked")] public bool IsChecked { get; set; }
    [Column("is_essential")] public bool IsEssential { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("travel_documents")]
public class TravelDocument
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("type")] [MaxLength(50)] public string Type { get; set; } = "other";
    [Column("name")] [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [Column("document_number")] [MaxLength(100)] public string? DocumentNumber { get; set; }
    [Column("expiry_date")] public DateTime? ExpiryDate { get; set; }
    [Column("issue_date")] public DateTime? IssueDate { get; set; }
    [Column("issuing_country")] [MaxLength(100)] public string? IssuingCountry { get; set; }
    [Column("file_url")] public string? FileUrl { get; set; }
    [Column("file_thumbnail")] public string? FileThumbnail { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("travel_expenses")]
public class TravelExpense
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("category")] [MaxLength(50)] public string Category { get; set; } = "other";
    [Column("amount")] public decimal Amount { get; set; }
    [Column("currency")] [MaxLength(10)] public string Currency { get; set; } = "EUR";
    [Column("amount_in_base_currency")] public decimal AmountInBaseCurrency { get; set; }
    [Column("exchange_rate")] public decimal ExchangeRate { get; set; } = 1;
    [Column("description")] [MaxLength(500)] public string? Description { get; set; }
    [Column("date")] public DateTime Date { get; set; }
    [Column("payment_method")] [MaxLength(50)] public string? PaymentMethod { get; set; }
    [Column("receipt_url")] public string? ReceiptUrl { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("trip_layout_preferences")]
public class TripLayoutPreferences
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("layout_config")] public string LayoutConfig { get; set; } = "{}";
    [Column("preset")] [MaxLength(50)] public string? Preset { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("saved_places")]
public class SavedPlace
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("user_id")] public string? UserId { get; set; }
    [Column("poi_id")] [MaxLength(255)] public string? PoiId { get; set; }
    [Column("name")] [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [Column("category")] [MaxLength(50)] public string Category { get; set; } = "other";
    [Column("latitude")] public double? Latitude { get; set; }
    [Column("longitude")] public double? Longitude { get; set; }
    [Column("address")] public string? Address { get; set; }
    [Column("phone")] [MaxLength(50)] public string? Phone { get; set; }
    [Column("website")] public string? Website { get; set; }
    [Column("opening_hours")] public string? OpeningHours { get; set; }
    [Column("rating")] public double? Rating { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("source")] [MaxLength(50)] public string Source { get; set; } = "overpass";
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}

[Table("travel_notes")]
public class TravelNote
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("trip_id")] public Guid TripId { get; set; }
    [Column("title")] [MaxLength(255)] public string Title { get; set; } = string.Empty;
    [Column("body")] public string? Body { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    [ForeignKey("TripId")] public virtual Trip? Trip { get; set; }
}
