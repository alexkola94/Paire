namespace Paire.Shared.Kernel.Events;

public abstract record IntegrationEvent : IIntegrationEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}
