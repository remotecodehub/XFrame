using System.Text.Json;
using Microsoft.JSInterop;
using XFrame.Web.Services.Abstract;

namespace XFrame.Web.Services.Concrete;

public sealed class BrowserWebGpuRuntime(IJSRuntime js, ILogger<BrowserWebGpuRuntime> logger) : IEditor3dRuntime
{
    private readonly ILogger<BrowserWebGpuRuntime> _logger = logger;
    private IJSObjectReference? _module;
    private IJSObjectReference? _transformModule;
    private DotNetObjectReference<RuntimeCallbacks>? _callbacks;
    private string? _canvasId;
    private EditorTool? _interactionMode;
    public bool IsInitialized { get; private set; }
    public event EventHandler<RuntimeObjectPickedEventArgs>? ObjectPicked;
    public event EventHandler<RuntimeTransformPreviewEventArgs>? TransformPreview;
    public event EventHandler<RuntimeTransformCommittedEventArgs>? TransformCommitted;
    public event EventHandler<RuntimeTransformPreviewAbsoluteEventArgs>? TransformPreviewAbsolute;

    public async Task InitializeAsync(string canvasId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Initialize runtime for canvas {CanvasId}", canvasId);
        if (IsInitialized && _canvasId == canvasId) return;
        _module = await js.InvokeAsync<IJSObjectReference>("import", cancellationToken, "./js/xframe-webgpu.js");
        _transformModule = await js.InvokeAsync<IJSObjectReference>("import", cancellationToken, "./js/xframe-transform-interaction.js");
        _callbacks = DotNetObjectReference.Create(new RuntimeCallbacks(this));
        await _module.InvokeVoidAsync("initialize", cancellationToken, canvasId, _callbacks);
        await _transformModule.InvokeVoidAsync("initialize", cancellationToken, canvasId, _callbacks);
        _canvasId = canvasId;
        IsInitialized = true;
        _logger.LogInformation("Runtime initialized for canvas {CanvasId}", canvasId);
    }

    public async Task SetInteractionModeAsync(EditorTool tool, CancellationToken cancellationToken = default)
    {
        if (_module is null || _interactionMode == tool) return;
        _interactionMode = tool;
        await _module.InvokeVoidAsync("setTool", cancellationToken, tool.ToString());
        if (_transformModule is not null) await _transformModule.InvokeVoidAsync("setTool", cancellationToken, tool.ToString());
    }

    public async Task RenderAsync(IReadOnlyCollection<RuntimeSceneObject> objects, Guid? selectedObjectId = null, EditorTool tool = EditorTool.Select, CancellationToken cancellationToken = default)
    {
        if (_module is null) return;
        var payload = JsonSerializer.Serialize(new { Objects = objects, SelectedObjectId = selectedObjectId, Tool = tool.ToString() });
        await _module.InvokeVoidAsync("render", cancellationToken, payload);
        if (_transformModule is not null) await _transformModule.InvokeVoidAsync("setScene", cancellationToken, payload);
    }

    public async Task ResizeAsync(CancellationToken cancellationToken = default)
    {
        if (_module is not null) await _module.InvokeVoidAsync("resize", cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        IsInitialized = false;
        var module = _module;
        var transformModule = _transformModule;
        _module = null;
        _transformModule = null;
        _canvasId = null;
        _interactionMode = null;
        _callbacks?.Dispose();
        _callbacks = null;
        if (transformModule is not null)
        {
            try { await transformModule.InvokeVoidAsync("dispose"); } catch (JSDisconnectedException) { } catch (ObjectDisposedException) { }
            try { await transformModule.DisposeAsync(); } catch (JSDisconnectedException) { } catch (ObjectDisposedException) { }
        }
        if (module is null) return;
        try { await module.InvokeVoidAsync("dispose"); } catch (JSDisconnectedException) { } catch (ObjectDisposedException) { }
        try { await module.DisposeAsync(); } catch (JSDisconnectedException) { } catch (ObjectDisposedException) { }
    }

    private void RaisePicked(Guid id) => ObjectPicked?.Invoke(this, new RuntimeObjectPickedEventArgs(id));
    private void RaiseTransformPreview(Guid id, string kind, string axis, float value) => TransformPreview?.Invoke(this, new RuntimeTransformPreviewEventArgs(id, kind, axis, value));
    private void RaiseTransformCommitted(Guid id, EditorTransform transform) => TransformCommitted?.Invoke(this, new RuntimeTransformCommittedEventArgs(id, transform));
    private void RaiseTransformPreviewAbsolute(Guid id, EditorTransform transform) => TransformPreviewAbsolute?.Invoke(this, new RuntimeTransformPreviewAbsoluteEventArgs(id, transform));

    private sealed class RuntimeCallbacks(BrowserWebGpuRuntime owner)
    {
        [JSInvokable]
        public void OnObjectPicked(string objectId) { if (Guid.TryParse(objectId, out var id)) owner.RaisePicked(id); }

        [JSInvokable]
        public void OnTransformPreview(string objectId, string kind, string axis, float value) { if (Guid.TryParse(objectId, out var id)) owner.RaiseTransformPreview(id, kind, axis, value); }

        [JSInvokable]
        public void OnTransformPreviewAbsolute(string objectId, float px, float py, float pz, float rx, float ry, float rz, float sx, float sy, float sz)
        {
            if (!Guid.TryParse(objectId, out var id)) return;
            var transform = new EditorTransform { Position = new(px, py, pz), Rotation = new(rx, ry, rz), Scale = new(sx, sy, sz) };
            owner._logger.LogDebug("Transform preview {ObjectId}: pos=({Px},{Py},{Pz}) rot=({Rx},{Ry},{Rz})", id, px, py, pz, rx, ry, rz);
            owner.RaiseTransformPreviewAbsolute(id, transform);
            owner.RaiseTransformCommitted(id, transform);
        }

        [JSInvokable]
        public void OnTransformCommitted(string objectId, float px, float py, float pz, float rx, float ry, float rz, float sx, float sy, float sz)
        {
            if (!Guid.TryParse(objectId, out var id)) return;
            var transform = new EditorTransform { Position = new(px, py, pz), Rotation = new(rx, ry, rz), Scale = new(sx, sy, sz) };
            owner._logger.LogInformation("OnTransformCommitted {ObjectId} pos=({Px},{Py},{Pz}) rot=({Rx},{Ry},{Rz})", id, px, py, pz, rx, ry, rz);
            owner.RaiseTransformCommitted(id, transform);
        }
    }
}
