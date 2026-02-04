using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Proxies transport search to Kiwi (flights), Skyscanner (flights), and TripGo (buses).
    /// Frontend calls this API instead of external providers; API keys are held on the server.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/transport")]
    public class TransportBookingController : BaseApiController
    {
        private readonly ITransportBookingService _transportBookingService;
        private readonly ILogger<TransportBookingController> _logger;

        public TransportBookingController(
            ITransportBookingService transportBookingService,
            ILogger<TransportBookingController> logger)
        {
            _transportBookingService = transportBookingService;
            _logger = logger;
        }

        /// <summary>
        /// Returns which transport providers have API keys configured.
        /// Frontend uses this to show/hide "Search prices" per provider.
        /// </summary>
        [HttpGet("providers")]
        public IActionResult GetProviders()
        {
            var providers = _transportBookingService.GetConfiguredProviders();
            return Ok(providers);
        }

        /// <summary>
        /// Search flights via Kiwi Tequila or Skyscanner.
        /// Body: flyFrom, flyTo, dateFrom, dateTo (optional), returnFrom, returnTo (optional), adults, provider ("kiwi" | "skyscanner").
        /// </summary>
        [HttpPost("search-flights")]
        public async Task<IActionResult> SearchFlights([FromBody] FlightSearchRequestDto request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.FlyFrom) || string.IsNullOrWhiteSpace(request.FlyTo) || string.IsNullOrWhiteSpace(request.DateFrom))
            {
                return BadRequest(new { error = "flyFrom, flyTo and dateFrom are required" });
            }

            try
            {
                var results = await _transportBookingService.SearchFlightsAsync(request, cancellationToken).ConfigureAwait(false);
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Transport flight search failed for {From} -> {To}", request.FlyFrom, request.FlyTo);
                return StatusCode(502, new { error = "Flight search failed", message = ex.Message });
            }
        }

        /// <summary>
        /// Search bus/multimodal routes via TripGo.
        /// Body: fromPlace, toPlace (geocoded on server), or fromLat, fromLon, toLat, toLon; optional departAfter (Unix seconds).
        /// </summary>
        [HttpPost("search-routes")]
        public async Task<IActionResult> SearchRoutes([FromBody] RouteSearchRequestDto request, CancellationToken cancellationToken)
        {
            bool hasPlaces = !string.IsNullOrWhiteSpace(request.FromPlace) && !string.IsNullOrWhiteSpace(request.ToPlace);
            bool hasCoords = request.FromLat.HasValue && request.FromLon.HasValue && request.ToLat.HasValue && request.ToLon.HasValue;
            if (!hasPlaces && !hasCoords)
            {
                return BadRequest(new { error = "Either (fromPlace and toPlace) or (fromLat, fromLon, toLat, toLon) are required" });
            }

            try
            {
                var results = await _transportBookingService.SearchRoutesAsync(request, cancellationToken).ConfigureAwait(false);
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Transport route search failed for {From} -> {To}", request.FromPlace ?? "coords", request.ToPlace ?? "coords");
                return StatusCode(502, new { error = "Route search failed", message = ex.Message });
            }
        }
    }
}
