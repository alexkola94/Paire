using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace YouAndMeExpenses.Tests.Integration
{
    /// <summary>
    /// Integration tests for the API
    /// Tests the entire application stack
    /// </summary>
    public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;

        public ApiIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task HealthEndpoint_ShouldReturnOk()
        {
            // Act
            var response = await _client.GetAsync("/health");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task HealthEndpoint_ShouldReturnHealthyStatus()
        {
            // Act
            var response = await _client.GetAsync("/health");
            var content = await response.Content.ReadAsStringAsync();

            // Assert
            response.EnsureSuccessStatusCode();
            content.Should().Contain("healthy");
        }

        [Fact]
        public async Task SystemHealthEndpoint_ShouldReturnOk()
        {
            // Act
            var response = await _client.GetAsync("/api/system/health");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SystemHealthEndpoint_ShouldReturnValidJson()
        {
            // Act
            var response = await _client.GetAsync("/api/system/health");
            var content = await response.Content.ReadAsStringAsync();

            // Assert
            response.EnsureSuccessStatusCode();
            content.Should().Contain("status");
            content.Should().Contain("timestamp");
            content.Should().Contain("version");
        }

        [Fact]
        public async Task SystemInfoEndpoint_ShouldReturnOk()
        {
            // Act
            var response = await _client.GetAsync("/api/system/info");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SystemInfoEndpoint_ShouldReturnApiInfo()
        {
            // Act
            var response = await _client.GetAsync("/api/system/info");
            var content = await response.Content.ReadAsStringAsync();

            // Assert
            response.EnsureSuccessStatusCode();
            content.Should().Contain("You & Me Expenses API");
            content.Should().Contain("version");
        }

        [Fact]
        public async Task InvalidEndpoint_ShouldReturn404()
        {
            // Act
            var response = await _client.GetAsync("/api/nonexistent");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task HealthEndpoint_ShouldReturnJsonContentType()
        {
            // Act
            var response = await _client.GetAsync("/health");

            // Assert
            response.Content.Headers.ContentType?.MediaType
                .Should().Be("application/json");
        }

        [Theory]
        [InlineData("/health")]
        [InlineData("/api/system/health")]
        [InlineData("/api/system/info")]
        public async Task AllHealthEndpoints_ShouldReturnSuccessStatusCode(string endpoint)
        {
            // Act
            var response = await _client.GetAsync(endpoint);

            // Assert
            response.IsSuccessStatusCode.Should().BeTrue();
        }

        [Fact]
        public async Task HealthEndpoint_ShouldBeFast()
        {
            // Arrange
            var maxResponseTime = TimeSpan.FromMilliseconds(500);
            var startTime = DateTime.UtcNow;

            // Act
            var response = await _client.GetAsync("/health");
            var endTime = DateTime.UtcNow;

            // Assert
            response.IsSuccessStatusCode.Should().BeTrue();
            (endTime - startTime).Should().BeLessThan(maxResponseTime);
        }

        [Fact]
        public async Task MultipleHealthChecks_ShouldAllSucceed()
        {
            // Act
            var tasks = Enumerable.Range(0, 10)
                .Select(_ => _client.GetAsync("/health"))
                .ToArray();

            var responses = await Task.WhenAll(tasks);

            // Assert
            responses.Should().OnlyContain(r => r.IsSuccessStatusCode);
        }
    }
}

