namespace YouAndMeExpensesAPI.Services
{
    public interface IYearInReviewService
    {
        Task<object> GetYearReviewAsync(string userId, int year);
        Task<object> RegenerateYearReviewAsync(string userId, int year);
    }
}
