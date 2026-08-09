namespace XFrame.Web.Services.Abstract;

public interface IEditor3dRuntime : IAsyncDisposable
{
    bool IsInitialized { get; }
    event EventHandler<RuntimeObjectPickedEventArgs>? ObjectPicked;
    event EventHandler<RuntimeTransformPreviewEventArgs>? TransformPreview;
    event EventHandler<RuntimeTransformCommittedEventArgs>? TransformCommitted;
    Task InitializeAsync(string canvasId, CancellationToken cancellationToken = default);
    Task SetInteractionModeAsync(EditorTool tool, CancellationToken cancellationToken = default);
    Task RenderAsync(IReadOnlyCollection<RuntimeSceneObject> objects, Guid? selectedObjectId = null, EditorTool tool = EditorTool.Select, CancellationToken cancellationToken = default);
    Task ResizeAsync(CancellationToken cancellationToken = default);
}

public sealed record RuntimeSceneObject(
    Guid Id,
    string Name,
    ComponentCategory Category,
    EditorTransform Transform,
    RuntimeMesh Mesh,
    System.Numerics.Vector3 Bounds,
    MaterialSource Material);

public sealed class RuntimeObjectPickedEventArgs(Guid objectId) : EventArgs
{
    public Guid ObjectId { get; } = objectId;
}

public sealed class RuntimeTransformPreviewEventArgs(Guid objectId, string kind, string axis, float value) : EventArgs
{
    public Guid ObjectId { get; } = objectId;
    // kind: 'pos' | 'rot' | 'scale'
    public string Kind { get; } = kind;
    // axis: 'X' | 'Y' | 'Z'
    public string Axis { get; } = axis;
    public float Value { get; } = value;
}

public sealed class RuntimeTransformCommittedEventArgs(Guid objectId, EditorTransform transform) : EventArgs
{
    public Guid ObjectId { get; } = objectId;
    // The transform is absolute and must replace the EditorObject.Transform when committed.
    public EditorTransform Transform { get; } = transform;
}

public sealed record RuntimeMesh(float[] Positions, uint[] Indices, float[]? Uvs = null)
{
    public bool IsValid => Positions.Length >= 3 && Indices.Length >= 3;
}

public interface IModelImporter
{
    string Format { get; }
    Task<ImportedModel> ImportAsync(Stream source, CancellationToken cancellationToken = default);
}

public sealed record ImportedModel(string Format, RuntimeMesh Mesh, System.Numerics.Vector3 Bounds, TextureSource? Texture = null);

public sealed record ImportedObjectMetadata(
    string Name,
    string ComponentCode,
    ComponentCategory Category,
    string Manufacturer,
    string Finish,
    string Material,
    System.Numerics.Vector3 Dimensions,
    string Description = "",
    TextureSource? Texture = null);
