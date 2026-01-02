# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["Codename_Shield.API/Codename_Shield.API.csproj", "Codename_Shield.API/"]
RUN dotnet restore "Codename_Shield.API/Codename_Shield.API.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/Codename_Shield.API"
RUN dotnet build "Codename_Shield.API.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "Codename_Shield.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Install curl for healthcheck if needed (optional)
# RUN apt-get update && apt-get install -y curl

# Configure .NET to listen on port 8080 (Render default)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Codename_Shield.API.dll"]
