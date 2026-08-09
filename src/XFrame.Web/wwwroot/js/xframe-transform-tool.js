let canvas = null;
let dotnet = null;
let tool = 'Select';
let scene = { Objects: [], SelectedObjectId: null, Tool: 'Select' };
let drag = null;
let listenersAttached = false;

const AXES = ['X', 'Y', 'Z'];
const HIT_RADIUS = 34;
const MIN_DRAG_DISTANCE = 0.5;
const WORLD_PER_SCREEN_PIXEL = 0.01;

export function initialize(canvasId, callback) {
    canvas = document.getElementById(canvasId);
    dotnet = callback;
    if (!canvas || listenersAttached) return;

    canvas.addEventListener('pointerdown', pointerDown, true);
    canvas.addEventListener('pointermove', pointerMove, true);
    canvas.addEventListener('pointerup', pointerUp, true);
    canvas.addEventListener('pointercancel', pointerCancel, true);
    canvas.addEventListener('lostpointercapture', lostPointerCapture, true);
    listenersAttached = true;
}

export function setTool(nextTool) {
    tool = nextTool || 'Select';
    if (tool !== 'Translate') cancelDrag('tool-changed');
}

export function setScene(json) {
    scene = typeof json === 'string' ? JSON.parse(json) : json;
}

export function dispose() {
    if (canvas && listenersAttached) {
        canvas.removeEventListener('pointerdown', pointerDown, true);
        canvas.removeEventListener('pointermove', pointerMove, true);
        canvas.removeEventListener('pointerup', pointerUp, true);
        canvas.removeEventListener('pointercancel', pointerCancel, true);
        canvas.removeEventListener('lostpointercapture', lostPointerCapture, true);
    }
    listenersAttached = false;
    drag = null;
    canvas = null;
    dotnet = null;
    scene = { Objects: [], SelectedObjectId: null, Tool: 'Select' };
}

function pointerDown(event) {
    if (tool !== 'Translate' || event.button !== 0 || drag) return;

    const selected = getSelectedObject();
    if (!selected) return;

    const point = getPointerPoint(event);
    const axis = hitAxis(point.x, point.y);
    if (axis === 'None') return;

    const position = vectorValue(selected.Transform?.Position);
    const rotation = vectorValue(selected.Transform?.Rotation);
    const scale = vectorValue(selected.Transform?.Scale, [1, 1, 1]);
    const axisDirection = axisVector(axis);
    const labels = getAxisLabels();
    const center = estimateGizmoCenter(labels);
    const endpoint = labels[axis];
    const screenDirection = normalize2([endpoint.x - center.x, endpoint.y - center.y]);

    drag = {
        pointerId: event.pointerId,
        objectId: selected.Id,
        axis,
        axisDirection,
        originalPosition: [...position],
        originalRotation: [...rotation],
        originalScale: [...scale],
        startPointer: point,
        lastPointer: point,
        screenDirection,
        lastTransform: cloneTransform(selected.Transform)
    };

    try { canvas.setPointerCapture(event.pointerId); } catch { }
    event.preventDefault();
    event.stopImmediatePropagation();
    notifyPreview(drag.lastTransform);
}

function pointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const point = getPointerPoint(event);
    const dx = point.x - drag.startPointer.x;
    const dy = point.y - drag.startPointer.y;
    const projectedPixels = dx * drag.screenDirection.x + dy * drag.screenDirection.y;

    if (Math.abs(projectedPixels) < MIN_DRAG_DISTANCE) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
    }

    const position = [...drag.originalPosition];
    const index = axisIndex(drag.axis);
    position[index] += projectedPixels * WORLD_PER_SCREEN_PIXEL;

    drag.lastTransform = {
        Position: { X: position[0], Y: position[1], Z: position[2] },
        Rotation: { X: drag.originalRotation[0], Y: drag.originalRotation[1], Z: drag.originalRotation[2] },
        Scale: { X: drag.originalScale[0], Y: drag.originalScale[1], Z: drag.originalScale[2] }
    };
    drag.lastPointer = point;

    notifyPreview(drag.lastTransform);
    event.preventDefault();
    event.stopImmediatePropagation();
}

function pointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag(event, 'pointerup');
}

function pointerCancel(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag(event, 'pointercancel');
}

function lostPointerCapture(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    // lostpointercapture is not a reliable indication that the pointer was released.
    // Commit the last valid transform instead of discarding it.
    finishDrag(event, 'lostpointercapture');
}

function finishDrag(event, reason) {
    const current = drag;
    drag = null;

    try {
        if (canvas?.hasPointerCapture?.(current.pointerId)) canvas.releasePointerCapture(current.pointerId);
    } catch { }

    if (current.lastTransform) {
        const t = current.lastTransform;
        const p = vectorValue(t.Position);
        const r = vectorValue(t.Rotation);
        const s = vectorValue(t.Scale, [1, 1, 1]);
        dotnet?.invokeMethodAsync('OnTransformCommitted', current.objectId, p[0], p[1], p[2], r[0], r[1], r[2], s[0], s[1], s[2]);
    }

    event.preventDefault();
    event.stopImmediatePropagation();
}

function cancelDrag(reason) {
    if (!drag) return;
    const pointerId = drag.pointerId;
    drag = null;
    try {
        if (canvas?.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    } catch { }
}

function notifyPreview(transform) {
    const p = vectorValue(transform.Position);
    const r = vectorValue(transform.Rotation);
    const s = vectorValue(transform.Scale, [1, 1, 1]);
    dotnet?.invokeMethodAsync('OnTransformPreviewAbsolute', drag.objectId, p[0], p[1], p[2], r[0], r[1], r[2], s[0], s[1], s[2]);
}

function hitAxis(x, y) {
    const labels = getAxisLabels();
    let best = 'None';
    let bestDistance = HIT_RADIUS;
    for (const axis of AXES) {
        const label = labels[axis];
        if (!label) continue;
        const distance = Math.hypot(x - label.x, y - label.y);
        if (distance < bestDistance) {
            best = axis;
            bestDistance = distance;
        }
    }
    return best;
}

function getAxisLabels() {
    const result = {};
    const root = canvas?.parentElement;
    if (!root) return result;
    for (const element of root.querySelectorAll('span')) {
        const axis = element.textContent?.trim();
        if (!AXES.includes(axis)) continue;
        const rect = element.getBoundingClientRect();
        result[axis] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return result;
}

function estimateGizmoCenter(labels) {
    const values = AXES.map(axis => labels[axis]).filter(Boolean);
    if (!values.length) return { x: 0, y: 0 };
    return {
        x: values.reduce((sum, value) => sum + value.x, 0) / values.length,
        y: values.reduce((sum, value) => sum + value.y, 0) / values.length
    };
}

function getSelectedObject() {
    return scene.Objects?.find(object => object.Id === scene.SelectedObjectId) ?? null;
}

function getPointerPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function cloneTransform(transform) {
    const p = vectorValue(transform?.Position);
    const r = vectorValue(transform?.Rotation);
    const s = vectorValue(transform?.Scale, [1, 1, 1]);
    return {
        Position: { X: p[0], Y: p[1], Z: p[2] },
        Rotation: { X: r[0], Y: r[1], Z: r[2] },
        Scale: { X: s[0], Y: s[1], Z: s[2] }
    };
}

function vectorValue(value, fallback = [0, 0, 0]) {
    return value ? [value.X ?? value.x ?? fallback[0], value.Y ?? value.y ?? fallback[1], value.Z ?? value.z ?? fallback[2]] : fallback;
}
function axisVector(axis) { return axis === 'X' ? [1, 0, 0] : axis === 'Y' ? [0, 1, 0] : [0, 0, 1]; }
function axisIndex(axis) { return axis === 'X' ? 0 : axis === 'Y' ? 1 : 2; }
function normalize2(value) { const length = Math.hypot(value[0], value[1]) || 1; return { x: value[0] / length, y: value[1] / length }; }
