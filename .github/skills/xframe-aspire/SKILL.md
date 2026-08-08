---
name: xframe-aspire
description: Work on XFrame .NET Aspire orchestration, resources, service discovery, health checks, resilience and distributed application configuration.
---

# XFrame Aspire Skill

Use for changes involving:

- AppHost;
- ServiceDefaults;
- Aspire resources;
- service discovery;
- distributed application configuration.

## Architecture

AppHost composes resources.

ServiceDefaults provides shared infrastructure.

Application projects contain application behavior.

Do not move business logic into AppHost.

## Current resources

The application currently composes:

- Redis;
- XFrame.ApiService;
- XFrame.Web.

Web references the API through Aspire service discovery.

## Rules

Prefer Aspire resource references over hard-coded URLs.

Use existing ServiceDefaults infrastructure.

Do not duplicate telemetry or health-check configuration.

Do not introduce persistence infrastructure unless explicitly requested.

After changes:

dotnet build XFrame.slnx