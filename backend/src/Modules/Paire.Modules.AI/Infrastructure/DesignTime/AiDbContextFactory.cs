using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Paire.Modules.AI.Infrastructure.DesignTime;

/// <summary>
/// Used by EF Core tools at design time (e.g. dotnet ef migrations add).
/// </summary>
public class AiDbContextFactory : IDesignTimeDbContextFactory<AiDbContext>
{
    public AiDbContext CreateDbContext(string[] args)
    {
        // Find directory containing appsettings.json (Paire.Api project)
        var current = Directory.GetCurrentDirectory();
        var dir = current;
        for (var i = 0; i < 6 && dir != null; i++)
        {
            if (File.Exists(Path.Combine(dir, "appsettings.json")))
                break;
            dir = Directory.GetParent(dir)?.FullName;
        }
        var basePath = dir ?? current;
        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var conn = config.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=paire;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<AiDbContext>()
            .UseNpgsql(conn)
            .Options;

        return new AiDbContext(options);
    }
}
