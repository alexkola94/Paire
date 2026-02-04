using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Proxies transport search to Kiwi Tequila (flights), Skyscanner (flights), and TripGo (buses/multimodal).
    /// API keys are held on the server; frontend calls this API instead of external providers.
    /// </summary>
    public interface ITransportBookingService
    {
        /// <summary>
        /// Returns which providers have API keys configured.
        /// </summary>
        TransportProvidersDto GetConfiguredProviders();

        /// <summary>
        /// Search flights via Kiwi or Skyscanner. Normalized results for frontend.
        /// </summary>
        Task<IReadOnlyList<TransportResultDto>> SearchFlightsAsync(FlightSearchRequestDto request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Search bus/multimodal routes via TripGo. Geocodes place names when coordinates not provided.
        /// </summary>
        Task<IReadOnlyList<TransportResultDto>> SearchRoutesAsync(RouteSearchRequestDto request, CancellationToken cancellationToken = default);
    }
}
