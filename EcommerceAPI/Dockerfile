# syntax=docker/dockerfile:1
# EcommerceAPI image. Build context: EcommerceAPI/
#   docker build -t ecommerce-api ./EcommerceAPI

# ---- build -------------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first, from the project file only, so the NuGet layer is cached until dependencies change.
COPY global.json EcommerceAPI.csproj ./
RUN dotnet restore EcommerceAPI.csproj

COPY . .
RUN dotnet publish EcommerceAPI.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---- runtime -----------------------------------------------------------------------------------
# Alpine instead of chiseled: busybox `wget` gives us a HEALTHCHECK without adding curl.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime

LABEL org.opencontainers.image.title="ecommerce-api" \
      org.opencontainers.image.description="Ecommerce ASP.NET Core Web API"

# Alpine ships without ICU; install it so culture-aware formatting (prices, dates) matches local runs.
# Not version-pinned (hadolint DL3018): the base tag already fixes the Alpine release.
# hadolint ignore=DL3018
RUN apk add --no-cache icu-libs icu-data-full
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    ASPNETCORE_HTTP_PORTS=8080

WORKDIR /app
COPY --from=build /app ./

# Non-root user provided by the .NET base images.
USER $APP_UID
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/health"]

ENTRYPOINT ["dotnet", "EcommerceAPI.dll"]
