# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- xUnit 2.9.3
- Config: `backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj`
- Target Framework: .NET 7.0

**Assertion Library:**
- FluentAssertions 8.8.0

**Mocking Framework:**
- Moq 4.20.72
- NSubstitute 5.3.0 (included but Moq is primary)

**Run Commands:**
```bash
# Run all tests
dotnet test backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj

# Watch mode (via dotnet watch)
dotnet watch --project backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj test

# Coverage
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover
```

**Test Explorer:** Visual Studio Test Explorer integration via xunit.runner.visualstudio

## Test File Organization

**Location:**
- Organized by category under `backend/YouAndMeExpenses.Tests/`
- `Controllers/` - Controller unit tests
- `Services/` - Service unit tests
- `Models/` - Model/DTO tests

**Naming:**
- `[ClassName]Tests.cs` pattern: `EmailServiceTests.cs`, `RemindersControllerTests.cs`, `EmailModelsTests.cs`

**Structure:**
```
backend/YouAndMeExpenses.Tests/
├── Controllers/
│   └── RemindersControllerTests.cs
├── Services/
│   ├── EmailServiceTests.cs
│   └── ReminderServiceTests.cs
├── Models/
│   └── EmailModelsTests.cs
└── GlobalUsings.cs
```

## Test Structure

**Suite Organization:**
Global using directives centralize common imports:

**File:** `backend/YouAndMeExpenses.Tests/GlobalUsings.cs` (lines 1-4)
```csharp
global using Xunit;
global using FluentAssertions;
global using Moq;
```

**Test Class Pattern:**
```csharp
public class EmailServiceTests
{
    private readonly Mock<IOptions<EmailSettings>> _mockEmailSettings;
    private readonly Mock<ILogger<EmailService>> _mockLogger;
    private readonly EmailSettings _emailSettings;

    public EmailServiceTests()
    {
        // Setup - constructor runs before each test
        _emailSettings = new EmailSettings { /* ... */ };
        _mockEmailSettings = new Mock<IOptions<EmailSettings>>();
        _mockEmailSettings.Setup(x => x.Value).Returns(_emailSettings);
        _mockLogger = new Mock<ILogger<EmailService>>();
    }

    [Fact]
    public void MethodName_Should_DoSomething_WithCondition()
    {
        // Arrange: Set up test data
        var expected = "value";

        // Act: Execute the method
        var result = Service.Method();

        // Assert: Verify results
        result.Should().Be(expected);
    }
}
```

**Patterns:**

1. **Setup Pattern (Constructor):**
   - Mock dependencies in constructor
   - Create fresh mocks before each test
   - Setup common mock configurations

2. **Teardown Pattern:**
   - Not explicitly used; xUnit handles IDisposable cleanup
   - No explicit cleanup needed for Moq mocks

3. **Assertion Pattern:**
   - FluentAssertions fluent syntax: `.Should()` chains
   - Examples:
     ```csharp
     service.Should().NotBeNull();
     result.Should().Be(expected);
     result.Should().Contain(item);
     result.Should().BeOfType<OkObjectResult>();
     prefs.BillReminderDays.Should().BeInRange(1, 30);
     ```

## Mocking

**Framework:** Moq 4.20.72

**Patterns:**

Basic mock setup from `EmailServiceTests.cs` (lines 17-31):
```csharp
_mockEmailSettings = new Mock<IOptions<EmailSettings>>();
_mockEmailSettings.Setup(x => x.Value).Returns(_emailSettings);

_mockLogger = new Mock<ILogger<EmailService>>();
```

Service mocking from `RemindersControllerTests.cs` (lines 21-24):
```csharp
_mockReminderService = new Mock<IReminderService>();
_mockReminderService
    .Setup(x => x.SendBillRemindersAsync(userId))
    .ReturnsAsync(3);
```

Complex setup from `ReminderServiceTests.cs` (lines 54-57):
```csharp
_mockSupabaseService
    .Setup(x => x.GetLoansAsync(userId.ToString()))
    .ReturnsAsync(new List<Loan>());
```

**What to Mock:**
- External service dependencies: `IEmailService`, `ISupabaseService`, `IReminderService`
- Infrastructure: `IOptions<T>`, `ILogger<T>`
- Database context replacements
- Do NOT mock when testing the actual behavior

**What NOT to Mock:**
- The class under test (CUT)
- Simple value objects and DTOs
- Collections (use real List<T>)
- Framework classes unless required (IOptions, ILogger can be mocked for configuration)

## Fixtures and Factories

**Test Data:**
Models created inline in test methods:

From `ReminderServiceTests.cs` (lines 99-111):
```csharp
var preferences = new ReminderPreferences
{
    Id = Guid.NewGuid(),
    UserId = Guid.NewGuid().ToString(),
    EmailEnabled = true,
    BillRemindersEnabled = true,
    BillReminderDays = 3,
    LoanRemindersEnabled = true,
    LoanReminderDays = 7,
    BudgetAlertsEnabled = true,
    BudgetAlertThreshold = 90,
    SavingsMilestonesEnabled = true
};
```

From `EmailServiceTests.cs` (lines 19-28):
```csharp
_emailSettings = new EmailSettings
{
    SmtpServer = "smtp.gmail.com",
    SmtpPort = 587,
    SenderEmail = "test@test.com",
    SenderName = "Test Sender",
    Username = "test@test.com",
    Password = "test-password",
    EnableSsl = true
};
```

**Location:**
- No dedicated factory or builder classes
- Data created inline in Arrange blocks
- Reusable setup in constructor (e.g., `_emailSettings`)

## Coverage

**Requirements:** Not enforced (no codecov integration detected)

