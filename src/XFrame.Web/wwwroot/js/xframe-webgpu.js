let canvas, device, context, pipeline, texturedPipeline, gizmoPipeline, depthTexture, resizeObserver, dotnet;
let scene = { Objects: [], SelectedObjectId: null }, hasFramed = false;
let interactionTool = 'Select';
let gizmoHoverAxis = 'None', gizmoActiveAxis = 'None', gizmoVertex, gizmoUniform, gizmoBindGroup;
let gizmoComponents = [];
let renderSequence = 0;
const gizmoLabels = new Map();
let cameraViewCube = null;
const GIZMO_VISUAL_SCALE = 0.24;
// Hit area intentionally wider than the visual line for reliable axis selection.
const GIZMO_HIT_TOLERANCE = 0.14;
const TRANSLATION_SENSITIVITY = 0.6; // translation scale factor
const ROTATION_SENSITIVITY = 0.2;    // rotation scale factor (degrees per interaction unit)
const geometryBuffers = new Map();
const textureResources = new Map();
const camera = { target: [0, 0, 0], distance: 6, yaw: 0, pitch: 0.35, fov: Math.PI / 3 };
const pointer = { left: false, right: false, drag: null, orbit: null };
// Unified tool controller: single temporary interaction state (non-authoritative)
const toolController = {
    activeTool: null,
    activeObjectId: null,
    activeAxis: 'None',
    pointerStart: null,
    lastPointer: null,
    dragStartTransform: null,
    lastPreviewTransform: null,
    isDragging: false,
    dragData: null
};

const shader = `
struct Uniforms { modelViewProjection: mat4x4<f32>, color: vec4f };
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
struct VOut { @builtin(position) position: vec4f };
@vertex fn vs(@location(0) position: vec3f) -> VOut {
    var output: VOut;
    output.position = uniforms.modelViewProjection * vec4f(position, 1.0);
    return output;
}
@fragment fn fs() -> @location(0) vec4f { return uniforms.color; }
`;
const texturedShader = `
struct Uniforms { modelViewProjection: mat4x4<f32>, color: vec4f };
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var modelTexture: texture_2d<f32>;
struct VOut { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@location(0) position: vec3f, @location(1) uv: vec2f) -> VOut { var output: VOut; output.position = uniforms.modelViewProjection * vec4f(position, 1.0); output.uv = uv; return output; }
@fragment fn fs(input: VOut) -> @location(0) vec4f { return textureSample(modelTexture, textureSampler, input.uv) * uniforms.color; }
`;

export async function initialize(id, callback) {
    console.info('[xframe] initialize', { id });
    canvas = document.getElementById(id);
    dotnet = callback;
    if (!canvas) { console.error('[xframe] initialize: canvas not found', { id }); throw new Error(`Canvas '${id}' não encontrado.`); }
    if (!navigator.gpu) { console.error('[xframe] initialize: WebGPU not available'); throw new Error('WebGPU não está disponível neste navegador.'); }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { console.error('[xframe] initialize: no adapter'); throw new Error('Nenhum adaptador WebGPU encontrado.'); }
    device = await adapter.requestDevice();
    context = canvas.getContext('webgpu');
    if (!context) { console.error('[xframe] initialize: getContext failed'); throw new Error('Não foi possível obter o contexto WebGPU.'); }
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    console.info('[xframe] initialize: complete');
    pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({ code: shader }),
            entryPoint: 'vs',
            buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }]
        },
        fragment: { module: device.createShaderModule({ code: shader }), entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list', cullMode: 'none' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' }
    });
    texturedPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: device.createShaderModule({ code: texturedShader }), entryPoint: 'vs', buffers: [{ arrayStride: 20, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x2' }] }] },
        fragment: { module: device.createShaderModule({ code: texturedShader }), entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list', cullMode: 'none' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' }
    });
    gizmoPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: device.createShaderModule({ code: shader }), entryPoint: 'vs', buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }] },
        fragment: { module: device.createShaderModule({ code: shader }), entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'line-list' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' }
    });
    gizmoUniform = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    gizmoBindGroup = device.createBindGroup({ layout: gizmoPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: gizmoUniform } }] });
    canvas.addEventListener('contextmenu', preventContextMenu);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    canvas.addEventListener('lostpointercapture', pointerUp);
    canvas.addEventListener('wheel', wheel, { passive: false });
    console.info('[xframe] event listeners attached');
    createCameraViewCube();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
}

