using System.ComponentModel.DataAnnotations;

namespace YouAndMeExpensesAPI.Models.Admin;

public class AdminActionRequest
{
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class MaintenanceModeRequest : AdminActionRequest
{
    public bool Enabled { get; set; }
}

public class BroadcastRequest : AdminActionRequest
{
    [Required]
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "Info"; // Info, Warning, Error
    public int DurationSeconds { get; set; } = 300;
}
