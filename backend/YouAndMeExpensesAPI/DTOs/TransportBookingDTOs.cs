namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// Request body for flight search (Kiwi or Skyscanner).
    /// Origin/destination can be city names or IATA codes.
    /// </summary>
    public class FlightSearchRequestDto
    {
        /// <summary>Origin: city name or 3-letter IATA code (e.g. Athens, ATH).</summary>
        public string FlyFrom { get; set; } = string.Empty;
        /// <summary>Destination: city name or IATA code.</summary>
        public string FlyTo { get; set; } = string.Empty;
        /// <summary>Outbound date YYYY-MM-DD.</summary>
        public string DateFrom { get; set; } = string.Empty;
        /// <summary>Outbound end date for flexible search (optional).</summary>
        public string? DateTo { get; set; }
        /// <summary>Return date YYYY-MM-DD for round-trip (optional).</summary>
        public string? ReturnFrom { get; set; }
        /// <summary>Return end date (optional).</summary>
        public string? ReturnTo { get; set; }
        /// <summary>Number of adults (default 1).</summary>
        public int Adults { get; set; } = 1;
        /// <summary>Provider: "kiwi" or "skyscanner".</summary>
        public string Provider { get; set; } = "kiwi";
    }

    /// <summary>
    /// Request body for bus/multimodal route search (TripGo).
    /// Either use place names (FromPlace/ToPlace) or coordinates.
    /// </summary>
    public class RouteSearchRequestDto
    {
        /// <summary>Origin place name (e.g. Athens). Geocoded when coordinates not provided.</summary>
        public string? FromPlace { get; set; }
        /// <summary>Destination place name (e.g. Thessaloniki).</summary>
        public string? ToPlace { get; set; }
        /// <summary>Origin latitude (optional if FromPlace is set).</summary>
        public double? FromLat { get; set; }
        /// <summary>Origin longitude (optional).</summary>
        public double? FromLon { get; set; }
        /// <summary>Destination latitude (optional).</summary>
        public double? ToLat { get; set; }
        /// <summary>Destination longitude (optional).</summary>
        public double? ToLon { get; set; }
        /// <summary>Depart after: Unix timestamp in seconds (optional, default now).</summary>
        public long? DepartAfter { get; set; }
    }

    /// <summary>
    /// Single transport result (flight or route) returned to frontend.
    /// Normalized shape for both Kiwi/Skyscanner and TripGo.
    /// </summary>
    public class TransportResultDto
    {
        public string Id { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = "EUR";
        /// <summary>Duration in minutes.</summary>
        public int DurationMinutes { get; set; }
        public object? Duration { get; set; }
        public object? Segments { get; set; }
        /// <summary>Deep link or booking URL to open in browser.</summary>
        public string? BookUrl { get; set; }
        public string? Airline { get; set; }
        /// <summary>Provider identifier: kiwi, skyscanner, tripgo.</summary>
        public string Provider { get; set; } = string.Empty;
        /// <summary>Optional mode description for bus/transit (e.g. "pt_pub, wa_wal").</summary>
        public string? Modes { get; set; }
    }

    /// <summary>
    /// Which transport APIs are configured (so frontend can show/hide "Search prices").
    /// </summary>
    public class TransportProvidersDto
    {
        public bool Kiwi { get; set; }
        public bool Skyscanner { get; set; }
        public bool TripGo { get; set; }
    }
}
