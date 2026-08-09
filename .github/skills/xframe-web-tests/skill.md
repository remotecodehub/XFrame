# XFrame Web Tests

Use this skill when creating or extending tests for `src/XFrame.Web` and the Blazor/bUnit test project.

## Test project

The dedicated Blazor test project is `src/XFrame.Web.Tests` and uses .NET 10, bUnit, MSTest and MudBlazor.

## 3D model test resources

Tests that require real 3D models must load them from the test project's `Resources/Models` directory.

Use this structure:

```text
Resources/
└── Models/
    └── <ModelName>/
        ├── <variation-or-file>.obj
        ├── <variation-or-file>.<future-format>
        └── Textures/
            ├── <texture-file>
            └── ...
```

`<ModelName>` identifies the logical model. Multiple files in the directory are variations of that model and/or alternate formats intended for future importer coverage.

Textures for a model always belong under:

```text
Resources/Models/<ModelName>/Textures/
```

Do not hard-code repository-relative paths in tests. Resolve resources from the test assembly base directory or another deterministic test-resource root.

## Model loading guidance

When a test needs geometry, prefer the actual model resource over a synthetic mesh when the behavior under test depends on importing, bounds, UVs, materials, textures, or renderer integration.

Synthetic geometry remains appropriate for isolated unit tests that do not exercise model loading.

## Test isolation

Do not make tests depend on a particular model being selected by another test. Each test must establish its own editor state and resource path.

Keep WebGPU/browser integration concerns isolated from bUnit component tests. bUnit tests should mock `IEditor3dRuntime` unless the test explicitly targets the JavaScript/runtime boundary.

## Transform tests

For Transform and Rotate tests, validate both directions:

- viewport/runtime transform -> EditorService/Inspector state;
- Inspector transform -> runtime/viewport state.

Always verify that X, Y and Z values that were not modified remain unchanged.

When testing multiple objects, verify transforms are stored per object and selecting another hierarchy item does not overwrite the previous object's transform.
