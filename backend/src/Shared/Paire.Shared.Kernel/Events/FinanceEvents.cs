namespace Paire.Shared.Kernel.Events;

public record TransactionCreatedEvent(
    Guid TransactionId,
    string UserId,
    string Type,
    decimal Amount,
    string? Category
) : IntegrationEvent;

public record BudgetExceededEvent(
    Guid BudgetId,
    string UserId,
    string Category,
    decimal BudgetAmount,
    decimal SpentAmount
) : IntegrationEvent;

public record LoanSettledEvent(
    Guid LoanId,
    string UserId
) : IntegrationEvent;

public record SavingsGoalReachedEvent(
    Guid GoalId,
    string UserId,
    string GoalName,
    decimal TargetAmount
) : IntegrationEvent;
