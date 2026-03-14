namespace Paire.Modules.Travel.Core.DTOs;

public class TravelLocationResult
{
    public string? Name { get; set; }
    public string? FullName { get; set; }
    public string? Country { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

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
    public bool HasAdvisoryWarning { get; set; }
    public bool HasRegionalAdvisory { get; set; }
    public string? AdvisoryText { get; set; }
    public string? AdvisoryLongDescription { get; set; }
    public string? ClimateSummary { get; set; }
    public string? EntryExitSummary { get; set; }
    public string? HealthSummary { get; set; }
    public string? SafetySummary { get; set; }
    public string? RecentUpdates { get; set; }
    public List<string> ClimateHighlights { get; set; } = new();
    public List<string> EntryExitHighlights { get; set; } = new();
    public List<string> HealthHighlights { get; set; } = new();
    public List<string> SafetyHighlights { get; set; } = new();
}

public class TravelAttachmentDto
{
    public string Url { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Path { get; set; } = string.Empty;
}

/// <summary>
/// DTO for layout preferences request
/// </summary>
public class LayoutPreferencesDto
{
    public string? LayoutConfig { get; set; }
    public string? Preset { get; set; }
}
