---
name: xframe-editor
description: Work on the XFrame 3D assembly editor, including EditorService, hierarchy, Inspector, model import, object metadata, Transform synchronization and editor tools.
---

# XFrame Editor Skill

Use this skill whenever the task concerns the XFrame 3D assembly editor.

## Domain

XFrame is intended to manage assemblies for companies that manufacture windows, doors and other frames.

Editor objects represent physical assembly components.

Examples:

- profiles;
- accessories;
- glass;
- locks;
- handles;
- hinges;
- connectors;
- panels.

## Current architecture

The editor is currently in-memory.

Persistence is future work.

Do not introduce MongoDB or SQL Server unless explicitly requested.

The editor must remain suitable for future REST persistence.

## State

`EditorService` is the source of truth.

Do not create parallel persistent state in:

- Razor components;
- JavaScript;
- WebGPU.

The Transform must remain synchronized:

Inspector
↕
EditorService
↕
Viewport

## Transform

Position, Rotation and Scale belong to the editor object's Transform.

If Inspector changes Transform:

1. update EditorService;
2. notify state;
3. render current state.

If a viewport tool changes Transform:

1. update EditorService;
2. notify state;
3. Inspector reflects the state;
4. render current state.

Never restore a previous Transform after MouseUp.

## Tools

Translate and Rotate operate only on the selected hierarchy object.

Translate:
- one axis at a time;
- smooth movement;
- update Position continuously.

Rotate:
- one axis at a time;
- smooth rotation;
- update Rotation continuously;
- preserve final rotation after MouseUp.

Do not use cumulative mouse deltas against the current Transform when an initial Transform + calculated delta is more stable.

## Rendering

The WebGPU runtime renders the state supplied by C#.

If a transform is correct in EditorService but incorrect visually:

inspect the complete chain:

EditorService
→ RuntimeSceneObject
→ BrowserWebGpuRuntime
→ JavaScript
→ Model Matrix
→ WebGPU

Do not fix rendering problems by modifying Inspector state.

## Debugging

When a viewport tool appears to work but the object reverts:

check for:

- stale scene snapshots;
- multiple RenderAsync calls;
- render race conditions;
- old Transform references;
- MouseUp restoring initial state;
- JavaScript-owned transform state.

When Inspector changes do not affect the viewport:

check:

- StateChanged;
- RenderScene;
- RuntimeSceneObject creation;
- JSON serialization;
- JavaScript Model Matrix.

Do not add delays or timers as a workaround.

## Import

Model import must remain extensible.

Adding support for a new format should preferably add an importer implementation rather than modifying a central service with format-specific branching.

## UI

Use MudBlazor.

The existing alias is:

`@using MudColor = MudBlazor.Color`

Use `MudColor` when referring to MudBlazor's Color enum.

## Validation

Build the solution after changes.

For rendering changes, compilation is insufficient: validate the actual scene behavior.