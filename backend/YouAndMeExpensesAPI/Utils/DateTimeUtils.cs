namespace YouAndMeExpensesAPI.Utils
{
    /// <summary>
    /// Centralized helpers for working with DateTime values in UTC.
    /// Keeps DateTime handling consistent across controllers and services.
    /// </summary>
    public static class DateTimeUtils
    {
        /// <summary>
        /// Ensure nullable DateTime is in UTC format.
        /// </summary>
        public static DateTime? ToUtc(DateTime? date)
        {
            if (!date.HasValue)
            {
                return null;
            }

            return date.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(date.Value, DateTimeKind.Utc)
                : date.Value.ToUniversalTime();
        }

        /// <summary>
        /// Ensure non-nullable DateTime is in UTC format.
        /// </summary>
        public static DateTime ToUtc(DateTime date)
        {
            return date.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(date, DateTimeKind.Utc)
                : date.ToUniversalTime();
        }
    }
}

