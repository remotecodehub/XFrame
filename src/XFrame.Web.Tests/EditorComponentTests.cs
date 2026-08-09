namespace XFrame.Web.Tests;

[TestClass]
public sealed class EditorComponentTests
{
    [TestMethod]
    public void EditorRendersCanvasAndSelectedObjectTransform()
    {
        using var context = new BunitContext();
        var editor = new EditorService(null);
        var imported = new ImportedModel(
            "obj",
            new RuntimeMesh(
                [-1, -1, 0, 1, -1, 0, 0, 1, 0],
                [0, 1, 2]),
            new System.Numerics.Vector3(2, 2, 0));
        var item = editor.AddImportedObject(
            imported,
            new ImportedObjectMetadata(
                "Test piece",
                "TEST-001",
                ComponentCategory.Profile,
                "Test",
                "Raw",
                "Default",
                new System.Numerics.Vector3(2, 2, 0)),
            "test.obj");
        item.Transform.Position = new System.Numerics.Vector3(10, 20, 30);
        item.Transform.Rotation = new System.Numerics.Vector3(1, 2, 3);

        context.Services.AddMudServices();
        context.Services.AddSingleton<IEditorService>(editor);
        context.Services.AddSingleton<IEditor3dRuntime, TestEditor3dRuntime>();
        context.Services.AddSingleton<ILocalizer, TestLocalizer>();
        context.Services.AddSingleton<IStorageService, TestStorageService>();
        context.Services.AddSingleton<AuthenticationStateProvider, TestAuthenticationStateProvider>();

        var cut = context.Render<Editor>();

        Assert.IsNotNull(cut.Find("canvas#xframe-3d-canvas.runtime-canvas"));
        StringAssert.Contains(cut.Markup, "Test piece");
        StringAssert.Contains(cut.Markup, "10");
        StringAssert.Contains(cut.Markup, "20");
        StringAssert.Contains(cut.Markup, "30");
    }

    private sealed class TestEditor3dRuntime : IEditor3dRuntime
    {
        public bool IsInitialized { get; private set; }
        public event EventHandler<RuntimeObjectPickedEventArgs>? ObjectPicked;
        public event EventHandler<RuntimeTransformPreviewEventArgs>? TransformPreview;
        public event EventHandler<RuntimeTransformPreviewAbsoluteEventArgs>? TransformPreviewAbsolute;
        public event EventHandler<RuntimeTransformCommittedEventArgs>? TransformCommitted;

        public Task InitializeAsync(string canvasId, CancellationToken cancellationToken = default) { IsInitialized = true; return Task.CompletedTask; }
        public Task SetInteractionModeAsync(EditorTool tool, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RenderAsync(IReadOnlyCollection<RuntimeSceneObject> objects, Guid? selectedObjectId = null, EditorTool tool = EditorTool.Select, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task ResizeAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class TestLocalizer : ILocalizer
    {
        public string this[string key] => key;
    }

    private sealed class TestStorageService : IStorageService
    {
        public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
        public Task SetAsync<T>(string key, T data) => Task.CompletedTask;
    }

    private sealed class TestAuthenticationStateProvider : AuthenticationStateProvider
    {
        private static readonly System.Security.Claims.ClaimsPrincipal Anonymous = new(new System.Security.Claims.ClaimsIdentity());
        public override Task<AuthenticationState> GetAuthenticationStateAsync() => Task.FromResult(new AuthenticationState(Anonymous));
    }
}
