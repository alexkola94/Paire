using Microsoft.AspNetCore.SignalR;

namespace Paire.Modules.Admin.Api.Hubs;

public class MonitoringHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
