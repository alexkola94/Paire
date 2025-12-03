using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using YouAndMeExpenses.Controllers;
using Xunit;

namespace YouAndMeExpenses.Tests.Controllers
{
    /// <summary>
    /// Unit tests for SystemController
    /// </summary>
    public class SystemControllerTests
    {
        private readonly Mock<ILogger<SystemController>> _loggerMock;
        private readonly SystemController _controller;

        public SystemControllerTests()
        {
            // Setup mocks
            _loggerMock = new Mock<ILogger<SystemController>>();
            
            // Create controller with mocked dependencies
            _controller = new SystemController(_loggerMock.Object);
        }

        [Fact]
        public void GetHealth_ShouldReturnOkResult()
        {
            // Act
            var result = _controller.GetHealth();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public void GetHealth_ShouldReturnHealthStatus()
        {
            // Act
            var result = _controller.GetHealth() as OkObjectResult;

            // Assert
            result.Should().NotBeNull();
            result!.Value.Should().NotBeNull();
            
            // Check if response has required properties
            var response = result.Value as dynamic;
            Assert.NotNull(response);
        }

        [Fact]
        public void GetHealth_ShouldLogInformation()
        {
            // Act
            _controller.GetHealth();

            // Assert - verify logger was called
            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Health check requested")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void GetInfo_ShouldReturnOkResult()
        {
            // Act
            var result = _controller.GetInfo();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public void GetInfo_ShouldReturnApiInformation()
        {
            // Act
            var result = _controller.GetInfo() as OkObjectResult;

            // Assert
            result.Should().NotBeNull();
            result!.Value.Should().NotBeNull();
        }

        [Fact]
        public void GetHealth_ShouldReturnStatusHealthy()
        {
            // Act
            var result = _controller.GetHealth() as OkObjectResult;
            dynamic? value = result?.Value;

            // Assert
            Assert.NotNull(value);
            Assert.Equal("healthy", value!.status);
        }

        [Fact]
        public void GetHealth_ShouldReturnTimestamp()
        {
            // Arrange
            var beforeCall = DateTime.UtcNow;

            // Act
            var result = _controller.GetHealth() as OkObjectResult;
            dynamic? value = result?.Value;

            // Assert
            var afterCall = DateTime.UtcNow;
            Assert.NotNull(value);
            
            DateTime timestamp = value!.timestamp;
            timestamp.Should().BeOnOrAfter(beforeCall);
            timestamp.Should().BeOnOrBefore(afterCall);
        }

        [Fact]
        public void GetInfo_ShouldReturnCorrectVersion()
        {
            // Act
            var result = _controller.GetInfo() as OkObjectResult;
            dynamic? value = result?.Value;

            // Assert
            Assert.NotNull(value);
            Assert.Equal("1.0.0", value!.version);
        }
    }
}

