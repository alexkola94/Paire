# Dockerfile for ASP.NET Core API
# This is optional - Render can build without it

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["YouAndMeExpensesAPI.csproj", "./"]
RUN dotnet restore "YouAndMeExpensesAPI.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "YouAndMeExpensesAPI.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "YouAndMeExpensesAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Environment variable for port
ENV ASPNETCORE_URLS=http://+:$PORT

ENTRYPOINT ["dotnet", "YouAndMeExpensesAPI.dll"]

