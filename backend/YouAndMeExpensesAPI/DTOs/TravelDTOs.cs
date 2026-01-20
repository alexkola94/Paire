using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// DTO returned for location search results from the geocoding service.
    /// Matches the anonymous shape previously returned by TravelController.
    /// </summary>
    public class TravelLocationResult
    {
        public string? Name { get; set; }
        public string? FullName { get; set; }
        public string? Country { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    /// <summary>
    /// DTO returned for country travel advisory / risk score.
    /// Mirrors the anonymous object previously returned by TravelController.
    /// </summary>
    public class TravelAdvisoryResult
    {
        public string CountryCode { get; set; } = string.Empty;
        public string CountryName { get; set; } = string.Empty;
        public double Score { get; set; }
        public string Level { get; set; } = "unknown";
        public string Message { get; set; } = string.Empty;
        public string Updated { get; set; } = string.Empty;
        public int SourcesActive { get; set; }
        public bool HasData { get; set; }
        public string? ErrorMessage { get; set; }
        public int? StatusCode { get; set; }
    }

    /// <summary>
    /// DTO returned when uploading a travel attachment.
    /// Matches the anonymous object previously returned by TravelController.
    /// </summary>
    public class TravelAttachmentDto
    {
        public string Url { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public long Size { get; set; }
        public string Path { get; set; } = string.Empty;
    }
}

