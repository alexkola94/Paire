using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace YouAndMeExpensesAPI.Hubs
{
    [Authorize(Policy = "AdminOnly")]
    public class MonitoringHub : Hub
    {
        // Clients connect to this hub to receive "ReceiveMetrics" events
        // We can add methods here if clients need to send data back, 
        // but for monitoring it's mostly server-to-client broadcasting.
        
        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
