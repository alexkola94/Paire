using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace YouAndMeExpensesAPI.Hubs
{
    /// <summary>
    /// SignalR hub for real-time partner activity notifications.
    /// Partners in the same partnership receive notifications when their partner:
    /// - Adds a transaction (expense/income)
    /// - Creates/updates a budget
    /// - Creates/updates a savings goal
    /// </summary>
    [Authorize]
    public class PartnerHub : Hub
    {
        private readonly ILogger<PartnerHub> _logger;
        private static readonly Dictionary<string, string> _userConnections = new();

        public PartnerHub(ILogger<PartnerHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                _userConnections[userId] = Context.ConnectionId;
                _logger.LogInformation("User {UserId} connected to PartnerHub", userId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                _userConnections.Remove(userId);
                _logger.LogInformation("User {UserId} disconnected from PartnerHub", userId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Get connection ID for a user (used by services to send targeted notifications).
        /// </summary>
        public static string? GetConnectionId(string userId)
        {
            return _userConnections.TryGetValue(userId, out var connectionId) ? connectionId : null;
        }

        /// <summary>
        /// Check if a user is currently connected.
        /// </summary>
        public static bool IsUserConnected(string userId)
        {
            return _userConnections.ContainsKey(userId);
        }
    }
}
