---
name: XFrame Web
description: Instructions for Blazor, MudBlazor, editor and WebGPU code.
applyTo: "src/XFrame.Web/**/*"
---

# XFrame.Web

This project is a .NET 10 Blazor Interactive Server application.

## DI

Services are registered in Program.cs.

Follow the existing service abstractions:

- `Services/Abstract`
- `Services/Concrete`

Do not bypass an existing interface unless there is a concrete reason.

## Blazor

The application uses Interactive Server.

Interactive components require the appropriate render mode.

If a component renders correctly but events do not execute, verify the component render mode before changing the UI implementation.

## MudBlazor

Use MudBlazor components for UI.

Always account for the existing Silk.NET `Color` conflict:

```razor
@using MudColor = MudBlazor.Color
```

Use:

```razor
Color="MudColor.Primary"
```

instead of ambiguous Color.

## Editor

The editor is an assembly editor.

The hierarchy, Inspector and viewport represent the same editor state.

Do not create independent state copies for:

hierarchy;
inspector;
viewport;
JavaScript renderer.

Transform synchronization

EditorService owns the current Transform.

Position, Rotation and Scale changes from the Inspector must immediately affect the viewport.

Transform changes from viewport tools must immediately affect the Inspector.

Avoid:

stale snapshots;
duplicated Transform objects;
asynchronous rollback;
timers;
arbitrary delays.

## WebGPU

The browser runtime is implemented through:

IEditor3dRuntime
BrowserWebGpuRuntime
xframe-webgpu.js

Keep the boundary explicit:

## Blazor/C#:

scene state;
editor state;
object metadata;
interaction state.

## JavaScript:

WebGPU resource management;
rendering;
browser pointer/canvas integration where required.

JavaScript must not become the authoritative scene state.

## Camera

Existing behavior:

right mouse button → camera orbit;
scroll → zoom.

Middle mouse button may be used for viewport pan when explicitly implemented, but must not break right-button orbit or scroll zoom.

## Editor tools

Tools operate on the selected hierarchy object only.

Current tools:

Select
Translate
Rotate
Camera / View

Future tools must preserve the selected object's Transform in EditorService.

## Import

Model importers must remain extensible.

Adding a new format should preferably add an importer rather than modifying unrelated editor behavior.

## UI/UX

Do not allow overlays to block the canvas unless they are intended to receive the pointer event.

Decorative overlays may use:

```css
pointer-events: none;
```

but interactive gizmos must remain interactive.

Do not use arbitrary CSS changes that alter the established AppBar/Drawer/viewport geometry without checking the complete layout.

## Razor component-local styles

Do not rely on `.razor.css` files for page/component-specific editor styling in this project.

Page- or component-specific CSS must be placed in a `<style>...</style>` block at the end of the corresponding `.razor` file, after the closing `@code { ... }` block.

Use `app.css` only for genuinely global styles shared by multiple pages/components.

Do not move page-local styles into `app.css` merely to make them load.
