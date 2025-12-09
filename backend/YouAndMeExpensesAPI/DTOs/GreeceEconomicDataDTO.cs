namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// DTO for Consumer Price Index (CPI) data
    /// </summary>
    public class CPIDataDTO
    {
        public decimal? CurrentRate { get; set; }
        public decimal? PreviousRate { get; set; }
        public decimal? Change { get; set; }
        public decimal? ChangePercent { get; set; }
        public DateTime? LastUpdated { get; set; }
        public string? Source { get; set; }
        public string? Trend { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// DTO for food price item
    /// </summary>
    public class FoodPriceItemDTO
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Unit { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO for food price category
    /// </summary>
    public class FoodPriceCategoryDTO
    {
        public string Name { get; set; } = string.Empty;
        public decimal AveragePrice { get; set; }
        public decimal? Change { get; set; }
        public decimal? ChangePercent { get; set; }
        public List<FoodPriceItemDTO> Items { get; set; } = new();
    }

    /// <summary>
    /// DTO for food prices data
    /// </summary>
    public class FoodPricesDataDTO
    {
        public List<FoodPriceCategoryDTO> Categories { get; set; } = new();
        public DateTime? LastUpdated { get; set; }
        public string? Source { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// DTO for economic indicator
    /// </summary>
    public class EconomicIndicatorDTO
    {
        public decimal? Value { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal? Change { get; set; }
        public decimal? ChangePercent { get; set; }
        public string Period { get; set; } = string.Empty;
        public string? Error { get; set; }
    }

    /// <summary>
    /// DTO for economic indicators data
    /// </summary>
    public class EconomicIndicatorsDTO
    {
        public EconomicIndicatorDTO? GDP { get; set; }
        public EconomicIndicatorDTO? Unemployment { get; set; }
        public EconomicIndicatorDTO? Inflation { get; set; }
        public EconomicIndicatorDTO? HouseholdIncome { get; set; }
        public DateTime? LastUpdated { get; set; }
        public string? Source { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// DTO for news article
    /// </summary>
    public class NewsArticleDTO
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Source { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? Author { get; set; }
    }

    /// <summary>
    /// DTO for news data
    /// </summary>
    public class NewsDataDTO
    {
        public List<NewsArticleDTO> Articles { get; set; } = new();
        public DateTime? LastUpdated { get; set; }
        public string? Source { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// DTO for all economic data combined
    /// </summary>
    public class GreeceEconomicDataDTO
    {
        public CPIDataDTO? CPI { get; set; }
        public FoodPricesDataDTO? FoodPrices { get; set; }
        public EconomicIndicatorsDTO? Indicators { get; set; }
        public NewsDataDTO? News { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}

