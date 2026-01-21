using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// Strongly-typed model for the TuGo TravelSafe country advisory response.
    /// This mirrors the JSON payload returned by the external API so that
    /// we can safely deserialize and map it into our internal DTOs.
    /// </summary>
    public class TuGoTravelAdvisoryResponse
    {
        [JsonPropertyName("advisories")]
        public TuGoAdvisories? Advisories { get; set; }

        [JsonPropertyName("advisoryState")]
        public int AdvisoryState { get; set; }

        [JsonPropertyName("advisoryText")]
        public string? AdvisoryText { get; set; }

        [JsonPropertyName("climate")]
        public TuGoClimate? Climate { get; set; }

        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("dateCreated")]
        public string? DateCreated { get; set; }

        [JsonPropertyName("entryExitRequirement")]
        public TuGoEntryExitRequirement? EntryExitRequirement { get; set; }

        [JsonPropertyName("hasAdvisoryWarning")]
        public bool HasAdvisoryWarning { get; set; }

        [JsonPropertyName("hasRegionalAdvisory")]
        public bool HasRegionalAdvisory { get; set; }

        [JsonPropertyName("health")]
        public TuGoHealth? Health { get; set; }

        [JsonPropertyName("language")]
        public TuGoLanguage? Language { get; set; }

        [JsonPropertyName("lawAndCulture")]
        public TuGoLawAndCulture? LawAndCulture { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("offices")]
        public List<TuGoOffice>? Offices { get; set; }

        [JsonPropertyName("officesClosingText")]
        public string? OfficesClosingText { get; set; }

        [JsonPropertyName("officesOpeningText")]
        public string? OfficesOpeningText { get; set; }

        [JsonPropertyName("officesReferToText")]
        public string? OfficesReferToText { get; set; }

        [JsonPropertyName("publishedDate")]
        public string? PublishedDate { get; set; }

        [JsonPropertyName("recentUpdates")]
        public string? RecentUpdates { get; set; }

        [JsonPropertyName("recentUpdatesType")]
        public string? RecentUpdatesType { get; set; }

        [JsonPropertyName("safety")]
        public TuGoSafety? Safety { get; set; }
    }

    public class TuGoAdvisories
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("regionalAdvisories")]
        public List<TuGoRegionalAdvisory> RegionalAdvisories { get; set; } = new();
    }

    public class TuGoRegionalAdvisory
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoClimate
    {
        [JsonPropertyName("climateInfo")]
        public List<TuGoClimateInfo> ClimateInfo { get; set; } = new();

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoClimateInfo
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoEntryExitRequirement
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("requirementInfo")]
        public List<TuGoRequirementInfo> RequirementInfo { get; set; } = new();
    }

    public class TuGoRequirementInfo
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoHealth
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        /// <summary>
        /// A map like "COVID-19" -> [ { category, description }, ... ].
        /// </summary>
        [JsonPropertyName("diseasesAndVaccinesInfo")]
        public Dictionary<string, List<TuGoHealthDiseaseInfo>> DiseasesAndVaccinesInfo { get; set; } =
            new(StringComparer.OrdinalIgnoreCase);

        [JsonPropertyName("healthInfo")]
        public List<TuGoHealthInfo> HealthInfo { get; set; } = new();
    }

    public class TuGoHealthDiseaseInfo
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoHealthInfo
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoLanguage
    {
        [JsonPropertyName("enumType")]
        public string? EnumType { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    public class TuGoLawAndCulture
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("lawAndCultureInfo")]
        public List<TuGoLawAndCultureInfo> LawAndCultureInfo { get; set; } = new();
    }

    public class TuGoLawAndCultureInfo
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class TuGoOffice
    {
        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("country")]
        public string? Country { get; set; }

        [JsonPropertyName("district")]
        public string? District { get; set; }

        [JsonPropertyName("email1")]
        public string? Email1 { get; set; }

        [JsonPropertyName("email2")]
        public string? Email2 { get; set; }

        [JsonPropertyName("email3")]
        public string? Email3 { get; set; }

        [JsonPropertyName("emergencyTollFree")]
        public string? EmergencyTollFree { get; set; }

        [JsonPropertyName("facebook")]
        public string? Facebook { get; set; }

        [JsonPropertyName("facebookLabel")]
        public string? FacebookLabel { get; set; }

        [JsonPropertyName("fax")]
        public string? Fax { get; set; }

        [JsonPropertyName("hasPassportServices")]
        public bool HasPassportServices { get; set; }

        [JsonPropertyName("isHonoraryConsul")]
        public bool IsHonoraryConsul { get; set; }

        [JsonPropertyName("isPartner")]
        public bool IsPartner { get; set; }

        [JsonPropertyName("isPrimary")]
        public bool IsPrimary { get; set; }

        [JsonPropertyName("latitude")]
        public string? Latitude { get; set; }

        [JsonPropertyName("longitude")]
        public string? Longitude { get; set; }

        [JsonPropertyName("note1Text")]
        public string? Note1Text { get; set; }

        [JsonPropertyName("note1Title")]
        public string? Note1Title { get; set; }

        [JsonPropertyName("note2Text")]
        public string? Note2Text { get; set; }

        [JsonPropertyName("note2Title")]
        public string? Note2Title { get; set; }

        [JsonPropertyName("note3Text")]
        public string? Note3Text { get; set; }

        [JsonPropertyName("note3Title")]
        public string? Note3Title { get; set; }

        [JsonPropertyName("officeId")]
        public string? OfficeId { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("postalAddress")]
        public string? PostalAddress { get; set; }

        [JsonPropertyName("twitter")]
        public string? Twitter { get; set; }

        [JsonPropertyName("twitterLabel")]
        public string? TwitterLabel { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("website")]
        public string? Website { get; set; }
    }

    public class TuGoSafety
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("safetyInfo")]
        public List<TuGoSafetyInfo> SafetyInfo { get; set; } = new();
    }

    public class TuGoSafetyInfo
    {
        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }
}

