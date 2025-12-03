# You & Me Expenses - Backend API

.NET 8 Web API for the You & Me Expenses application.

## 📝 Note

**This backend is optional!** The application is designed to work directly with Supabase from the frontend, which provides:
- Built-in authentication
- Row Level Security (RLS)
- Real-time database access
- File storage

The backend is provided for:
- Future scalability
- Additional business logic if needed
- Custom API endpoints
- Integration with other services

## 🚀 Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- Supabase account (optional for direct integration)

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Restore dependencies:
```bash
dotnet restore
```

3. Configure appsettings:
```bash
# Copy the example configuration
cp appsettings.json appsettings.Development.json
```

4. Update `appsettings.Development.json` with your Supabase credentials (if needed):
```json
{
  "Supabase": {
    "Url": "your_supabase_url",
    "Key": "your_supabase_service_key",
    "JwtSecret": "your_jwt_secret"
  }
}
```

### Running the API

```bash
# Development mode with hot reload
dotnet watch run

# Production mode
dotnet run --configuration Release
```

The API will be available at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `http://localhost:5000/swagger`

## 📚 API Documentation

Once running, visit `http://localhost:5000/swagger` for interactive API documentation.

### Available Endpoints

#### System
- `GET /health` - Health check endpoint
- `GET /api/system/health` - Detailed health status
- `GET /api/system/info` - API information

## 🏗️ Project Structure

```
backend/
├── Controllers/          # API controllers
│   └── SystemController.cs
├── Models/              # Data models and DTOs
│   ├── Transaction.cs
│   └── Loan.cs
├── Services/            # Business logic services
├── Program.cs           # Application entry point
├── appsettings.json     # Configuration
└── YouAndMeExpenses.csproj
```

## 🔐 Authentication

The backend supports JWT authentication from Supabase. To enable:

1. Uncomment the JWT configuration in `Program.cs`
2. Add your Supabase JWT secret to `appsettings.json`
3. Protect endpoints with `[Authorize]` attribute

## 🌐 CORS Configuration

CORS is pre-configured for:
- Local development: `http://localhost:3000`
- Production: `https://youandme-expenses.github.io`

Update the CORS policy in `Program.cs` if you deploy to a different domain.

## 🧪 Testing

### Run Tests

```bash
# Run all tests
dotnet test

# Run with detailed output
dotnet test --verbosity detailed

# Run with coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover

# Run in watch mode
dotnet watch test

# Run specific test
dotnet test --filter "FullyQualifiedName~SystemControllerTests"
```

### Test Structure

```
YouAndMeExpenses.Tests/
├── Controllers/          # Controller unit tests
├── Models/              # Model unit tests
├── Services/            # Service unit tests
├── Integration/         # Integration tests
└── GlobalUsings.cs      # Shared test imports
```

### Coverage Report

```bash
# Install ReportGenerator (once)
dotnet tool install -g dotnet-reportgenerator-globaltool

# Generate coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura

# Generate HTML report
reportgenerator -reports:"coverage.cobertura.xml" -targetdir:"coveragereport" -reporttypes:Html
```

For more details, see [TESTING.md](./TESTING.md)

## 📦 Deployment

### Docker (Recommended)

```bash
# Build Docker image
docker build -t youandme-expenses-api .

# Run container
docker run -p 5000:80 youandme-expenses-api
```

### Cloud Platforms

- **Azure App Service**: Deploy directly from Visual Studio or GitHub Actions
- **AWS Elastic Beanstalk**: Package and deploy
- **Google Cloud Run**: Containerize and deploy

### Manual Deployment

```bash
# Publish for production
dotnet publish -c Release -o ./publish

# Run published app
cd publish
dotnet YouAndMeExpenses.dll
```

## 🔧 Development

### Adding New Endpoints

1. Create a new controller in `Controllers/`
2. Define models in `Models/`
3. Implement business logic in `Services/`
4. Add to Swagger documentation

### Code Style

- Follow .NET coding conventions
- Use XML comments for public APIs
- Implement async/await for I/O operations
- Use dependency injection

## 📄 License

Private - For personal use only

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your own use!

