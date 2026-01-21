using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Concrete implementation of <see cref="IUsersService"/> that encapsulates
    /// all EF Core queries for user lookup.
    /// </summary>
    public class UsersService : IUsersService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<UsersService> _logger;

        public UsersService(AppDbContext dbContext, ILogger<UsersService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<object?> FindUserByEmailAsync(string email)
        {
            try
            {
                var emailLower = email.ToLower();

                var user = await _dbContext.UserProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == emailLower);

                if (user == null)
                {
                    return null;
                }

                // Preserve the public projection that the controller previously returned.
                return new
                {
                    id = user.Id,
                    email = user.Email,
                    display_name = user.DisplayName,
                    avatar_url = user.AvatarUrl
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding user by email {Email}", email);
                throw;
            }
        }
    }
}

