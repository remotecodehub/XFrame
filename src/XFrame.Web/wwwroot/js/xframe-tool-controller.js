const AXES = ['X', 'Y', 'Z'];
const TRANSLATION_SENSITIVITY = 0.6;
const ROTATION_SENSITIVITY = 0.2;
const GIZMO_VISUAL_SCALE = 0.24;
const GIZMO_HIT_TOLERANCE = 0.14;

const toolHandlers = {
    Select: null,
    Translate: createTransformHandler('Translate'),
    Rotate: createTransformHandler('Rotate'),
    Camera: null
};

export function createToolController(renderer) {
    let canvas = null;
    let dotnet = null;
    let tool = 'Select';
    let scene = { Objects: [], SelectedObjectId: null, Tool: 'Select' };
    let drag = null;
    let initialized = false;
    let listeners = [];

    const camera = { target: [0, 0, 0], distance: 6, yaw: 0, pitch: 0.35, fov: Math.PI / 3 };

    function initialize(canvasElement, callback) {
        if (initialized) return;
        canvas = canvasElement;
        dotnet = callback;
        add('pointerdown', onPointerDown, true);
        add('pointermove', onPointerMove, true);
        add('pointerup', onPointerUp, true);
        add('pointercancel', onPointerUp, true);
        add('lostpointercapture', onPointerUp, true);
        add('wheel', onWheel, true);
        add('pointermove', onCameraObserve, false);
        add('pointerdown', onCameraObserve, false);
        initialized = true;
    }

    function add(type, handler, capture) {
        canvas.addEventListener(type, handler, capture);
        listeners.push([type, handler, capture]);
    }

    function setTool(nextTool) {
        tool = nextTool || 'Select';
        if (drag) cancelDrag();
    }

    function setScene(json) {
        const incoming = typeof json === 'string' ? JSON.parse(json) : json;
        scene = incoming || { Objects: [], SelectedObjectId: null, Tool: tool };
        scene.Tool = tool;
        if (!drag && scene.Objects?.length && !scene.__cameraFramed) {
            frameScene();
            scene.__cameraFramed = true;
        }
    }

    function dispose() {
        if (!canvas) return;
        for (const [type, handler, capture] of listeners) canvas.removeEventListener(type, handler, capture);
        listeners = [];
        drag = null;
        canvas = null;
        dotnet = null;
        scene = { Objects: [], SelectedObjectId: null, Tool: 'Select' };
        initialized = false;
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;
        const handler = toolHandlers[tool];
        if (!handler) return;
        if (handler.begin(event, { canvas, scene, camera })) {
            event.preventDefault();
            event.stopImmediatePropagation();
            try { canvas.setPointerCapture(event.pointerId); } catch { /* browser may reject capture */ }
        }
    }

    function onPointerMove(event) {
        if (!drag) return;
        const handler = toolHandlers[drag.tool];
        if (!handler) return;
        handler.move(event, { canvas, scene, camera, drag });
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function onPointerUp(event) {
        if (!drag) return;
        const current = drag;
        const handler = toolHandlers[current.tool];
        if (handler) handler.end(event, { canvas, scene, camera, drag: current, dotnet });
        drag = null;
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
            if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        } catch { /* ignore */ }
    }

    function onCameraObserve(event) {
        if (drag) return;
        if (event.type === 'pointerdown' && event.button === 2) {
            camera.__orbit = { x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch };
            return;
        }
        if (event.type === 'pointermove' && camera.__orbit) {
            camera.yaw = camera.__orbit.yaw - (event.clientX - camera.__orbit.x) * 0.01;
            camera.pitch = clamp(camera.__orbit.pitch - (event.clientY - camera.__orbit.y) * 0.01, -1.45, 1.45);
            return;
        }
        if (event.type === 'pointerup') camera.__orbit = null;
    }

    function onWheel(event) {
        if (drag) return;
        camera.distance = clamp(camera.distance * Math.exp(event.deltaY * 0.001), 0.01, 100000);
    }

    function frameScene() {
        const objects = scene.Objects || [];
        if (!objects.length) return;
        const center = [0, 0, 0];
        let extent = 1;
        for (const object of objects) {
            const p = vectorValue(object.Transform?.Position);
            const b = vectorValue(object.Bounds);
            center[0] += p[0]; center[1] += p[1]; center[2] += p[2];
            extent = Math.max(extent, Math.abs(b[0]), Math.abs(b[1]), Math.abs(b[2]));
        }
        camera.target = center.map(v => v / objects.length);
        camera.distance = extent * 2.8;
    }

    function renderPreview() {
        scene.Tool = tool;
        renderer.render(JSON.stringify(scene));
    }

    function cancelDrag() {
        drag = null;
    }

    function createTransformHandler(kind) {
        return {
            begin(event, context) {
                const selected = context.scene.Objects?.find(o => o.Id === context.scene.SelectedObjectId);
                if (!selected) return false;
                const axis = gizmoAxisHit(event.offsetX, event.offsetY, context);
                if (axis === 'None') return false;

                const position = vectorValue(selected.Transform?.Position);
                const rotation = vectorValue(selected.Transform?.Rotation);
                const scale = vectorValue(selected.Transform?.Scale, [1, 1, 1]);
                const axisDirection = axisVector(axis);
                const planeNormal = kind === 'Rotate' ? axisDirection : translationPlaneNormal(axisDirection, context.camera);
                const startPoint = rayPlaneIntersection(event.offsetX, event.offsetY, position, planeNormal, context);
                if (!startPoint) return false;

                drag = {
                    tool: kind,
                    objectId: selected.Id,
                    axis,
                    axisDirection,
                    originalPosition: [...position],
                    originalRotation: [...rotation],
                    originalScale: [...scale],
                    startPoint,
                    startVector: subtract(startPoint, position),
                    planeNormal,
                    lastPreviewTransform: cloneTransform(selected.Transform)
                };
                return true;
            },

            move(event, context) {
                const d = context.drag;
                const current = rayPlaneIntersection(event.offsetX, event.offsetY, d.originalPosition, d.planeNormal, context);
                if (!current) return;

                const position = [...d.originalPosition];
                const rotation = [...d.originalRotation];
                if (kind === 'Translate') {
                    const distance = dot(subtract(current, d.startPoint), d.axisDirection);
                    const value = distance * TRANSLATION_SENSITIVITY;
                    position[axisIndex(d.axis)] += value;
                } else {
                    const currentVector = subtract(current, d.originalPosition);
                    if (Math.hypot(...d.startVector) > 0.00001 && Math.hypot(...currentVector) > 0.00001) {
                        const angle = Math.atan2(
                            dot(d.axisDirection, cross(d.startVector, currentVector)),
                            dot(d.startVector, currentVector)) * 180 / Math.PI * ROTATION_SENSITIVITY;
                        rotation[axisIndex(d.axis)] = d.originalRotation[axisIndex(d.axis)] + angle;
                    }
                }

                const preview = {
                    Position: { X: position[0], Y: position[1], Z: position[2] },
                    Rotation: { X: rotation[0], Y: rotation[1], Z: rotation[2] },
                    Scale: { X: d.originalScale[0], Y: d.originalScale[1], Z: d.originalScale[2] }
                };
                const object = context.scene.Objects?.find(o => o.Id === d.objectId);
                if (!object) return;
                object.__previewTransform = preview;
                d.lastPreviewTransform = preview;
                renderPreview();
            },

            end(event, context) {
                const d = context.drag;
                const object = context.scene.Objects?.find(o => o.Id === d.objectId);
                if (!object || !d.lastPreviewTransform) return;
                const t = d.lastPreviewTransform;
                const p = vectorValue(t.Position);
                const r = vectorValue(t.Rotation);
                const s = vectorValue(t.Scale, [1, 1, 1]);
                context.dotnet?.invokeMethodAsync('OnTransformCommitted', object.Id, p[0], p[1], p[2], r[0], r[1], r[2], s[0], s[1], s[2]);
                // Keep the last preview rendered until the authoritative .NET scene arrives.
                object.Transform = t;
                delete object.__previewTransform;
                renderPreview();
            }
        };
    }

    function gizmoAxisHit(x, y, context) {
        const selected = context.scene.Objects?.find(o => o.Id === context.scene.SelectedObjectId);
        if (!selected) return 'None';
        const ray = screenRay(x, y, context);
        const center = vectorValue(selected.__previewTransform?.Position ?? selected.Transform?.Position);
        const size = Math.max(context.camera.distance * GIZMO_VISUAL_SCALE, 0.01);
        let result = 'None';
        let closest = size * GIZMO_HIT_TOLERANCE;
        for (const axis of AXES) {
            const end = add(center, multiply(axisVector(axis), size));
            const distance = raySegmentDistance(ray.origin, ray.direction, center, end);
            if (distance !== null && distance < closest) {
                closest = distance;
                result = axis;
            }
        }
        return result;
    }

    function screenRay(x, y, context) {
        const aspect = context.canvas.clientWidth / Math.max(1, context.canvas.clientHeight);
        const ndcX = x / Math.max(1, context.canvas.clientWidth) * 2 - 1;
        const ndcY = 1 - y / Math.max(1, context.canvas.clientHeight) * 2;
        const origin = getCameraPosition(context.camera);
        const forward = normalize(subtract(context.camera.target, origin));
        const upReference = Math.abs(dot(forward, [0, 0, 1])) > 0.98 ? [0, 1, 0] : [0, 0, 1];
        const right = normalize(cross(forward, upReference));
        const up = cross(right, forward);
        const tan = Math.tan(context.camera.fov / 2);
        return { origin, direction: normalize(add(add(forward, multiply(right, ndcX * tan * aspect)), multiply(up, ndcY * tan))) };
    }

    function rayPlaneIntersection(x, y, point, normal, context) {
        const ray = screenRay(x, y, context);
        const denominator = dot(ray.direction, normal);
        if (Math.abs(denominator) < 0.00001) return null;
        const distance = dot(subtract(point, ray.origin), normal) / denominator;
        return distance < 0 ? null : add(ray.origin, multiply(ray.direction, distance));
    }

    function translationPlaneNormal(axis, cameraState) {
        const forward = normalize(subtract(cameraState.target, getCameraPosition(cameraState)));
        let normal = cross(axis, forward);
        if (Math.hypot(...normal) < 0.00001) normal = cross(axis, [0, 0, 1]);
        if (Math.hypot(...normal) < 0.00001) normal = [1, 0, 0];
        return normalize(normal);
    }

    return { initialize, setTool, setScene, dispose };
}

