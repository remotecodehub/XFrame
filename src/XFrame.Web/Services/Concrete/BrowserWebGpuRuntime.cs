using System.Text.Json;
using System.Numerics;
using Microsoft.JSInterop;
using XFrame.Web.Services.Abstract;

namespace XFrame.Web.Services.Concrete;

public sealed class BrowserWebGpuRuntime(IJSRuntime js) : IEditor3dRuntime
{
    private IJSObjectReference? _module;
    private DotNetObjectReference<RuntimeCallbacks>? _callbacks;
    private string? _canvasId;
    public bool IsInitialized { get; private set; }
    public event EventHandler<RuntimeObjectPickedEventArgs>? ObjectPicked;
    public event EventHandler<RuntimeTransformCommittedEventArgs>? TransformCommitted;

    public async Task InitializeAsync(string canvasId, CancellationToken cancellationToken = default)
    {
        if (IsInitialized && _canvasId == canvasId) return;
        _module = await js.InvokeAsync<IJSObjectReference>("import", cancellationToken, "./js/xframe-webgpu.js");
        _callbacks = DotNetObjectReference.Create(new RuntimeCallbacks(this));
        await _module.InvokeVoidAsync("initialize", cancellationToken, canvasId, _callbacks);
        _canvasId = canvasId;
        IsInitialized = true;
    }

    public async Task SetInteractionModeAsync(EditorTool tool, CancellationToken cancellationToken = default)
    {
        if (_module is not null) await _module.InvokeVoidAsync("setTool", cancellationToken, tool.ToString());
    }

    public async Task RenderAsync(IReadOnlyCollection<RuntimeSceneObject> objects, Guid? selectedObjectId = null, EditorTool tool = EditorTool.Select, CancellationToken cancellationToken = default)
    {
        if (_module is null) return;
        await _module.InvokeVoidAsync("render", cancellationToken, JsonSerializer.Serialize(new { Objects = objects, SelectedObjectId = selectedObjectId, Tool = tool.ToString() }));
    }

    public async Task ResizeAsync(CancellationToken cancellationToken = default)
    {
        if (_module is not null) await _module.InvokeVoidAsync("resize", cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        IsInitialized = false;

        var module = _module;
        _module = null;
        _canvasId = null;
        _callbacks?.Dispose();
        _callbacks = null;

        if (module is null)
            return;

        try
        {
            await module.InvokeVoidAsync("dispose");
        }
        catch (JSDisconnectedException)
        {
            // O circuito já foi desconectado.
            // Os recursos JS serão descartados pelo browser.
        }
        catch (ObjectDisposedException)
        {
            // O módulo JS já foi descartado.
        }
        finally
        {
            try
            {
                await module.DisposeAsync();
            }
            catch (JSDisconnectedException)
            {
                // Normal durante o encerramento de um circuito Blazor Server.
            }
            catch (ObjectDisposedException)
            {
                // Já descartado.
            }
        }
    }

    private void RaisePicked(Guid id) => ObjectPicked?.Invoke(this, new RuntimeObjectPickedEventArgs(id));
    private void RaiseTransformCommitted(Guid id, EditorTransform transform) => TransformCommitted?.Invoke(this, new RuntimeTransformCommittedEventArgs(id, transform));

    private sealed class RuntimeCallbacks(BrowserWebGpuRuntime owner)
    {
        [JSInvokable]
        public void OnObjectPicked(string objectId)
        {
            if (Guid.TryParse(objectId, out var id)) owner.RaisePicked(id);
        }

        [JSInvokable]
        public void OnTransformCommitted(string objectId, float px, float py, float pz, float rx, float ry, float rz, float sx, float sy, float sz)
        {
            if (Guid.TryParse(objectId, out var id))
            {
                var transform = new EditorTransform
                {
                    Position = new System.Numerics.Vector3(px, py, pz),
                    Rotation = new System.Numerics.Vector3(rx, ry, rz),
                    Scale = new System.Numerics.Vector3(sx, sy, sz)
                };
                owner.RaiseTransformCommitted(id, transform);
            }
        }
    }
}
 
