using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Finance.Contracts;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Core.Services;
using Paire.Modules.Finance.Infrastructure;

namespace Paire.Modules.Finance;

public static class FinanceModule
{
    public static IServiceCollection AddFinanceModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<FinanceDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<ITransactionsService, TransactionsService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IBudgetsAppService, BudgetsAppService>();
        services.AddScoped<ILoansService, LoansService>();
        services.AddScoped<ILoanPaymentsService, LoanPaymentsService>();
        services.AddScoped<ISavingsGoalsService, SavingsGoalsService>();
        services.AddScoped<IRecurringBillsService, RecurringBillsService>();
        services.AddScoped<IImportsService, ImportsService>();
        services.AddScoped<IBankStatementImportService, BankStatementImportService>();
        services.AddScoped<IReminderDataProvider, ReminderDataService>();

        return services;
    }
}
