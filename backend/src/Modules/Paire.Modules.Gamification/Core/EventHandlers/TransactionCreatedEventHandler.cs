using MediatR;
using Microsoft.Extensions.Logging;
using Paire.Modules.Gamification.Core.Interfaces;
using Paire.Shared.Kernel.Events;

namespace Paire.Modules.Gamification.Core.EventHandlers;

public class TransactionCreatedEventHandler : INotificationHandler<TransactionCreatedEvent>
{
    private readonly IPaireHomeService _paireHomeService;
    private readonly IChallengeService _challengeService;
    private readonly ILogger<TransactionCreatedEventHandler> _logger;

    public TransactionCreatedEventHandler(
        IPaireHomeService paireHomeService,
        IChallengeService challengeService,
        ILogger<TransactionCreatedEventHandler> logger)
    {
        _paireHomeService = paireHomeService;
        _challengeService = challengeService;
        _logger = logger;
    }

    public async Task Handle(TransactionCreatedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            if (notification.Type.Equals("expense", StringComparison.OrdinalIgnoreCase))
            {
                await _paireHomeService.ProcessExpenseAsync(notification.UserId, notification.Category ?? "other", notification.Amount);
            }
            await _challengeService.ProcessTransactionForChallengesAsync(notification.UserId, notification.Amount, notification.Category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling TransactionCreatedEvent for user {UserId}", notification.UserId);
        }
    }
}
