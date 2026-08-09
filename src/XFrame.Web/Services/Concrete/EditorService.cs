using XFrame.Web.Services.Abstract;

namespace XFrame.Web.Services.Concrete;

public sealed class EditorService : IEditorService
{
    private readonly ILogger<EditorService>? _logger;
    private EditorAssembly _assembly;
    private EditorObject? _selectedObject;

    public EditorService(ILogger<EditorService>? logger)
    {
        _logger = logger;
        _assembly = new EditorAssembly();
        _logger?.LogInformation("EditorService initialized");
    }

    public EditorAssembly? CurrentAssembly => _assembly;
    public EditorObject? SelectedObject => _selectedObject;
    public IReadOnlyList<EditorObject> Objects => _assembly.Objects;
    public EditorTool ActiveTool { get; private set; } = EditorTool.Select;
    public event EventHandler? StateChanged;

    public void NewAssembly(string? name = null)
    {
        _assembly = new EditorAssembly { Name = string.IsNullOrWhiteSpace(name) ? "Novo assembly" : name.Trim() };
        _selectedObject = null;
        NotifyChanged();
    }

    public EditorObject AddObject(string name, ComponentCategory category = ComponentCategory.Other, Guid? parentId = null, string? componentCode = null)
    {
        var item = new EditorObject { Name = string.IsNullOrWhiteSpace(name) ? "Novo componente" : name.Trim(), Category = category, ParentId = parentId, ComponentCode = componentCode ?? string.Empty };
        _assembly.Objects.Add(item);
        _logger?.LogInformation("AddObject: {Name} id={Id}", item.Name, item.Id);
        SelectObject(item.Id);
        return item;
    }

    public EditorObject AddImportedObject(ImportedModel model, ImportedObjectMetadata metadata, string fileName, Guid? parentId = null)
    {
        var item = new EditorObject
        {
            Name = metadata.Name,
            Category = metadata.Category,
            ParentId = parentId,
            ComponentCode = metadata.ComponentCode,
            Manufacturer = metadata.Manufacturer,
            Finish = metadata.Finish,
            Description = metadata.Description,
            Dimensions = metadata.Dimensions,
            Material = new MaterialSource { Name = metadata.Material, Texture = metadata.Texture },
            Geometry = new GeometrySource { SourceFileName = fileName, Format = model.Format, Bounds = model.Bounds, Positions = model.Mesh.Positions, Indices = model.Mesh.Indices, Uvs = model.Mesh.Uvs }
        };
        _assembly.Objects.Add(item);
        _selectedObject = item;
        _logger?.LogInformation("AddImportedObject: {Name} id={Id} file={File}", item.Name, item.Id, fileName);
        NotifyChanged();
        return item;
    }

    public bool RemoveObject(Guid objectId)
    {
        var removed = _assembly.Objects.RemoveAll(x => x.Id == objectId || x.ParentId == objectId) > 0;
        if (!removed) return false;
        _logger?.LogInformation("RemoveObject: id={Id}", objectId);
        if (_selectedObject?.Id == objectId) _selectedObject = null;
        NotifyChanged();
        return true;
    }

    public void SelectObject(Guid? objectId)
    {
        _selectedObject = objectId is null ? null : _assembly.Objects.FirstOrDefault(x => x.Id == objectId);
        _logger?.LogInformation("SelectObject: {Id}", objectId);
        NotifyChanged();
    }

    public void UpdateObject(EditorObject editorObject)
    {
        _assembly.UpdatedAt = DateTime.UtcNow;
        _logger?.LogInformation("UpdateObject: id={Id} pos=({X},{Y},{Z}) rot=({Rx},{Ry},{Rz})", editorObject.Id, editorObject.Transform.Position.X, editorObject.Transform.Position.Y, editorObject.Transform.Position.Z, editorObject.Transform.Rotation.X, editorObject.Transform.Rotation.Y, editorObject.Transform.Rotation.Z);
        NotifyChanged();
    }

    public void UpdateTransformPreview(Guid objectId, EditorTransform transform)
    {
        var item = _assembly.Objects.FirstOrDefault(x => x.Id == objectId);
        if (item is null) return;
        item.Transform = CloneTransform(transform);
        _logger?.LogDebug("UpdateTransformPreview: id={Id} pos=({X},{Y},{Z}) rot=({Rx},{Ry},{Rz})", objectId, transform.Position.X, transform.Position.Y, transform.Position.Z, transform.Rotation.X, transform.Rotation.Y, transform.Rotation.Z);
    }

    public void SetActiveTool(EditorTool tool)
    {
        if (ActiveTool == tool) return;
        ActiveTool = tool;
        NotifyChanged();
    }

    private void NotifyChanged()
    {
        _assembly.UpdatedAt = DateTime.UtcNow;
        StateChanged?.Invoke(this, EventArgs.Empty);
    }

    private static EditorTransform CloneTransform(EditorTransform source) => new() { Position = source.Position, Rotation = source.Rotation, Scale = source.Scale };
}