export function resize() {
    if (!canvas || !context || !device) return;
    const d = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * d));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * d));
    depthTexture?.destroy();
    depthTexture = device.createTexture({ size: [canvas.width, canvas.height, 1], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
    render(JSON.stringify(scene));
}

export function setTool(tool) {
    const nextTool = tool || 'Select';
    if (interactionTool === nextTool) return;
    interactionTool = nextTool;
    gizmoHoverAxis = 'None';
    gizmoActiveAxis = 'None'; // end any active drag when tool changes
    pointer.drag = null;
    // update unified controller
    toolController.activeTool = interactionTool;
    toolController.isDragging = false;
    toolController.activeAxis = 'None';
    toolController.activeObjectId = null;
    toolController.dragData = null;
    toolController.lastPreviewTransform = null;
    if (cameraViewCube) cameraViewCube.style.display = interactionTool === 'Camera' ? 'grid' : 'none';
}

export async function render(json) {
    if (!device || !context || !pipeline || !depthTexture) return;
    const sequence = ++renderSequence;
    const incoming = JSON.parse(json);
    // During an active drag session, do not allow an incoming snapshot to overwrite the object currently being edited.
    if (toolController.isDragging && toolController.activeObjectId && Array.isArray(incoming.Objects)) {
        // If the selection changed on the server side, cancel the drag and accept the incoming snapshot.
        if (incoming.SelectedObjectId && incoming.SelectedObjectId !== toolController.activeObjectId) {
            // Cancel drag: clear controller and accept incoming scene
            toolController.isDragging = false;
            toolController.dragData = null;
            toolController.activeAxis = 'None';
            toolController.activeObjectId = null;
            scene = incoming;
        } else {
            const id = toolController.activeObjectId;
            const incomingIndex = incoming.Objects.findIndex(o => o.Id === id);
            const currentObj = (scene.Objects || []).find(o => o.Id === id);
            // Accept the incoming scene for all objects, but preserve the preview transform for the active object so the drag is uninterrupted.
            scene = incoming;
            if (incomingIndex >= 0 && currentObj) {
                scene.Objects[incomingIndex].__previewTransform = currentObj.__previewTransform;
            }
        }
    } else {
        scene = incoming;
    }
    interactionTool = scene.Tool || interactionTool;
    if (!hasFramed && scene.Objects?.length) { frameScene(); hasFramed = true; }
    const viewProjection = getViewProjection(canvas.width / Math.max(1, canvas.height));
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0.035, g: 0.045, b: 0.07, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
        depthStencilAttachment: { view: depthTexture.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' }
    });
    for (const object of scene.Objects || []) {
        const geometry = object.Mesh;
        if (!geometry?.Positions?.length || !geometry?.Indices?.length) continue;
        const texture = await getTextureResource(object);
        if (sequence !== renderSequence) { pass.end(); return; }
        const textured = texture !== null && object.Mesh.Uvs?.length === (object.Mesh.Positions.length / 3) * 2;
        const resources = getGeometryResources(object, textured, texture);
        if (!resources) continue;
        const matrix = getObjectViewProjection(object, viewProjection);
        const selected = object.Id === scene.SelectedObjectId;
        const color = selected ? [1.0, 0.78, 0.12, 1.0] : categoryColor(object.Category);
        device.queue.writeBuffer(resources.uniform, 0, new Float32Array([...matrix, ...color]));
        pass.setPipeline(textured ? texturedPipeline : pipeline);
        pass.setBindGroup(0, resources.bindGroup);
        pass.setVertexBuffer(0, resources.vertex);
        pass.setIndexBuffer(resources.index, resources.indexFormat);
        pass.drawIndexed(resources.indexCount, 1, 0, 0, 0);
    }
    renderGizmo(pass, viewProjection);
    pass.end();
    device.queue.submit([encoder.finish()]);
}

