---
name: xframe-webgpu
description: Debug and extend XFrame browser WebGPU rendering using Silk.NET WebGPU integration and the JavaScript WebGPU runtime.
---

# XFrame WebGPU Skill

Use this skill when modifying WebGPU rendering, canvas interaction, camera, meshes, shaders or the browser runtime.

## Technology

XFrame uses:

- Silk.NET.WebGPU.Extensions.WGPU
- Silk.NET.WebGPU.Native.WGPU
- browser WebGPU APIs
- JavaScript interop

Do not introduce WgpuSharp.

## Boundary

C# owns:

- scene state;
- object metadata;
- Transform;
- selection;
- editor tools.

JavaScript/WebGPU owns:

- GPU resources;
- rendering;
- canvas;
- shaders;
- browser-specific GPU operations.

JavaScript must not become the authoritative source for object Transform.

## Transform pipeline

Every rendered object must derive its Model Matrix from:

- Position;
- Rotation;
- Scale.

Expected conceptual pipeline:

Projection × View × Model

Model must represent the current EditorObject Transform.

## Stale state

If objects visually revert:

inspect:

- RenderAsync concurrency;
- stale serialized scene;
- stale JS arrays;
- old object references;
- render order;
- MouseUp behavior.

Never solve stale rendering with arbitrary delays.

## Canvas interaction

Right mouse button:
- camera orbit.

Scroll:
- zoom.

Left mouse button:
- editor tools.

Do not accidentally let decorative overlays intercept canvas pointer events.

## Resize

Canvas dimensions must follow the actual viewport dimensions.

Resize must not require a full page refresh.

Avoid arbitrary fixed canvas dimensions.

## JS interop

Dispose JS modules defensively.

Blazor Interactive Server circuits may disconnect before disposal.

Do not issue JS interop calls after the circuit has disconnected.

## Debugging

When debugging rendering:

first verify:

1. C# Transform;
2. serialized RuntimeSceneObject;
3. JavaScript received values;
4. Model Matrix;
5. GPU draw.

Do not assume the problem is the mouse tool merely because the visual result is wrong.