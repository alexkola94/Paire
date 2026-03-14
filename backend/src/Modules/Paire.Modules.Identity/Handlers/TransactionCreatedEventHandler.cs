using MediatR;
using Paire.Modules.Identity.Core.Interfaces;
using Paire.Shared.Kernel.Events;

namespace Paire.Modules.Identity.Handlers;

public class TransactionCreatedEventHandler : INotificationHandler<TransactionCreatedEvent>
{
    private readonly IStreakService _streakService;
    private readonly ILogger<TransactionCreatedEventHandler> _logger;

    public TransactionCreatedEventHandler(IStreakService streakService, ILogger<TransactionCreatedEventHandler> logger)
    {
        _streakService = streakService;
        _logger = logger;
    }

    public async Task Handle(TransactionCreatedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            await _streakService.RecordActivityAsync(notification.UserId, "expense_logging");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording streak for transaction {TransactionId}", notification.TransactionId);
        }
    }
}