function renderGizmo(pass, viewProjection) {
    if ((interactionTool !== 'Translate' && interactionTool !== 'Rotate') || !scene.SelectedObjectId || !gizmoPipeline || !gizmoUniform) { hideGizmoLabels(); return; }
    const selected = scene.Objects?.find(object => object.Id === scene.SelectedObjectId);
    if (!selected) { hideGizmoLabels(); return; }
    const center = vectorValue(selected.__previewTransform?.Position ?? selected.Transform?.Position);
    const size = Math.max(camera.distance * GIZMO_VISUAL_SCALE, 0.01);
    const arrow = size * 0.12;
    const ends = { X: [center[0] + size, center[1], center[2]], Y: [center[0], center[1] + size, center[2]], Z: [center[0], center[1], center[2] + size] };
    const thickness = Math.max(size * 0.018, 0.004);
    const cameraForward = normalize(subtract(camera.target, getCameraPosition()));
    const upReference = Math.abs(dot(cameraForward, [0, 0, 1])) > 0.98 ? [0, 1, 0] : [0, 0, 1];
    const viewRight = normalize(cross(cameraForward, upReference));
    const viewUp = normalize(cross(viewRight, cameraForward));
    gizmoComponents = ['X', 'Y', 'Z'].map(axis => {
        const end = ends[axis];
        const perpendicular = normalize(cross(axisVector(axis), normalize(add(viewRight, viewUp))));
        const offset = multiply(perpendicular, thickness);
        const arrowPoints = axis === 'X'
            ? [[end[0] - arrow, end[1] + arrow, end[2]], [end[0] - arrow, end[1] - arrow, end[2]]]
            : axis === 'Y'
                ? [[end[0] + arrow, end[1] - arrow, end[2]], [end[0] - arrow, end[1] - arrow, end[2]]]
                : [[end[0] + arrow, end[1], end[2] - arrow], [end[0] - arrow, end[1], end[2] - arrow]];
        return {
            axis,
            start: [...center],
            end: [...end],
            positions: [...center, ...end, ...add(center, offset), ...add(end, offset), ...add(center, multiply(offset, -1)), ...add(end, multiply(offset, -1)), ...end, ...arrowPoints[0], ...end, ...arrowPoints[1]]
        };
    });
    const positions = gizmoComponents.flatMap(component => component.positions);
    if (!gizmoVertex || gizmoVertex.size !== positions.length * 4) {
        gizmoVertex?.buffer.destroy();
        gizmoVertex = { buffer: device.createBuffer({ size: positions.length * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }), size: positions.length * 4 };
    }
    device.queue.writeBuffer(gizmoVertex.buffer, 0, new Float32Array(positions));
    pass.setPipeline(gizmoPipeline);
    pass.setBindGroup(0, gizmoBindGroup);
    pass.setVertexBuffer(0, gizmoVertex.buffer);
    let vertexOffset = 0;
    for (let i = 0; i < gizmoComponents.length; i++) {
        const axis = gizmoComponents[i].axis;
        const color = axis === gizmoActiveAxis || axis === gizmoHoverAxis ? [1, 1, 0, 1] : axisColor(axis);
        device.queue.writeBuffer(gizmoUniform, 0, new Float32Array([...viewProjection, ...color]));
        const vertexCount = gizmoComponents[i].positions.length / 3;
        pass.draw(vertexCount, 1, vertexOffset, 0);
        vertexOffset += vertexCount;
    }
    updateGizmoLabels(center, size);
}

function updateGizmoLabels(center, size) {
    for (const axis of ['X', 'Y', 'Z']) {
        let label = gizmoLabels.get(axis);
        if (!label) {
            label = document.createElement('span');
            label.textContent = axis;
            label.style.position = 'absolute';
            label.style.pointerEvents = 'none';
            label.style.fontWeight = '700';
            label.style.fontSize = '14px';
            label.style.textShadow = '0 0 3px #000';
            canvas.parentElement?.appendChild(label);
            gizmoLabels.set(axis, label);
        }
        const point = project(add(center, multiply(axisVector(axis), size * 1.08)));
        if (!point) { label.style.display = 'none'; continue; }
        label.style.display = 'block';
        label.style.left = `${point[0] - 4}px`;
        label.style.top = `${point[1] - 10}px`;
        label.style.color = axis === gizmoActiveAxis || axis === gizmoHoverAxis ? '#fff700' : cssAxisColor(axis);
    }
}
function hideGizmoLabels() { for (const label of gizmoLabels.values()) label.style.display = 'none'; }
function cssAxisColor(axis) { return axis === 'X' ? '#ff4444' : axis === 'Y' ? '#44dd66' : '#4488ff'; }