function cloneTransform(transform) {
    const p = vectorValue(transform?.Position);
    const r = vectorValue(transform?.Rotation);
    const s = vectorValue(transform?.Scale, [1, 1, 1]);
    return { Position: { X: p[0], Y: p[1], Z: p[2] }, Rotation: { X: r[0], Y: r[1], Z: r[2] }, Scale: { X: s[0], Y: s[1], Z: s[2] } };
}
function getCameraPosition(camera) { const cp = Math.cos(camera.pitch); return [camera.target[0] + camera.distance * cp * Math.sin(camera.yaw), camera.target[1] + camera.distance * cp * Math.cos(camera.yaw), camera.target[2] + camera.distance * Math.sin(camera.pitch)]; }
function axisVector(axis) { return axis === 'X' ? [1, 0, 0] : axis === 'Y' ? [0, 1, 0] : [0, 0, 1]; }
function axisIndex(axis) { return axis === 'X' ? 0 : axis === 'Y' ? 1 : 2; }
function vectorValue(value, fallback = [0, 0, 0]) { return value ? [value.X ?? value.x ?? fallback[0], value.Y ?? value.y ?? fallback[1], value.Z ?? value.z ?? fallback[2]] : fallback; }
function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function subtract(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function multiply(a,s){return[a[0]*s,a[1]*s,a[2]*s];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function normalize(v){const l=Math.hypot(...v)||1;return[v[0]/l,v[1]/l,v[2]/l];}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function raySegmentDistance(rayOrigin, rayDirection, start, end) {
    const segment = subtract(end, start), offset = subtract(rayOrigin, start);
    const a = dot(rayDirection, rayDirection), b = dot(rayDirection, segment), c = dot(segment, segment), d = dot(rayDirection, offset), e = dot(segment, offset);
    if (c < 0.00001) return null;
    const denominator = a * c - b * b;
    let rayDistance, segmentPosition;
    if (Math.abs(denominator) < 0.00001) { rayDistance = 0; segmentPosition = clamp(e / c, 0, 1); }
    else { rayDistance = (b * e - c * d) / denominator; segmentPosition = (a * e - b * d) / denominator; }
    if (rayDistance < 0 || segmentPosition < 0 || segmentPosition > 1) return null;
    const rayPoint = add(rayOrigin, multiply(rayDirection, rayDistance));
    const segmentPoint = add(start, multiply(segment, segmentPosition));
    return Math.hypot(...subtract(rayPoint, segmentPoint));
}
