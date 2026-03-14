using System.Collections.Concurrent;

namespace Paire.Shared.Infrastructure.Logging;

public sealed class DailyFileLogger : ILogger
{
    private static readonly ConcurrentDictionary<string, object> FileLocks = new();

    private readonly string _categoryName;
    private readonly DailyFileLoggerProvider _provider;

    public DailyFileLogger(string categoryName, DailyFileLoggerProvider provider)
    {
        _categoryName = categoryName;
        _provider = provider;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => _provider.IsEnabled(logLevel);

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel)) return;
        ArgumentNullException.ThrowIfNull(formatter);

        var message = formatter(state, exception);
        if (string.IsNullOrEmpty(message) && exception == null) return;

        var utcNow = DateTime.UtcNow;
        var datePart = utcNow.ToString("yyyy-MM-dd");

        var environmentSegment = _provider.EnvironmentName ?? "Unknown";
        var directory = Path.Combine(_provider.BasePath, environmentSegment);
        Directory.CreateDirectory(directory);

        var fileName = $"paire-api-{environmentSegment.ToLowerInvariant()}-{datePart}.log";
        var fullPath = Path.Combine(directory, fileName);

        var line = $"{utcNow:O} [{logLevel}] {_categoryName} - {message}";
        if (exception != null)
        {
            line += Environment.NewLine + exception;
        }

        var fileLock = FileLocks.GetOrAdd(fullPath, _ => new object());
        lock (fileLock)
        {
            File.AppendAllText(fullPath, line + Environment.NewLine);
        }
    }
}

public sealed class DailyFileLoggerProvider : ILoggerProvider
{
    public string BasePath { get; }
    public string? EnvironmentName { get; }
    private readonly LogLevel _minimumLevel;

    public DailyFileLoggerProvider(string basePath, string? environmentName, LogLevel minimumLevel)
    {
        BasePath = basePath;
        EnvironmentName = environmentName;
        _minimumLevel = minimumLevel;
    }

    public ILogger CreateLogger(string categoryName) => new DailyFileLogger(categoryName, this);
    public bool IsEnabled(LogLevel level) => level >= _minimumLevel && level != LogLevel.None;
    public void Dispose() { }
}

public static class DailyFileLoggerExtensions
{
    public static ILoggingBuilder AddDailyFileLogger(
        this ILoggingBuilder builder,
        string basePath,
        string? environmentName,
        LogLevel minimumLevel)
    {
        builder.AddProvider(new DailyFileLoggerProvider(basePath, environmentName, minimumLevel));
        return builder;
    }
}
