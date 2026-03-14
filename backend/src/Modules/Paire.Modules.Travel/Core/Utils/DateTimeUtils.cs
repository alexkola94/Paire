namespace Paire.Modules.Travel.Core.Utils;

public static class DateTimeUtils
{
    public static DateTime? ToUtc(DateTime? date)
    {
        if (!date.HasValue) return null;
        return date.Value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(date.Value, DateTimeKind.Utc)
            : date.Value.ToUniversalTime();
    }

    public static DateTime ToUtc(DateTime date)
    {
        return date.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(date, DateTimeKind.Utc)
            : date.ToUniversalTime();
    }
}
