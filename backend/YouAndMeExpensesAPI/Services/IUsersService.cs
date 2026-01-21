using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for user lookup operations (e.g., find by email).
    /// </summary>
    public interface IUsersService
    {
        /// <summary>
        /// Find a user profile by email (case-insensitive) and return a public projection
        /// matching the existing UsersController response shape.
        /// </summary>
        Task<object?> FindUserByEmailAsync(string email);
    }
}

