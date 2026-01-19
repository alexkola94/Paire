using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Trip model for travel planning
    /// Supports single active trip with offline-first sync
    /// </summary>
    [Table("trips")]
    public class Trip
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string? UserId { get; set; }

        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("destination")]
        [MaxLength(255)]
        public string Destination { get; set; } = string.Empty;

        [Column("country")]
        [MaxLength(100)]
        public string? Country { get; set; }

        [Column("latitude")]
        public double? Latitude { get; set; }

        [Column("longitude")]
        public double? Longitude { get; set; }

        [Column("start_date")]
        public DateTime? StartDate { get; set; }

        [Column("end_date")]
        public DateTime? EndDate { get; set; }

        [Column("budget")]
        public decimal Budget { get; set; }

        [Column("budget_currency")]
        [MaxLength(10)]
        public string BudgetCurrency { get; set; } = "EUR";

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "planning"; // planning, active, completed

        [Column("cover_image")]
        public string? CoverImage { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<ItineraryEvent> ItineraryEvents { get; set; } = new List<ItineraryEvent>();
        public virtual ICollection<PackingItem> PackingItems { get; set; } = new List<PackingItem>();
        public virtual ICollection<TravelDocument> Documents { get; set; } = new List<TravelDocument>();
        public virtual ICollection<TravelExpense> Expenses { get; set; } = new List<TravelExpense>();
    }

    /// <summary>
    /// Itinerary event for flights, hotels, activities
    /// </summary>
    [Table("itinerary_events")]
    public class ItineraryEvent
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("trip_id")]
        public Guid TripId { get; set; }

        [Column("type")]
        [MaxLength(50)]
        public string Type { get; set; } = "activity"; // flight, hotel, activity, transit, restaurant, other

        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("date")]
        public DateTime? Date { get; set; }

        [Column("start_time")]
        [MaxLength(10)]
        public string? StartTime { get; set; }

        [Column("end_time")]
        [MaxLength(10)]
        public string? EndTime { get; set; }

        [Column("location")]
        [MaxLength(255)]
        public string? Location { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("latitude")]
        public double? Latitude { get; set; }

        [Column("longitude")]
        public double? Longitude { get; set; }

        [Column("confirmation_number")]
        [MaxLength(100)]
        public string? ConfirmationNumber { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        // Flight-specific fields
        [Column("flight_number")]
        [MaxLength(20)]
        public string? FlightNumber { get; set; }

        [Column("airline")]
        [MaxLength(100)]
        public string? Airline { get; set; }

        [Column("departure_airport")]
        [MaxLength(10)]
        public string? DepartureAirport { get; set; }

        [Column("arrival_airport")]
        [MaxLength(10)]
        public string? ArrivalAirport { get; set; }

        // Hotel-specific fields
        [Column("check_in_time")]
        [MaxLength(10)]
        public string? CheckInTime { get; set; }

        [Column("check_out_time")]
        [MaxLength(10)]
        public string? CheckOutTime { get; set; }

        [Column("room_type")]
        [MaxLength(100)]
        public string? RoomType { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "confirmed"; // confirmed, pending, cancelled

        [Column("reminder_minutes")]
        public int? ReminderMinutes { get; set; }

        // Optional attachment metadata for storing related documents (tickets, PDFs, etc.)
        // Kept generic and lightweight to work well with mobile and offline flows.
        [Column("attachment_url")]
        public string? AttachmentUrl { get; set; }

        [Column("attachment_name")]
        [MaxLength(255)]
        public string? AttachmentName { get; set; }

        [Column("attachment_type")]
        [MaxLength(100)]
        public string? AttachmentType { get; set; }

        [Column("attachment_size")]
        public long? AttachmentSize { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation
        [ForeignKey("TripId")]
        public virtual Trip? Trip { get; set; }
    }

    /// <summary>
    /// Packing list item
    /// </summary>
    [Table("packing_items")]
    public class PackingItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("trip_id")]
        public Guid TripId { get; set; }

        [Column("category")]
        [MaxLength(50)]
        public string Category { get; set; } = "other"; // clothing, toiletries, electronics, documents, medications, other

        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("quantity")]
        public int Quantity { get; set; } = 1;

        [Column("is_checked")]
        public bool IsChecked { get; set; }

        [Column("is_essential")]
        public bool IsEssential { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation
        [ForeignKey("TripId")]
        public virtual Trip? Trip { get; set; }
    }

    /// <summary>
    /// Travel document (passport, visa, booking confirmation)
    /// </summary>
    [Table("travel_documents")]
    public class TravelDocument
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("trip_id")]
        public Guid TripId { get; set; }

        [Column("type")]
        [MaxLength(50)]
        public string Type { get; set; } = "other"; // passport, visa, booking, insurance, ticket, other

        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("document_number")]
        [MaxLength(100)]
        public string? DocumentNumber { get; set; }

        [Column("expiry_date")]
        public DateTime? ExpiryDate { get; set; }

        [Column("issue_date")]
        public DateTime? IssueDate { get; set; }

        [Column("issuing_country")]
        [MaxLength(100)]
        public string? IssuingCountry { get; set; }

        [Column("file_url")]
        public string? FileUrl { get; set; }

        [Column("file_thumbnail")]
        public string? FileThumbnail { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation
        [ForeignKey("TripId")]
        public virtual Trip? Trip { get; set; }
    }

    /// <summary>
    /// Travel expense with multi-currency support
    /// </summary>
    [Table("travel_expenses")]
    public class TravelExpense
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("trip_id")]
        public Guid TripId { get; set; }

        [Column("category")]
        [MaxLength(50)]
        public string Category { get; set; } = "other"; // accommodation, transport, food, activities, shopping, other

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("currency")]
        [MaxLength(10)]
        public string Currency { get; set; } = "EUR";

        [Column("amount_in_base_currency")]
        public decimal AmountInBaseCurrency { get; set; }

        [Column("exchange_rate")]
        public decimal ExchangeRate { get; set; } = 1;

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("payment_method")]
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        [Column("receipt_url")]
        public string? ReceiptUrl { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation
        [ForeignKey("TripId")]
        public virtual Trip? Trip { get; set; }
    }
}
