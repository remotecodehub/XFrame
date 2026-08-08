using System.Numerics;

namespace XFrame.Web.Services.Abstract;

public interface IEditorService
{
    EditorAssembly? CurrentAssembly { get; }
    EditorObject? SelectedObject { get; }
    IReadOnlyList<EditorObject> Objects { get; }
    EditorTool ActiveTool { get; }
    event EventHandler? StateChanged;

    void NewAssembly(string? name = null);
    EditorObject AddObject(string name, ComponentCategory category = ComponentCategory.Other,
        Guid? parentId = null, string? componentCode = null);
    EditorObject AddImportedObject(ImportedModel model, ImportedObjectMetadata metadata, string fileName, Guid? parentId = null);
    bool RemoveObject(Guid objectId);
    void SelectObject(Guid? objectId);
    void UpdateObject(EditorObject editorObject);
    void SetActiveTool(EditorTool tool);
}

public enum EditorTool { Select, Translate, Rotate, Camera }
public enum TransformAxis { None, X, Y, Z }
public enum TransformPlane { XY, XZ, YZ }

/// <summary>OBJ coordinates are interpreted as editor units; the current domain unit is millimeter.</summary>
public static class EditorUnits
{
    public const string DimensionSymbol = "mm";
    public const float WorldUnitsPerMillimeter = 1f;
}

public enum ComponentCategory
{
    Profile,
    Accessory,
    Glass,
    Frame,
    Sash,
    Transom,
    Mullion,
    Hardware,
    Panel,
    Seal,
    Fastener,
    Other
}

public sealed class EditorAssembly
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = "Novo assembly";
    public string Description { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<EditorObject> Objects { get; } = [];
}

public sealed class EditorObject
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ComponentCode { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ComponentCategory Category { get; set; }
    public int Quantity { get; set; } = 1;
    public string Profile { get; set; } = string.Empty;
    public string ProfileMaterial { get; set; } = string.Empty;
    public string Finish { get; set; } = string.Empty;
    public Vector3 Dimensions { get; set; }
    public EditorTransform Transform { get; set; } = new();
    public GeometrySource? Geometry { get; set; }
    public MaterialSource Material { get; set; } = new();
    public Dictionary<string, string> Metadata { get; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class EditorTransform
{
    public Vector3 Position { get; set; }
    public Vector3 Rotation { get; set; }
    public Vector3 Scale { get; set; } = Vector3.One;
}

public sealed class GeometrySource
{
    public string? SourceFileName { get; init; }
    public string? Format { get; init; }
    public string? MeshIdentifier { get; init; }
    public Vector3 Bounds { get; init; }
    public float[]? Positions { get; init; }
    public uint[]? Indices { get; init; }
    public float[]? Uvs { get; init; }
}

public sealed class MaterialSource
{
    public string Name { get; set; } = "Padrão";
    public string? BaseColor { get; set; }
    public TextureSource? Texture { get; set; }
    public Dictionary<string, string> Textures { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, double> Properties { get; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed record TextureSource(string FileName, string Format, byte[] Data);
