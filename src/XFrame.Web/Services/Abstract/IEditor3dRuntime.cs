namespace XFrame.Web.Services.Abstract;

public interface IEditor3dRuntime : IAsyncDisposable
{
    bool IsInitialized { get; }
    event EventHandler<RuntimeObjectPickedEventArgs>? ObjectPicked;
    event EventHandler<RuntimeTransformChangedEventArgs>? TransformChanged;
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

public sealed class RuntimeTransformChangedEventArgs(Guid objectId, TransformAxis axis, System.Numerics.Vector3 position, System.Numerics.Vector3 rotation) : EventArgs
{
    public Guid ObjectId { get; } = objectId;
    public TransformAxis Axis { get; } = axis;
    public System.Numerics.Vector3 Position { get; } = position;
    public System.Numerics.Vector3 Rotation { get; } = rotation;
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
