# Backend Testing Guide

Comprehensive testing guide for the .NET backend API.

## 🧪 Testing Stack

- **xUnit** - Modern, flexible testing framework
- **Moq** - Mocking library for dependencies
- **FluentAssertions** - Readable assertions
- **Microsoft.AspNetCore.Mvc.Testing** - Integration testing

## 🚀 Running Tests

### Run All Tests
```bash
cd backend
dotnet test
```

### Run Tests with Detailed Output
```bash
dotnet test --verbosity detailed
```

### Run Tests with Coverage
```bash
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover
```

### Run Specific Test
```bash
dotnet test --filter "FullyQualifiedName~SystemControllerTests"
```

### Run Tests in Watch Mode
```bash
dotnet watch test
```

### Generate HTML Coverage Report
```bash
# Install ReportGenerator
dotnet tool install -g dotnet-reportgenerator-globaltool

# Generate coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura

# Generate HTML report
reportgenerator -reports:"coverage.cobertura.xml" -targetdir:"coveragereport" -reporttypes:Html
```

## 📁 Test Structure

```
backend/
├── YouAndMeExpenses/          # Main project
└── YouAndMeExpenses.Tests/   # Test project
    ├── Controllers/           # Controller tests
    │   └── SystemControllerTests.cs
    ├── Models/               # Model tests
    │   ├── TransactionTests.cs
    │   └── LoanTests.cs
    ├── Integration/          # Integration tests
    │   └── ApiIntegrationTests.cs
    └── GlobalUsings.cs       # Global imports
```

## ✍️ Writing Tests

### Unit Test Example

```csharp
using FluentAssertions;
using Xunit;

public class CalculatorTests
{
    [Fact]
    public void Add_ShouldReturnSum()
    {
        // Arrange
        var calculator = new Calculator();

        // Act
        var result = calculator.Add(2, 3);

        // Assert
        result.Should().Be(5);
    }

    [Theory]
    [InlineData(1, 2, 3)]
    [InlineData(0, 0, 0)]
    [InlineData(-1, -1, -2)]
    public void Add_ShouldWorkWithMultipleInputs(int a, int b, int expected)
    {
        // Arrange
        var calculator = new Calculator();

        // Act
        var result = calculator.Add(a, b);

        // Assert
        result.Should().Be(expected);
    }
}
```

### Controller Test Example

```csharp
using Moq;
using Microsoft.Extensions.Logging;
using FluentAssertions;
using Xunit;

public class MyControllerTests
{
    private readonly Mock<IMyService> _serviceMock;
    private readonly Mock<ILogger<MyController>> _loggerMock;
    private readonly MyController _controller;

    public MyControllerTests()
    {
        _serviceMock = new Mock<IMyService>();
        _loggerMock = new Mock<ILogger<MyController>>();
        _controller = new MyController(_serviceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetData_ShouldReturnOkResult()
    {
        // Arrange
        var expectedData = new List<string> { "test" };
        _serviceMock.Setup(x => x.GetDataAsync())
            .ReturnsAsync(expectedData);

        // Act
        var result = await _controller.GetData();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }
}
```

### Integration Test Example

```csharp
using Microsoft.AspNetCore.Mvc.Testing;
using FluentAssertions;
using Xunit;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetEndpoint_ShouldReturnSuccess()
    {
        // Act
        var response = await _client.GetAsync("/api/endpoint");

        // Assert
        response.IsSuccessStatusCode.Should().BeTrue();
    }
}
```

## 🎯 Testing Best Practices

### 1. Follow AAA Pattern

```csharp
[Fact]
public void Test_ShouldDoSomething()
{
    // Arrange - Setup test data and dependencies
    var service = new MyService();
    var input = "test";

    // Act - Execute the method being tested
    var result = service.Process(input);

    // Assert - Verify the outcome
    result.Should().Be("expected");
}
```

### 2. Use Descriptive Test Names

```csharp
// ❌ Bad
[Fact]
public void Test1() { }

// ✅ Good
[Fact]
public void GetUser_WithValidId_ShouldReturnUser() { }
```

### 3. Test One Thing Per Test

```csharp
// ❌ Bad - tests multiple things
[Fact]
public void TestEverything()
{
    var result = service.Method();
    result.Should().NotBeNull();
    result.Count.Should().Be(5);
    result.First().Name.Should().Be("Test");
    // ... too many assertions
}

// ✅ Good - focused tests
[Fact]
public void Method_ShouldReturnNonNullResult() { }

[Fact]
public void Method_ShouldReturnFiveItems() { }

[Fact]
public void Method_FirstItemShouldHaveCorrectName() { }
```

