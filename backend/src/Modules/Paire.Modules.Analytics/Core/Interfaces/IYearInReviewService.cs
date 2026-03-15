namespace Paire.Modules.Analytics.Core.Interfaces;

public interface IYearInReviewService
{
    /// <summary>
    /// Get or generate year-in-review data for the given user and year.
    /// Returns null if no data is available for the year.
    /// </summary>
    Task<object?> GetYearReviewAsync(string userId, int year);
}
