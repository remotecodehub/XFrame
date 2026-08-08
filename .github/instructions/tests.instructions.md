---
name: XFrame Tests
description: Instructions for XFrame automated tests.
applyTo: "src/XFrame.Tests/**/*"
---

# XFrame.Tests

Tests use MSTest and Aspire.Hosting.Testing.

## Rules

Prefer tests that validate observable behavior.

For Aspire integration tests:

- start the application through the AppHost;
- use Aspire resource/service discovery;
- verify application health;
- test API behavior through HTTP.

Do not duplicate implementation logic inside tests.

For editor-related behavior, test state transitions independently from WebGPU rendering whenever possible.

## Validation

After modifying behavior:

dotnet build XFrame.slnx

Then execute the relevant tests. Do not execute tests if they're not implemented yet.

Do not consider compilation alone sufficient validation.