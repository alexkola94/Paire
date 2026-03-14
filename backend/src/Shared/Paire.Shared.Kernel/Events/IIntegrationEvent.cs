using MediatR;

namespace Paire.Shared.Kernel.Events;

/// <summary>
/// Marker interface for integration events that cross module boundaries.
/// Implemented as MediatR INotification so multiple handlers can react.
/// </summary>
public interface IIntegrationEvent : INotification
{
    DateTime OccurredOn { get; }
}
