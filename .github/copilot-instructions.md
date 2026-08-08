# XFrame — AI Development Instructions

## Project

XFrame is a .NET 10 Aspire application for managing projects and 3D assemblies for companies that manufacture aluminum/PVC frames, windows and doors.

The solution currently contains:

- XFrame.AppHost
- XFrame.ApiService
- XFrame.ServiceDefaults
- XFrame.Web
- XFrame.Tests

Follow the existing solution architecture before introducing new abstractions.

## Technology

- .NET 10
- .NET Aspire 13.x
- Blazor
- Interactive Server
- MudBlazor
- Silk.NET WebGPU
- Browser WebGPU
- Redis through Aspire
- REST API 
- MongoDB
- SQL SERVER
- MSTest
 

## Architecture

Respect project boundaries.

AppHost:
- Aspire orchestration only.
- Do not put application/business logic here.

ApiService:
- REST API.
- API contracts and server-side application behavior belong here when implemented.

ServiceDefaults:
- Shared Aspire infrastructure only.

Web:
- Blazor UI.
- Editor state and browser-side editor orchestration.
- WebGPU runtime integration.

Tests:
- MSTest and Aspire integration tests.

## Editor

The 3D editor is an assembly editor.

Objects represent components used to construct assemblies for frame-manufacturing projects.

Objects may represent:

- profiles;
- accessories;
- glass;
- panels;
- connectors;
- locks;
- handles;
- hinges;
- other components.

EditorService is the authoritative in-memory editor state.

The WebGPU runtime is a renderer, not the source of truth.

Never maintain an independent persistent Transform state in JavaScript.

The desired state flow is:

Inspector
→ EditorService
→ Runtime
→ WebGPU

and:

Viewport tool
→ EditorService
→ Inspector
→ Runtime
→ WebGPU

Position, Rotation and Scale must remain synchronized.

## WebGPU

The browser WebGPU runtime must consume the current scene state.

Do not allow JavaScript to silently maintain stale object transforms.

Do not solve rendering synchronization problems with arbitrary delays, timers or forced reloads.

Investigate stale state, concurrent rendering and duplicated state first.

## MudBlazor

Use MudBlazor components for UI.

When `Color` conflicts with Silk.NET/WebGPU:

```razor
@using MudColor = MudBlazor.Color
```

Use MudColor whenever referring to the MudBlazor Color enum.

## UI

Prefer responsive MudBlazor layouts.

Do not introduce custom CSS when an existing MudBlazor component or layout can solve the problem.

Do not break the existing EditorLayout, AppBar, Drawer or viewport geometry.

## Authentication

Authentication is intentionally deferred.

Do not implement authentication unless explicitly requested.

## Persistence

The editor is currently in-memory.

Do not introduce MongoDB or SQL Server persistence unless explicitly requested, even that the respective packages are already set up.

The current data model should remain suitable for future REST/API persistence.

General development rules

Before modifying code:

Inspect the existing implementation.
Identify the current source of truth.
Follow existing abstractions.
Prefer the smallest correct change.
Avoid speculative architecture.
Avoid duplicate state.
Avoid unnecessary new dependencies.
Build the solution after changes.
Test the affected behavior.

Never claim a feature is complete only because the project builds.