**View Coverage:**
```bash
# Generate coverage report with coverlet
dotnet test backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj \
  /p:CollectCoverage=true \
  /p:CoverageFormat=opencover \
  /p:CoverageFileName=coverage.xml

# HTML report (requires ReportGenerator tool)
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"coverage.xml" -targetdir:"coverage"
```

**Current State:** Limited test coverage (9 test classes found; large codebase indicates gaps)

## Test Types

**Unit Tests:**
- **Scope:** Single class in isolation with mocked dependencies
- **Approach:** Moq-based mocks injected; assertions on method return values and mock calls
- **Example:** `EmailServiceTests.CreateReminderEmailTemplate_Should_Return_Valid_Html()` (lines 47-62)
  ```csharp
  [Fact]
  public void CreateReminderEmailTemplate_Should_Return_Valid_Html()
  {
      // Arrange
      var title = "Test Title";
      var message = "Test Message";
      var actionUrl = "https://test.com";

      // Act
      var result = EmailService.CreateReminderEmailTemplate(title, message, actionUrl);

      // Assert
      result.Should().Contain(title);
      result.Should().Contain(message);
      result.Should().Contain(actionUrl);
      result.Should().Contain("<!DOCTYPE html>");
  }
  ```

**Integration Tests:**
- **Approach:** Controller tests with mocked service layers
- **Example:** `RemindersControllerTests.CheckReminders_Should_Return_Ok_With_Result()` (lines 33-48)
  ```csharp
  [Fact]
  public async Task CheckReminders_Should_Return_Ok_With_Result()
  {
      // Arrange
      var userId = Guid.NewGuid();
      _mockReminderService
          .Setup(x => x.CheckAndSendAllRemindersAsync(userId))
          .ReturnsAsync(5);

      // Act
      var result = await _controller.CheckReminders(userId);

      // Assert
      result.Should().BeOfType<OkObjectResult>();
      var okResult = result as OkObjectResult;
      okResult?.Value.Should().BeOfType<ReminderCheckResult>();
  }
  ```

**E2E Tests:**
- **Status:** Not implemented
- **Opportunity:** Use `Microsoft.AspNetCore.Mvc.Testing` (already referenced in csproj)
- **Would test:** Full request-response cycle with real DbContext and actual services

## Common Patterns

**Fact vs Theory:**
- `[Fact]` - Single test case with fixed input
- `[Theory]` - Parameterized test with multiple data sets

**Fact Example:** `EmailServiceTests.EmailService_Should_Initialize_With_Valid_Settings()` (line 36)

**Theory Example with InlineData:** `EmailModelsTests.cs` (lines 94-110)
```csharp
[Theory]
[InlineData(1)]
[InlineData(7)]
[InlineData(30)]
public void ReminderPreferences_Should_Accept_Valid_Reminder_Days(int days)
{
    // Arrange & Act
    var prefs = new ReminderPreferences
    {
        BillReminderDays = days,
        LoanReminderDays = days
    };

    // Assert
    prefs.BillReminderDays.Should().Be(days);
    prefs.LoanReminderDays.Should().Be(days);
}
```

**Async Testing:**
```csharp
// From ReminderServiceTests.cs (lines 38-48)
[Fact]
public async Task SendBillRemindersAsync_Should_Return_Zero_When_No_Preferences()
{
    // Arrange
    var userId = Guid.NewGuid();

    // Act
    var result = await _reminderService.SendBillRemindersAsync(userId);

    // Assert
    result.Should().Be(0);
}
```

Key points:
- Test method is `async Task` (not void)
- `await` used for async operations
- Setup mocks before async call
- Assert on await result

**Error Testing:**
Not extensively demonstrated in current tests. Pattern would be:

```csharp
[Fact]
public void CreateService_Should_Throw_When_Invalid_Config()
{
    // Arrange
    var invalidConfig = new InvalidSettings();

    // Act & Assert
    Action act = () => new Service(invalidConfig);
    act.Should().Throw<ArgumentException>()
        .WithMessage("*invalid*");
}
```

## Test Naming Convention

**Format:** `[MethodName]_Should_[ExpectedBehavior]_When_[Condition]`

Examples:
- `EmailService_Should_Initialize_With_Valid_Settings`
- `CreateReminderEmailTemplate_Should_Return_Valid_Html`
- `CreateReminderEmailTemplate_Should_Handle_Empty_ActionUrl`
- `SendBillRemindersAsync_Should_Return_Zero_When_No_Preferences`
- `CheckReminders_Should_Return_Ok_With_Result`

## Current Test Coverage

**Tested Components:**
- Models/DTOs: `EmailSettings`, `EmailMessage`, `ReminderPreferences`, `ReminderType`
- Services: `EmailService`, `ReminderService`
- Controllers: `RemindersController`

**Major Gaps:**
- `TransactionsService` - Not tested; critical business logic uncovered
- `TransactionsController` - Not tested; API endpoints uncovered
- `BudgetService` - Not tested; complex budget calculation logic uncovered
- All other services (AchievementService, AnalyticsService, CurrencyService, etc.) - Not tested
- All other controllers (AuthController, BudgetsController, etc.) - Not tested
- Database layer integration - Not tested
- Authentication flow - Not tested

## Test Execution

**Local Development:**
```bash
# Run tests with verbose output
dotnet test backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj --verbosity normal

# Run specific test
dotnet test backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj --filter "EmailServiceTests"

# Run with detailed failure info
dotnet test backend/YouAndMeExpenses.Tests/YouAndMeExpenses.Tests.csproj --logger "console;verbosity=detailed"
```

**CI/CD Integration:**
- Test project referenced in main solution (`.sln`)
- `coverlet.collector` included for coverage collection
- Ready for GitHub Actions or Azure Pipelines integration

---

*Testing analysis: 2026-01-21*
