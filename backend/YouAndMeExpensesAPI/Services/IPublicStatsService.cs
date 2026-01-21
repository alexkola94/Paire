namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service contract for public landing-page statistics.
    /// </summary>
    public interface IPublicStatsService
    {
        Task<PublicStatsDto> GetPublicStatsAsync();
    }

    /// <summary>
    /// DTO for public statistics response
    /// </summary>
    public class PublicStatsDto
    {
        public long TotalUsers { get; set; }
        public long TotalTransactions { get; set; }
        public decimal TotalMoneySaved { get; set; }
        public string FormattedUsers { get; set; } = string.Empty;
        public string FormattedTransactions { get; set; } = string.Empty;
        public string FormattedMoneySaved { get; set; } = string.Empty;
    }
}

