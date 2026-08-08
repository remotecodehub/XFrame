---
name: XFrame Aspire
description: Instructions for .NET Aspire infrastructure and distributed application changes.
applyTo: "src/XFrame.AppHost/**/*;src/XFrame.ServiceDefaults/**/*;aspire.config.json"
---

# XFrame Aspire

The solution uses .NET Aspire 13.x with .NET 10.

## AppHost

`XFrame.AppHost` owns distributed application composition.

Current topology includes:

- Redis cache;
- XFrame.ApiService;
- XFrame.Web.

Use Aspire resource references and service discovery.

Do not place business logic in AppHost.

## ServiceDefaults

`XFrame.ServiceDefaults` contains shared Aspire infrastructure.

Keep:

- OpenTelemetry;
- health checks;
- service discovery;
- resilience;

centralized here when appropriate.

Do not duplicate these registrations in individual application projects.

## Resource dependencies

When adding a resource:

1. Add it to AppHost.
2. Add the appropriate project/package integration.
3. Configure the consuming application through Aspire.
4. Avoid hard-coded service URLs when service discovery can be used.

## Development

Do not replace Aspire orchestration with manually configured localhost URLs unless explicitly required.