function getGeometryResources(object, textured, texture) {
    const key = `${object.Id}:${textured ? 'textured' : 'basic'}`;
    const positions = object.Mesh.Positions;
    const indices = object.Mesh.Indices;
    const uvs = object.Mesh.Uvs;
    const old = geometryBuffers.get(key);
    if (old && old.positionCount === positions.length && old.indexCount === indices.length) return old;
    old?.vertex.destroy(); old?.index.destroy(); old?.uniform.destroy();
    if (positions.length % 3 !== 0 || indices.some(index => Number(index) < 0 || Number(index) >= positions.length / 3)) return null;
    const vertexData = textured ? positions.flatMap((value, index) => index % 3 === 0 ? [value, positions[index + 1], positions[index + 2], uvs[index / 3 * 2], uvs[index / 3 * 2 + 1]] : []) : positions;
    const vertex = device.createBuffer({ size: vertexData.length * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(vertex, 0, new Float32Array(vertexData));
    const useUint32 = Math.max(...indices.map(Number)) > 65535;
    const indexData = useUint32 ? new Uint32Array(indices) : new Uint16Array(indices);
    const index = device.createBuffer({ size: indexData.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(index, 0, indexData);
    const uniform = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const entries = [{ binding: 0, resource: { buffer: uniform } }];
    if (textured) entries.push({ binding: 1, resource: texture.sampler }, { binding: 2, resource: texture.view });
    const activePipeline = textured ? texturedPipeline : pipeline;
    const resources = { vertex, index, uniform, indexFormat: useUint32 ? 'uint32' : 'uint16', indexCount: indices.length, positionCount: positions.length, bindGroup: device.createBindGroup({ layout: activePipeline.getBindGroupLayout(0), entries }) };
    geometryBuffers.set(key, resources);
    return resources;
}

async function getTextureResource(object) {
    const texture = object.Material?.Texture;
    if (!texture?.Data) return null;
    if (textureResources.has(object.Id)) return textureResources.get(object.Id);
    const binary = Uint8Array.from(atob(texture.Data), character => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([binary], { type: `image/${texture.Format === 'jpg' ? 'jpeg' : texture.Format}` }));
    const gpuTexture = device.createTexture({ size: [bitmap.width, bitmap.height, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: gpuTexture }, [bitmap.width, bitmap.height]);
    const result = { texture: gpuTexture, view: gpuTexture.createView(), sampler: device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat' }) };
    textureResources.set(object.Id, result);
    return result;
}

export function dispose() {
    resizeObserver?.disconnect(); resizeObserver = null;
    canvas?.removeEventListener('contextmenu', preventContextMenu); canvas?.removeEventListener('pointerdown', pointerDown); canvas?.removeEventListener('pointermove', pointerMove); canvas?.removeEventListener('pointerup', pointerUp); canvas?.removeEventListener('pointercancel', pointerUp); canvas?.removeEventListener('lostpointercapture', pointerUp); canvas?.removeEventListener('wheel', wheel);
    for (const resources of geometryBuffers.values()) { resources.vertex.destroy(); resources.index.destroy(); resources.uniform.destroy(); }
    geometryBuffers.clear(); depthTexture?.destroy(); depthTexture = null;
    for (const resource of textureResources.values()) resource.texture.destroy();
    textureResources.clear();
    gizmoVertex?.buffer.destroy(); gizmoVertex = null; gizmoUniform?.destroy(); gizmoUniform = null; gizmoBindGroup = null;
    for (const label of gizmoLabels.values()) label.remove();
    gizmoLabels.clear();
    cameraViewCube?.remove(); cameraViewCube = null;
    canvas = null; device = null; context = null; pipeline = null; texturedPipeline = null; gizmoPipeline = null; dotnet = null; scene = { Objects: [], SelectedObjectId: null }; hasFramed = false; gizmoHoverAxis = 'None'; gizmoActiveAxis = 'None';
}

function pointerDown(event) {
    try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* ignore if capture fails */ }
    if (event.button === 2) { // right button => camera orbit
        pointer.right = true; pointer.orbit = { x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch }; return; }
    if (event.button !== 0) return; // only left button for interactions
    pointer.left = true;
    toolController.lastPointer = { x: event.clientX, y: event.clientY };
    toolController.pointerStart = { x: event.offsetX, y: event.offsetY };
    toolController.activeTool = interactionTool;

    // SELECT tool: pick object under cursor
    if (interactionTool === 'Select') {
        const hit = pick(event.offsetX, event.offsetY);
        if (hit) dotnet?.invokeMethodAsync('OnObjectPicked', hit.Id);
        return;
    }
    // Camera tool does not start object drags
    if (interactionTool === 'Camera') return;

    // Only operate on the currently selected object in hierarchy
    const selected = scene.Objects?.find(object => object.Id === scene.SelectedObjectId);
    if (!selected) return;

    // Determine axis from gizmo hit - axis must be unique
    const axis = gizmoAxisHit(event.offsetX, event.offsetY);
    if (axis === 'None') return;

    const position = vectorValue(selected.Transform?.Position);
    const rotation = vectorValue(selected.Transform?.Rotation);
    const axisDirection = axisVector(axis);
    const planeNormal = interactionTool === 'Rotate' ? axisDirection : translationPlaneNormal(axisDirection);
    const startPoint = rayPlaneIntersection(event.offsetX, event.offsetY, position, planeNormal);
    if (!startPoint) return;

    const startVector = subtract(startPoint, position);

    // initialize controller drag data (immutable snapshot references just for reference)
    toolController.activeAxis = axis;
    toolController.activeObjectId = selected.Id;
    const scale = vectorValue(selected.Transform?.Scale, [1,1,1]);
    toolController.dragStartTransform = { Position: [...position], Rotation: [...rotation], Scale: [...scale] };
    toolController.isDragging = true;
    toolController.dragData = { axis, axisDirection, original: position, rotation, scale, tool: interactionTool, startPoint, startVector, planeNormal };
    // also keep legacy pointer.drag for minimal compatibility
    pointer.drag = toolController.dragData;
    gizmoActiveAxis = axis;
    // render preview based on same scene state
    render(JSON.stringify(scene));
}
function pointerMove(event) {
    // Camera orbit
    if (pointer.right && pointer.orbit) {
        camera.yaw = pointer.orbit.yaw - (event.clientX - pointer.orbit.x) * 0.01;
        camera.pitch = clamp(pointer.orbit.pitch - (event.clientY - pointer.orbit.y) * 0.01, -1.45, 1.45);
        render(JSON.stringify(scene)); return;
    }

    // Hover detection when not dragging
    if (!pointer.left || !toolController.isDragging || !toolController.dragData) {

        const nextHover = (interactionTool !== 'Translate' && interactionTool !== 'Rotate') || !scene.SelectedObjectId ? 'None' : gizmoAxisHit(event.offsetX, event.offsetY);
        console.info('[xframe] Hover detection', { nextHover });

        if (nextHover !== gizmoHoverAxis) {
            console.info('[xframe] Hover axis changed', { nextHover , scene });
            gizmoHoverAxis = nextHover;
            render(JSON.stringify(scene));
        }
        return;
    }

    // Ensure we operate only on the active object
    const object = scene.Objects?.find(x => x.Id === toolController.activeObjectId);
    if (!object) return;

    const d = toolController.dragData;
    let position = [...d.original], rotation = [...d.rotation];

    if (d.tool === 'Translate') {
        const current = rayPlaneIntersection(event.offsetX, event.offsetY, d.original, d.planeNormal);
        if (!current) return;
        const distance = dot(subtract(current, d.startPoint), d.axisDirection);
        position = add(d.original, multiply(d.axisDirection, distance * TRANSLATION_SENSITIVITY));
    } else if (d.tool === 'Rotate') {
        const current = rayPlaneIntersection(event.offsetX, event.offsetY, d.original, d.planeNormal);
        if (!current) return;
        const currentVector = subtract(current, d.original);
        if (Math.hypot(...d.startVector) > 0.00001 && Math.hypot(...currentVector) > 0.00001) {
            const angle = Math.atan2(dot(d.axisDirection, cross(d.startVector, currentVector)), dot(d.startVector, currentVector)) * 180 / Math.PI * ROTATION_SENSITIVITY;
            rotation[axisIndex(d.axis)] = d.rotation[axisIndex(d.axis)] + angle;
        }
    }

    // JS owns this complete transient snapshot until pointerUp. The confirmed object
    // transform is never mutated during a drag, so all non-active axes are preserved.
    const scale = vectorValue(d.scale, [1, 1, 1]);
    const previewTransform = {
        Position: { X: position[0], Y: position[1], Z: position[2] },
        Rotation: { X: rotation[0], Y: rotation[1], Z: rotation[2] },
        Scale: { X: scale[0], Y: scale[1], Z: scale[2] }
    };
    toolController.lastPreviewTransform = previewTransform;
    object.__previewTransform = previewTransform;

    // Render immediate preview
    render(JSON.stringify(scene));

}
function pointerUp(event) {
    // Stop dragging / orbiting;
    pointer.left = false;
    pointer.right = false;
    pointer.orbit = null;
    let committedTransform = null;
    // Commit the last valid preview. Do not raycast again: pointerUp can occur on
    // a location where the interaction plane is no longer intersectable.
    if (toolController.isDragging && toolController.dragData && toolController.activeObjectId) {
        const object = scene.Objects?.find(x => x.Id === toolController.activeObjectId);
        if (object && toolController.lastPreviewTransform) {
            committedTransform = toolController.lastPreviewTransform;
            const p = vectorValue(committedTransform.Position);
            const r = vectorValue(committedTransform.Rotation);
            const s = vectorValue(committedTransform.Scale, [1, 1, 1]);
            dotnet?.invokeMethodAsync('OnTransformCommitted', object.Id, p[0], p[1], p[2], r[0], r[1], r[2], s[0], s[1], s[2]);
        }
    }

    // Keep the committed preview visible until the authoritative .NET snapshot arrives.
    if (committedTransform && toolController.activeObjectId) {
        const commitObj = scene.Objects?.find(x => x.Id === toolController.activeObjectId);
        if (commitObj) {
            commitObj.Transform = committedTransform;
            delete commitObj.__previewTransform;
        }
    }

    // End unified drag if present
    if (toolController.isDragging) {
        toolController.isDragging = false;
        toolController.dragData = null;
        toolController.activeAxis = 'None';
        toolController.activeObjectId = null;
        toolController.dragStartTransform = null;
        toolController.lastPreviewTransform = null;
    }

    // Clear legacy pointer.drag
    pointer.drag = null;

    gizmoActiveAxis = 'None';
    hideGizmoLabels();
    try {
        if (canvas?.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    } catch (e) {
        // ignore
    }
    if (committedTransform) render(JSON.stringify(scene));
}
function wheel(event) { event.preventDefault(); camera.distance = clamp(camera.distance * Math.exp(event.deltaY * 0.001), 0.01, 100000); render(JSON.stringify(scene)); }
function preventContextMenu(event) { event.preventDefault(); }

function createCameraViewCube() {
    if (cameraViewCube || !canvas?.parentElement) return;
    cameraViewCube = document.createElement('div');
    cameraViewCube.className = 'xframe-camera-view-cube';
    cameraViewCube.style.cssText = 'position:absolute;top:56px;left:50%;transform:translateX(-50%) perspective(260px) rotateX(-8deg) rotateY(-12deg);transform-origin:center;display:none;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(4,30px);gap:3px;padding:7px;border-radius:8px;background:rgba(20,24,32,.88);border:1px solid rgba(255,255,255,.3);z-index:5;box-shadow:0 4px 14px rgba(0,0,0,.35);';
     
    const faces = [
        // Linha 1 (row 0)
        ['ISO TFL', 0, 0, 'ISO_TFL'],
        ['Top', 1, 0, 'Top'],
        ['ISO TFR', 2, 0, 'ISO_TFR'],
        // Linha 2 (row 1)
        ['Left', 0, 1, 'Left'],
        ['Front', 1, 1, 'Front'],
        ['Right', 2, 1, 'Right'],
        // Linha 3 (row 2)
        ['ISO TBL', 0, 2, 'ISO_TBL'],
        ['Back', 1, 2, 'Back'],
        ['ISO TBR', 2, 2, 'ISO_TBR'],
        // Linha 4 (row 3)
        ['Bottom', 1, 3, 'Bottom']
    ];

    for (const [label, column, row, viewName] of faces) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.title = `Vista ${label}`;
        button.style.cssText = `grid-column:${column + 1};grid-row:${row + 1};min-width:34px;min-height:30px;padding:2px;border:1px solid rgba(255,255,255,.35);border-radius:4px;background:#334155;color:#fff;font:600 8px sans-serif;cursor:pointer;`;

        button.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
            setCameraView(viewName);
        });

        cameraViewCube.appendChild(button);
    }

    canvas.parentElement.appendChild(cameraViewCube);
}

function setCameraView(view) {
    // Map simple faces and isometric presets to deterministic direction vectors
    let direction = null;
    if (view === 'Front') direction = [0, 0, -1];
    else if (view === 'Back') direction = [0, 0, 1];
    else if (view === 'Right') direction = [1, 0, 0];
    else if (view === 'Left') direction = [-1, 0, 0];
    else if (view === 'Top') direction = [0, 1, 0];
    else if (view === 'Bottom') direction = [0, -1, 0];
    else if (view === 'ISO_TFR') direction = normalize([1, 1, -1]); // top + front + right
    else if (view === 'ISO_TFL') direction = normalize([-1, 1, -1]); // top + front + left
    else if (view === 'ISO_TBR') direction = normalize([1, 1, 1]); // top + back + right
    else if (view === 'ISO_TBL') direction = normalize([-1, 1, 1]); // top + back + left
    if (!direction) return;
    // compute yaw/pitch consistent with getCameraPosition / lookAt usage
    const horizontalLength = Math.hypot(direction[0], direction[1]) || 1;
    camera.yaw = Math.atan2(direction[0], direction[1]);
    camera.pitch = Math.atan2(direction[2], horizontalLength);
    // Keep distance but ensure object remains framed: small adjustment if too close
    camera.distance = Math.max(camera.distance, 2.5);
    render(JSON.stringify(scene));
}

function pick(x, y) {
    let best = null, bestDistance = 36;
    for (const object of scene.Objects || []) {
        const screen = project(vectorValue(object.__previewTransform?.Position ?? object.Transform?.Position));
        if (!screen) continue;
        const distance = Math.hypot(screen[0] - x, screen[1] - y);
        if (distance < bestDistance) { best = object; bestDistance = distance; }
    }
    return best;
}
function gizmoAxisHit(x, y) {
    if ((interactionTool !== 'Translate' && interactionTool !== 'Rotate') || !scene.SelectedObjectId) return 'None';
    const selected = scene.Objects?.find(object => object.Id === scene.SelectedObjectId);
    if (!selected) return 'None';
    const ray = screenRay(x, y);
    const size = Math.max(camera.distance * GIZMO_VISUAL_SCALE, 0.01);
    let result = 'None', closest = size * GIZMO_HIT_TOLERANCE;
    for (const component of gizmoComponents) {
        const distance = raySegmentDistance(ray.origin, ray.direction, component.start, component.end);
        if (distance !== null && distance < closest) { closest = distance; result = component.axis; }
    }
    return result;
}
function screenRay(x, y) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight), ndcX = x / Math.max(1, canvas.clientWidth) * 2 - 1, ndcY = 1 - y / Math.max(1, canvas.clientHeight) * 2;
    const origin = getCameraPosition(), forward = normalize(subtract(camera.target, origin)), upReference = Math.abs(dot(forward, [0, 0, 1])) > 0.98 ? [0, 1, 0] : [0, 0, 1], right = normalize(cross(forward, upReference)), up = cross(right, forward), tan = Math.tan(camera.fov / 2);
    return { origin, direction: normalize(add(add(forward, multiply(right, ndcX * tan * aspect)), multiply(up, ndcY * tan))) };
}
function rayPlaneIntersection(x, y, point, normal) {
    const ray = screenRay(x, y), denominator = dot(ray.direction, normal);
    if (Math.abs(denominator) < 0.00001) return null;
    const distance = dot(subtract(point, ray.origin), normal) / denominator;
    return distance < 0 ? null : add(ray.origin, multiply(ray.direction, distance));
}
function translationPlaneNormal(axis) {
    const forward = normalize(subtract(camera.target, getCameraPosition()));
    let normal = cross(axis, forward);
    if (Math.hypot(...normal) < 0.00001) normal = cross(axis, [0, 0, 1]);
    if (Math.hypot(...normal) < 0.00001) normal = [1, 0, 0];
    return normalize(normal);
}
function raySegmentDistance(rayOrigin, rayDirection, start, end) {
    const segment = subtract(end, start), offset = subtract(rayOrigin, start), a = dot(rayDirection, rayDirection), b = dot(rayDirection, segment), c = dot(segment, segment), d = dot(rayDirection, offset), e = dot(segment, offset), denominator = a * c - b * b;
    if (c < 0.00001) return null;
    let rayDistance, segmentPosition;
    if (Math.abs(denominator) < 0.00001) { rayDistance = 0; segmentPosition = clamp(e / c, 0, 1); }
    else { rayDistance = (b * e - c * d) / denominator; segmentPosition = (a * e - b * d) / denominator; }
    if (rayDistance < 0 || segmentPosition < 0 || segmentPosition > 1) return null;
    const rayPoint = add(rayOrigin, multiply(rayDirection, rayDistance));
    const segmentPoint = add(start, multiply(segment, segmentPosition));
    return Math.hypot(...subtract(rayPoint, segmentPoint));
}
function axisVector(axis) { return axis === 'X' ? [1, 0, 0] : axis === 'Y' ? [0, 1, 0] : [0, 0, 1]; }
function axisIndex(axis) { return axis === 'X' ? 0 : axis === 'Y' ? 1 : 2; }
function axisColor(axis) { return axis === 'X' ? [0.9, 0.12, 0.12, 1] : axis === 'Y' ? [0.15, 0.85, 0.2, 1] : [0.2, 0.45, 1, 1]; }
function frameScene() {
    const objects = scene.Objects || [];
    const center = [0, 0, 0]; let extent = 1;
    for (const object of objects) { const p = vectorValue(object.Transform?.Position); const b = vectorValue(object.Bounds); center[0] += p[0]; center[1] += p[1]; center[2] += p[2]; extent = Math.max(extent, Math.abs(b[0]), Math.abs(b[1]), Math.abs(b[2])); }
    camera.target = center.map(value => value / objects.length); camera.distance = extent * 2.8;
}
function screenToPlane(x, y, planeZ) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight), ndcX = x / Math.max(1, canvas.clientWidth) * 2 - 1, ndcY = 1 - y / Math.max(1, canvas.clientHeight) * 2;
    const position = getCameraPosition(), forward = normalize(subtract(camera.target, position)), upReference = Math.abs(dot(forward, [0, 0, 1])) > 0.98 ? [0, 1, 0] : [0, 0, 1], right = normalize(cross(forward, upReference)), up = cross(right, forward), tan = Math.tan(camera.fov / 2);
    const ray = normalize(add(add(forward, multiply(right, ndcX * tan * aspect)), multiply(up, ndcY * tan)));
    if (Math.abs(ray[2]) < 0.00001) return null;
    const distance = (planeZ - position[2]) / ray[2]; return distance < 0 ? null : add(position, multiply(ray, distance));
}
function getObjectViewProjection(object, viewProjection) { return multiplyMatrix(viewProjection, modelMatrix(object.__previewTransform ?? object.Transform)); }
function modelMatrix(transform) { const s = vectorValue(transform?.Scale, [1, 1, 1]), r = vectorValue(transform?.Rotation), p = vectorValue(transform?.Position); return multiplyMatrix(translation(p), multiplyMatrix(rotationZ(r[2]), multiplyMatrix(rotationY(r[1]), multiplyMatrix(rotationX(r[0]), scaling(s))))); }
function project(point) { const clip = multiplyPoint(getViewProjection(canvas.clientWidth / Math.max(1, canvas.clientHeight)), point); if (clip[3] <= 0) return null; return [(clip[0] / clip[3] * 0.5 + 0.5) * canvas.clientWidth, (1 - (clip[1] / clip[3] * 0.5 + 0.5)) * canvas.clientHeight]; }
function getCameraPosition() { const cp = Math.cos(camera.pitch); return [camera.target[0] + camera.distance * cp * Math.sin(camera.yaw), camera.target[1] + camera.distance * cp * Math.cos(camera.yaw), camera.target[2] + camera.distance * Math.sin(camera.pitch)]; }
function getViewProjection(aspect) { return multiplyMatrix(perspective(camera.fov, aspect, Math.max(0.001, camera.distance / 10000), camera.distance * 10000), lookAt(getCameraPosition(), camera.target, [0, 0, 1])); }
function vectorValue(value, fallback = [0, 0, 0]) { return value ? [value.X ?? value.x ?? fallback[0], value.Y ?? value.y ?? fallback[1], value.Z ?? value.z ?? fallback[2]] : fallback; }
function categoryColor(category) { return category === 2 ? [0.25, 0.65, 0.95, 1] : [0.55, 0.65, 0.82, 1]; }
function translation(v) { return [1,0,0,0,0,1,0,0,0,0,1,0,v[0],v[1],v[2],1]; }
function scaling(v) { return [v[0],0,0,0,0,v[1],0,0,0,0,v[2],0,0,0,0,1]; }
function rotationX(a){const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];} function rotationY(a){const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];} function rotationZ(a){const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
function lookAt(eye, target, up) { const z = normalize(subtract(eye, target)), upReference = Math.abs(dot(z, up)) > 0.98 ? [0, 1, 0] : up, x = normalize(cross(upReference, z)), y = cross(z, x); return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]; }
function perspective(fov, aspect, near, far) { const f = 1 / Math.tan(fov / 2); return [f / aspect,0,0,0,0,f,0,0,0,0,(far + near) / (near - far),-1,0,0,(2 * far * near) / (near - far),0]; }
function multiplyMatrix(a,b) { const r = Array(16).fill(0); for(let col=0;col<4;col++) for(let row=0;row<4;row++) for(let k=0;k<4;k++) r[col*4+row]+=a[k*4+row]*b[col*4+k]; return r; }
function multiplyPoint(m,p) { return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14],m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]]; }
function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];} function subtract(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];} function multiply(a,s){return[a[0]*s,a[1]*s,a[2]*s];} function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];} function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];} function normalize(v){const l=Math.hypot(...v)||1;return[v[0]/l,v[1]/l,v[2]/l];} function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
