# Dockerfile for Paire API (Modular Monolith)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Paire.sln", "./"]
COPY ["src/", "src/"]
RUN dotnet restore "Paire.sln"
RUN dotnet build "src/Host/Paire.Api/Paire.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "src/Host/Paire.Api/Paire.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:$PORT

ENTRYPOINT ["dotnet", "Paire.Api.dll"]
