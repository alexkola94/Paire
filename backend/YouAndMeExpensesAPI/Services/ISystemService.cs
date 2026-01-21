namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service contract for system health, info, changelog, data clearing, and diagnostics.
    /// </summary>
    public interface ISystemService
    {
        Task<object> GetHealthAsync();
        Task<object> GetInfoAsync();
        Task<object> GetChangelogAsync();
        Task<object> ClearAllDataAsync();
        Task<object> TestSmtpConnectivityAsync();
    }
}