### 4. Use Theory for Similar Tests

```csharp
[Theory]
[InlineData(0, 0)]
[InlineData(1, 1)]
[InlineData(5, 120)]
public void Factorial_ShouldCalculateCorrectly(int input, int expected)
{
    var result = MathHelper.Factorial(input);
    result.Should().Be(expected);
}
```

### 5. Mock External Dependencies

```csharp
[Fact]
public async Task SaveData_ShouldCallRepository()
{
    // Arrange
    var repositoryMock = new Mock<IRepository>();
    var service = new DataService(repositoryMock.Object);
    var data = new DataModel();

    // Act
    await service.SaveAsync(data);

    // Assert
    repositoryMock.Verify(x => x.SaveAsync(data), Times.Once);
}
```

## 📊 Code Coverage

### Install Coverage Tools

```bash
# Install coverlet
dotnet add package coverlet.collector

# Install ReportGenerator (global tool)
dotnet tool install -g dotnet-reportgenerator-globaltool
```

### Generate Coverage Report

```bash
# Run tests with coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover

# Generate HTML report
reportgenerator \
  -reports:"coverage.opencover.xml" \
  -targetdir:"coveragereport" \
  -reporttypes:Html
```

### Coverage Goals
- **Statements**: 80%+
- **Branches**: 75%+
- **Methods**: 80%+
- **Lines**: 80%+

## 🧩 Common Testing Patterns

### Testing Async Methods

```csharp
[Fact]
public async Task GetDataAsync_ShouldReturnData()
{
    // Arrange
    var service = new MyService();

    // Act
    var result = await service.GetDataAsync();

    // Assert
    result.Should().NotBeNull();
}
```

### Testing Exceptions

```csharp
[Fact]
public void Method_WithInvalidInput_ShouldThrowException()
{
    // Arrange
    var service = new MyService();

    // Act
    Action act = () => service.Process(null);

    // Assert
    act.Should().Throw<ArgumentNullException>();
}
```

### Testing Collections

```csharp
[Fact]
public void GetAll_ShouldReturnMultipleItems()
{
    // Act
    var result = service.GetAll();

    // Assert
    result.Should().NotBeEmpty();
    result.Should().HaveCount(3);
    result.Should().Contain(x => x.Name == "Test");
}
```

### Testing HTTP Responses

```csharp
[Fact]
public async Task GetEndpoint_ShouldReturnJson()
{
    // Act
    var response = await _client.GetAsync("/api/data");
    var content = await response.Content.ReadAsStringAsync();

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    content.Should().Contain("\"id\"");
}
```

## 🐛 Debugging Tests

### Debug in Visual Studio
1. Set breakpoint in test
2. Right-click test → Debug Test(s)
3. Step through code

### Debug in VS Code
1. Install C# extension
2. Set breakpoint
3. Press F5
4. Select ".NET Core Launch"

### Output Debugging Info

```csharp
[Fact]
public void Test_WithDebugOutput()
{
    var result = service.Method();
    
    // This will appear in test output
    _output.WriteLine($"Result: {result}");
    
    result.Should().Be("expected");
}
```

## 📝 Test Checklist

Before committing:

- [ ] All tests pass
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Coverage maintained/improved
- [ ] No skipped tests
- [ ] Test names are descriptive
- [ ] Mocks are cleaned up
- [ ] Integration tests pass

## 🎓 Learning Resources

- [xUnit Documentation](https://xunit.net/)
- [Moq Quickstart](https://github.com/moq/moq4/wiki/Quickstart)
- [FluentAssertions Docs](https://fluentassertions.com/)
- [ASP.NET Core Testing](https://learn.microsoft.com/en-us/aspnet/core/test/)

## 🆘 Troubleshooting

### Tests are slow
- Use mocks for external dependencies
- Avoid Thread.Sleep
- Use in-memory databases for integration tests

### Tests fail randomly
- Check for async race conditions
- Use proper async/await
- Avoid shared state between tests

### Can't debug tests
- Ensure test project references main project
- Check launch.json configuration
- Update to latest test SDK

## 📊 CI/CD Integration

### GitHub Actions

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      - name: Restore dependencies
        run: dotnet restore
        working-directory: ./backend
      - name: Build
        run: dotnet build --no-restore
        working-directory: ./backend
      - name: Test
        run: dotnet test --no-build --verbosity normal
        working-directory: ./backend
```

---

**Happy Testing! 🎉**

Well-tested code gives you confidence to refactor and ship features!

