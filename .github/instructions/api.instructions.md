---
name: XFrame API
description: Instructions for XFrame REST API development.
applyTo: "src/XFrame.ApiService/**/*"
---

# XFrame.ApiService

This project is the REST API boundary of XFrame.

## Responsibilities

Use this project for:

- HTTP endpoints;
- request/response contracts;
- API-facing application behavior;
- validation at the API boundary;
- future persistence integration.

Do not move Blazor UI concerns here.

Do not place WebGPU/browser logic here.

## Aspire

The API participates in the Aspire application through AppHost and ServiceDefaults.

Use existing Aspire service-default infrastructure.

Do not duplicate telemetry, health checks, service discovery or resilience configuration unnecessarily.

## Persistence

MongoDB and SQL Server are future concerns.

Do not introduce persistence unless explicitly requested.

Design API contracts so future persistence can be added without coupling them to browser UI models.

## API design

Prefer explicit request and response DTOs.

Do not expose internal editor state types directly unless they are intentionally defined as API contracts.

Keep HTTP concerns at the API boundary.