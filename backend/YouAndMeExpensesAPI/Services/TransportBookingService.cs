using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Calls Kiwi Tequila, Skyscanner, and TripGo APIs; normalizes responses for the frontend.
    /// API keys are read from configuration (TransportBooking:KiwiTequila:ApiKey, etc.).
    /// </summary>
    public class TransportBookingService : ITransportBookingService
    {
        private const string KiwiBase = "https://api.tequila.kiwi.com";
        private const string SkyscannerPartnerBase = "https://partners.api.skyscanner.net/apiservices/v3/flights/live/search";
        private const string TripGoBase = "https://api.tripgo.com/v1";
        private const int SkyscannerPollIntervalMs = 2000;
        private const int SkyscannerPollTimeoutMs = 60000;

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ITravelGeocodingService _geocodingService;
        private readonly ILogger<TransportBookingService> _logger;

        public TransportBookingService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ITravelGeocodingService geocodingService,
            ILogger<TransportBookingService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _geocodingService = geocodingService;
            _logger = logger;
        }

        public TransportProvidersDto GetConfiguredProviders()
        {
            var kiwi = !string.IsNullOrWhiteSpace(_configuration["TransportBooking:KiwiTequila:ApiKey"]);
            var skyscanner = !string.IsNullOrWhiteSpace(_configuration["TransportBooking:Skyscanner:ApiKey"])
                || (!string.IsNullOrWhiteSpace(_configuration["TransportBooking:RapidApi:Key"])
                    && !string.IsNullOrWhiteSpace(_configuration["TransportBooking:RapidApi:SkyscannerHost"]));
            var tripGo = !string.IsNullOrWhiteSpace(_configuration["TransportBooking:TripGo:ApiKey"]);
            return new TransportProvidersDto { Kiwi = kiwi, Skyscanner = skyscanner, TripGo = tripGo };
        }

        public async Task<IReadOnlyList<TransportResultDto>> SearchFlightsAsync(FlightSearchRequestDto request, CancellationToken cancellationToken = default)
        {
            var provider = (request.Provider ?? "kiwi").ToLowerInvariant();
            if (provider == "skyscanner")
                return await SearchFlightsSkyscannerAsync(request, cancellationToken).ConfigureAwait(false);
            return await SearchFlightsKiwiAsync(request, cancellationToken).ConfigureAwait(false);
        }

        public async Task<IReadOnlyList<TransportResultDto>> SearchRoutesAsync(RouteSearchRequestDto request, CancellationToken cancellationToken = default)
        {
            double fromLat, fromLon, toLat, toLon;
            if (request.FromLat.HasValue && request.FromLon.HasValue && request.ToLat.HasValue && request.ToLon.HasValue)
            {
                fromLat = request.FromLat.Value;
                fromLon = request.FromLon.Value;
                toLat = request.ToLat.Value;
                toLon = request.ToLon.Value;
            }
            else if (!string.IsNullOrWhiteSpace(request.FromPlace) && !string.IsNullOrWhiteSpace(request.ToPlace))
            {
                var (fromResults, _, _) = await _geocodingService.SearchLocationsAsync(request.FromPlace!.Trim(), 1, cancellationToken).ConfigureAwait(false);
                var (toResults, _, _) = await _geocodingService.SearchLocationsAsync(request.ToPlace!.Trim(), 1, cancellationToken).ConfigureAwait(false);
                if (fromResults == null || fromResults.Count == 0 || toResults == null || toResults.Count == 0)
                {
                    _logger.LogWarning("Geocoding failed for FromPlace={FromPlace} or ToPlace={ToPlace}", request.FromPlace, request.ToPlace);
                    return Array.Empty<TransportResultDto>();
                }
                fromLat = fromResults[0].Latitude;
                fromLon = fromResults[0].Longitude;
                toLat = toResults[0].Latitude;
                toLon = toResults[0].Longitude;
            }
            else
            {
                return Array.Empty<TransportResultDto>();
            }

            var apiKey = _configuration["TransportBooking:TripGo:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("TripGo API key not configured");
                return Array.Empty<TransportResultDto>();
            }

            var departAfter = request.DepartAfter ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var client = _httpClientFactory.CreateClient();
            var url = $"{TripGoBase}/routing.json?v=11&locale=en&from=({fromLat},{fromLon})&to=({toLat},{toLon})&departAfter={departAfter}&modes=pt_pub,me_car,wa_wal";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("X-TripGo-Key", apiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            HttpResponseMessage response;
            try
            {
                response = await client.SendAsync(req, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TripGo request failed");
                throw;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("TripGo returned {StatusCode}", response.StatusCode);
                return Array.Empty<TransportResultDto>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            return ParseTripGoResponse(content);
        }

        private async Task<IReadOnlyList<TransportResultDto>> SearchFlightsKiwiAsync(FlightSearchRequestDto request, CancellationToken cancellationToken = default)
        {
            var apiKey = _configuration["TransportBooking:KiwiTequila:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Kiwi Tequila API key not configured");
                return Array.Empty<TransportResultDto>();
            }

            var fromCode = await ResolveKiwiCodeAsync(request.FlyFrom, apiKey, cancellationToken).ConfigureAwait(false);
            var toCode = await ResolveKiwiCodeAsync(request.FlyTo, apiKey, cancellationToken).ConfigureAwait(false);
            if (string.IsNullOrEmpty(fromCode) || string.IsNullOrEmpty(toCode))
            {
                _logger.LogWarning("Could not resolve Kiwi codes for {From} / {To}", request.FlyFrom, request.FlyTo);
                return Array.Empty<TransportResultDto>();
            }

            var dateFrom = ToTequilaDate(request.DateFrom);
            var dateTo = string.IsNullOrWhiteSpace(request.DateTo) ? dateFrom : ToTequilaDate(request.DateTo!);
            if (string.IsNullOrEmpty(dateFrom)) return Array.Empty<TransportResultDto>();

            var query = new List<string>
            {
                $"fly_from={Uri.EscapeDataString(fromCode)}",
                $"fly_to={Uri.EscapeDataString(toCode)}",
                $"date_from={dateFrom}",
                $"date_to={dateTo}",
                "adults=" + Math.Max(1, request.Adults),
                "limit=20",
                "curr=EUR",
                "sort=price"
            };
            if (!string.IsNullOrWhiteSpace(request.ReturnFrom) && !string.IsNullOrWhiteSpace(request.ReturnTo))
            {
                query.Add($"return_from={ToTequilaDate(request.ReturnFrom!)}");
                query.Add($"return_to={ToTequilaDate(request.ReturnTo!)}");
                query.Add("flight_type=round");
            }
            else
            {
                query.Add("flight_type=oneway");
            }

            var client = _httpClientFactory.CreateClient();
            var url = $"{KiwiBase}/v2/search?{string.Join("&", query)}";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("apikey", apiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.SendAsync(req, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Kiwi search returned {StatusCode}", response.StatusCode);
                return Array.Empty<TransportResultDto>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            return ParseKiwiResponse(content);
        }

        private async Task<string> ResolveKiwiCodeAsync(string name, string apiKey, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;
            var trimmed = name.Trim();
            if (trimmed.Length == 3 && char.IsLetter(trimmed[0]) && char.IsLetter(trimmed[1]) && char.IsLetter(trimmed[2]))
                return trimmed.ToUpperInvariant();

            var client = _httpClientFactory.CreateClient();
            var url = $"{KiwiBase}/locations/query?term={Uri.EscapeDataString(trimmed)}&locale=en&limit=10";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("apikey", apiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.SendAsync(req, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode) return string.Empty;

            var content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            using var doc = JsonDocument.Parse(content);
            if (!doc.RootElement.TryGetProperty("locations", out var locs)) return string.Empty;
            foreach (var loc in locs.EnumerateArray())
            {
                var type = loc.TryGetProperty("type", out var t) ? t.GetString() : null;
                var code = loc.TryGetProperty("code", out var c) ? c.GetString() : loc.TryGetProperty("id", out var id) ? id.GetString() : null;
                if (string.IsNullOrEmpty(code)) continue;
                if (type == "airport" || type == "city") return code;
            }
            if (locs.GetArrayLength() > 0 && locs[0].TryGetProperty("code", out var firstCode))
                return firstCode.GetString() ?? string.Empty;
            return string.Empty;
        }

        private static string ToTequilaDate(string yyyyMmDd)
        {
            if (string.IsNullOrWhiteSpace(yyyyMmDd) || yyyyMmDd.Length < 10) return string.Empty;
            var parts = yyyyMmDd.Split('-');
            if (parts.Length != 3) return string.Empty;
            return $"{parts[2]}/{parts[1]}/{parts[0]}";
        }

        private static IReadOnlyList<TransportResultDto> ParseKiwiResponse(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var currency = root.TryGetProperty("currency", out var curr) ? curr.GetString() ?? "EUR" : "EUR";
                if (!root.TryGetProperty("data", out var data)) return Array.Empty<TransportResultDto>();
                var list = new List<TransportResultDto>();
                foreach (var it in data.EnumerateArray())
                {
                    var duration = it.TryGetProperty("duration", out var dur) && dur.TryGetProperty("total", out var tot) ? tot.GetInt32() : 0;
                    var price = it.TryGetProperty("price", out var p) ? p.GetDecimal() : 0;
                    var deepLink = it.TryGetProperty("deep_link", out var dl) ? dl.GetString() : it.TryGetProperty("link", out var link) ? link.GetString() : null;
                    var id = it.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                    var airline = it.TryGetProperty("airlines", out var airlines) && airlines.GetArrayLength() > 0
                        ? airlines[0].GetString()
                        : it.TryGetProperty("flyFrom", out var ff) ? ff.GetString() : null;
                    list.Add(new TransportResultDto
                    {
                        Id = id ?? $"{price}-{duration}-{Guid.NewGuid():N}",
                        Price = price,
                        Currency = currency ?? "EUR",
                        DurationMinutes = duration,
                        Duration = new { total = duration },
                        Segments = it.TryGetProperty("route", out var route) ? JsonSerializer.Deserialize<object>(route.GetRawText()) : null,
                        BookUrl = deepLink,
                        Airline = airline,
                        Provider = "kiwi"
                    });
                }
                return list;
            }
            catch (Exception)
            {
                return Array.Empty<TransportResultDto>();
            }
        }

        private async Task<IReadOnlyList<TransportResultDto>> SearchFlightsSkyscannerAsync(FlightSearchRequestDto request, CancellationToken cancellationToken = default)
        {
            var rapidKey = _configuration["TransportBooking:RapidApi:Key"];
            var rapidHost = _configuration["TransportBooking:RapidApi:SkyscannerHost"];
            var partnerKey = _configuration["TransportBooking:Skyscanner:ApiKey"];
            var useRapid = !string.IsNullOrWhiteSpace(rapidKey) && !string.IsNullOrWhiteSpace(rapidHost);
            var key = useRapid ? rapidKey : partnerKey;
            if (string.IsNullOrWhiteSpace(key))
            {
                _logger.LogWarning("Skyscanner API key not configured");
                return Array.Empty<TransportResultDto>();
            }

            var originIata = ResolveSkyscannerIata(request.FlyFrom);
            var destIata = ResolveSkyscannerIata(request.FlyTo);
            if (string.IsNullOrEmpty(originIata) || string.IsNullOrEmpty(destIata))
            {
                _logger.LogWarning("Could not resolve Skyscanner IATA for {From} / {To}", request.FlyFrom, request.FlyTo);
                return Array.Empty<TransportResultDto>();
            }

            if (!ParseDate(request.DateFrom, out var outY, out var outM, out var outD))
                return Array.Empty<TransportResultDto>();

            var queryLegs = new List<object>
            {
                new
                {
                    originPlaceId = new { iata = originIata },
                    destinationPlaceId = new { iata = destIata },
                    date = new { year = outY, month = outM, day = outD }
                }
            };
            if (ParseDate(request.ReturnFrom ?? "", out var retY, out var retM, out var retD))
            {
                queryLegs.Add(new
                {
                    originPlaceId = new { iata = destIata },
                    destinationPlaceId = new { iata = originIata },
                    date = new { year = retY, month = retM, day = retD }
                });
            }

            var body = new
            {
                query = new
                {
                    market = "UK",
                    locale = "en-GB",
                    currency = "EUR",
                    queryLegs,
                    adults = Math.Max(1, request.Adults),
                    cabinClass = "CABIN_CLASS_ECONOMY"
                }
            };

            var createUrl = useRapid
                ? $"https://{rapidHost}/flights/live/search/create"
                : $"{SkyscannerPartnerBase}/create";
            var client = _httpClientFactory.CreateClient();
            var createReq = new HttpRequestMessage(HttpMethod.Post, createUrl);
            createReq.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            createReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (useRapid)
            {
                createReq.Headers.Add("x-rapidapi-host", rapidHost);
                createReq.Headers.Add("x-rapidapi-key", rapidKey);
            }
            else
            {
                createReq.Headers.Add("x-api-key", partnerKey);
            }

            var createResponse = await client.SendAsync(createReq, cancellationToken).ConfigureAwait(false);
            if (!createResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Skyscanner create returned {StatusCode}", createResponse.StatusCode);
                return Array.Empty<TransportResultDto>();
            }

            var createJson = await createResponse.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            string? sessionToken = null;
            using (var createDoc = JsonDocument.Parse(createJson))
            {
                if (createDoc.RootElement.TryGetProperty("sessionToken", out var st))
                    sessionToken = st.GetString();
                else if (createDoc.RootElement.TryGetProperty("session_token", out var st2))
                    sessionToken = st2.GetString();
            }
            if (string.IsNullOrEmpty(sessionToken))
            {
                _logger.LogWarning("Skyscanner create did not return sessionToken");
                return Array.Empty<TransportResultDto>();
            }

            var pollUrl = useRapid
                ? $"https://{rapidHost}/flights/live/search/poll/{sessionToken}"
                : $"{SkyscannerPartnerBase}/poll/{sessionToken}";
            var start = DateTime.UtcNow;
            while ((DateTime.UtcNow - start).TotalMilliseconds < SkyscannerPollTimeoutMs)
            {
                var pollReq = new HttpRequestMessage(HttpMethod.Post, pollUrl);
                pollReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (useRapid)
                {
                    pollReq.Headers.Add("x-rapidapi-host", rapidHost);
                    pollReq.Headers.Add("x-rapidapi-key", rapidKey);
                }
                else
                {
                    pollReq.Headers.Add("x-api-key", partnerKey);
                }

                var pollResponse = await client.SendAsync(pollReq, cancellationToken).ConfigureAwait(false);
                if (!pollResponse.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Skyscanner poll returned {StatusCode}", pollResponse.StatusCode);
                    return Array.Empty<TransportResultDto>();
                }

                var pollJson = await pollResponse.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                var status = GetPollStatus(pollJson);
                if (status == "RESULT_STATUS_COMPLETE")
                    return ParseSkyscannerResponse(pollJson);

                await Task.Delay(SkyscannerPollIntervalMs, cancellationToken).ConfigureAwait(false);
            }

            _logger.LogWarning("Skyscanner search timed out");
            return Array.Empty<TransportResultDto>();
        }

        private static bool ParseDate(string yyyyMmDd, out int year, out int month, out int day)
        {
            year = month = day = 0;
            if (string.IsNullOrWhiteSpace(yyyyMmDd) || yyyyMmDd.Length < 10) return false;
            var parts = yyyyMmDd.Split('-');
            if (parts.Length != 3) return false;
            return int.TryParse(parts[0], out year) && int.TryParse(parts[1], out month) && int.TryParse(parts[2], out day);
        }

        private static string ResolveSkyscannerIata(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;
            var t = name.Trim().ToUpperInvariant();
            if (t.Length == 3) return t;
            var slug = string.Join("-", System.Text.RegularExpressions.Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9\s-]", "").Trim().Split(new[] { ' ', '-' }, StringSplitOptions.RemoveEmptyEntries));
            var key = slug.Split('-')[0];
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["athens"] = "ATH", ["piraeus"] = "ATH", ["thessaloniki"] = "SKG",
                ["santorini"] = "JTR", ["mykonos"] = "JMK", ["london"] = "LON", ["paris"] = "PAR",
                ["rome"] = "FCO", ["milan"] = "MIL", ["newyork"] = "NYC", ["berlin"] = "BER",
                ["amsterdam"] = "AMS", ["madrid"] = "MAD", ["barcelona"] = "BCN"
            };
            return map.TryGetValue(key, out var code) ? code : string.Empty;
        }

        private static string? GetPollStatus(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("status", out var s)) return s.GetString();
                if (root.TryGetProperty("content", out var content) && content.TryGetProperty("results", out var results) && results.TryGetProperty("status", out var s2))
                    return s2.GetString();
                return null;
            }
            catch { return null; }
        }

        private static IReadOnlyList<TransportResultDto> ParseSkyscannerResponse(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var content = root.TryGetProperty("content", out var c) ? c : root;
                var currency = "EUR";
                if (content.TryGetProperty("query", out var q) && q.TryGetProperty("currency", out var curr))
                    currency = curr.GetString() ?? "EUR";
                var results = content.TryGetProperty("results", out var r) ? r : default;
                if (results.ValueKind == JsonValueKind.Undefined) return Array.Empty<TransportResultDto>();
                var itineraries = results.TryGetProperty("itineraries", out var itProp) ? itProp : results.TryGetProperty("Itineraries", out var it2) ? it2 : default;
                var legs = results.TryGetProperty("legs", out var leg) ? leg : results.TryGetProperty("Legs", out var leg2) ? leg2 : default;
                if (itineraries.ValueKind == JsonValueKind.Undefined) return Array.Empty<TransportResultDto>();

                var list = new List<TransportResultDto>();
                var idx = 0;
                foreach (var it in itineraries.EnumerateArray())
                {
                    var pricingOptions = it.TryGetProperty("pricingOptions", out var po) ? po : it.TryGetProperty("PricingOptions", out var po2) ? po2 : default;
                    if (pricingOptions.ValueKind == JsonValueKind.Undefined || pricingOptions.GetArrayLength() == 0) continue;
                    var firstPrice = pricingOptions[0];
                    var price = firstPrice.TryGetProperty("price", out var p) ? p.GetDecimal() : firstPrice.TryGetProperty("Price", out var p2) ? p2.GetDecimal() : 0;
                    var deepLink = "";
                    if (firstPrice.TryGetProperty("itemId", out var itemId) && itemId.TryGetProperty("deepLink", out var dl))
                        deepLink = dl.GetString() ?? "";
                    else if (firstPrice.TryGetProperty("DeepLink", out var dl2))
                        deepLink = dl2.GetString() ?? "";
                    else if (firstPrice.TryGetProperty("bookingUrl", out var bu))
                        deepLink = bu.GetString() ?? "";

                    var legIds = it.TryGetProperty("legIds", out var lids) ? lids : it.TryGetProperty("LegIds", out var lids2) ? lids2 : default;
                    var totalMinutes = 0;
                    if (legIds.ValueKind != JsonValueKind.Undefined && legs.ValueKind != JsonValueKind.Undefined)
                    {
                        foreach (var lid in legIds.EnumerateArray())
                        {
                            var lidStr = lid.GetString();
                            if (string.IsNullOrEmpty(lidStr)) continue;
                            if (legs.TryGetProperty(lidStr, out var legEl))
                            {
                                if (legEl.TryGetProperty("durationInMinutes", out var dim)) totalMinutes += dim.GetInt32();
                                else if (legEl.TryGetProperty("Duration", out var d)) totalMinutes += d.GetInt32();
                            }
                        }
                    }

                    var id = it.TryGetProperty("id", out var idEl) ? idEl.GetString() : $"sk-{idx}-{price}";
                    list.Add(new TransportResultDto
                    {
                        Id = id ?? $"sk-{idx}-{price}",
                        Price = price,
                        Currency = currency,
                        DurationMinutes = totalMinutes,
                        Duration = new { total = totalMinutes },
                        Segments = null,
                        BookUrl = string.IsNullOrEmpty(deepLink) ? null : deepLink,
                        Provider = "skyscanner"
                    });
                    idx++;
                    if (idx >= 20) break;
                }
                return list;
            }
            catch (Exception)
            {
                return Array.Empty<TransportResultDto>();
            }
        }

        private static IReadOnlyList<TransportResultDto> ParseTripGoResponse(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var trips = root.TryGetProperty("trips", out var t) ? t : root.TryGetProperty("Trips", out var t2) ? t2 : default;
                if (trips.ValueKind == JsonValueKind.Undefined) return Array.Empty<TransportResultDto>();
                var list = new List<TransportResultDto>();
                var idx = 0;
                foreach (var trip in trips.EnumerateArray())
                {
                    var segs = trip.TryGetProperty("segments", out var seg) ? seg : trip.TryGetProperty("Segments", out var seg2) ? seg2 : default;
                    var totalMinutes = 0;
                    if (segs.ValueKind != JsonValueKind.Undefined)
                    {
                        foreach (var s in segs.EnumerateArray())
                        {
                            if (s.TryGetProperty("duration", out var d)) totalMinutes += d.GetInt32();
                            else if (s.TryGetProperty("Duration", out var d2)) totalMinutes += d2.GetInt32();
                            else if (s.TryGetProperty("minutes", out var m)) totalMinutes += m.GetInt32();
                        }
                    }
                    var fare = trip.TryGetProperty("fare", out var f) ? f : trip.TryGetProperty("Fare", out var f2) ? f2 : default;
                    decimal? price = null;
                    var currency = "EUR";
                    if (fare.ValueKind != JsonValueKind.Undefined)
                    {
                        if (fare.TryGetProperty("amount", out var amt)) price = amt.GetDecimal();
                        else if (fare.TryGetProperty("Amount", out var amt2)) price = amt2.GetDecimal();
                        if (fare.TryGetProperty("currency", out var cur)) currency = cur.GetString() ?? "EUR";
                        else if (fare.TryGetProperty("Currency", out var cur2)) currency = cur2.GetString() ?? "EUR";
                    }
                    var booking = trip.TryGetProperty("booking", out var b) ? b : trip.TryGetProperty("Booking", out var b2) ? b2 : default;
                    string? bookUrl = null;
                    if (booking.ValueKind != JsonValueKind.Undefined)
                    {
                        if (booking.TryGetProperty("url", out var u)) bookUrl = u.GetString();
                        else if (booking.TryGetProperty("URL", out var u2)) bookUrl = u2.GetString();
                        else if (booking.TryGetProperty("link", out var l)) bookUrl = l.GetString();
                    }
                    var id = trip.TryGetProperty("id", out var idEl) ? idEl.GetString() : trip.TryGetProperty("ID", out var id2) ? id2.GetString() : $"tg-{idx}-{totalMinutes}";
                    var modes = "";
                    if (segs.ValueKind != JsonValueKind.Undefined)
                    {
                        var modeParts = new List<string>();
                        foreach (var s in segs.EnumerateArray())
                        {
                            if (s.TryGetProperty("mode", out var mo)) modeParts.Add(mo.GetString() ?? "pt");
                            else if (s.TryGetProperty("Mode", out var mo2)) modeParts.Add(mo2.GetString() ?? "pt");
                        }
                        modes = string.Join(", ", modeParts);
                    }
                    list.Add(new TransportResultDto
                    {
                        Id = id ?? $"tg-{idx}",
                        Price = price ?? 0,
                        Currency = currency,
                        DurationMinutes = totalMinutes,
                        Duration = new { total = totalMinutes },
                        Segments = segs.ValueKind != JsonValueKind.Undefined ? JsonSerializer.Deserialize<object>(segs.GetRawText()) : null,
                        BookUrl = bookUrl,
                        Provider = "tripgo",
                        Modes = string.IsNullOrEmpty(modes) ? null : modes
                    });
                    idx++;
                    if (idx >= 15) break;
                }
                return list;
            }
            catch (Exception)
            {
                return Array.Empty<TransportResultDto>();
            }
        }
    }
}
