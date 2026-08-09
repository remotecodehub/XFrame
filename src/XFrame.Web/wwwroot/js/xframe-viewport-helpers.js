let canvas = null;
let root = null;
let overlay = null;
let toolbar = null;
let resetButton = null;
let axisBadge = null;
let pointerMoveHandler = null;
let pointerDownHandler = null;
let pointerUpHandler = null;
let middlePan = null;

const AXES = ['X', 'Y', 'Z'];
const AXIS_COLORS = {
    X: 'var(--mud-palette-error)',
    Y: 'var(--mud-palette-success)',
    Z: 'var(--mud-palette-info)'
};

export function initialize(canvasId) {
    canvas = document.getElementById(canvasId);
    root = canvas?.parentElement ?? null;
    if (!canvas || !root || root.dataset.xframeViewportHelpers === 'true') return;

    root.dataset.xframeViewportHelpers = 'true';
    root.classList.add('xframe-viewport-overlay-host');

    overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.classList.add('xframe-viewport-overlay');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '2',
        overflow: 'hidden'
    });
    root.appendChild(overlay);

    toolbar = document.createElement('div');
    toolbar.className = 'xframe-viewport-helper-status';
    toolbar.setAttribute('aria-hidden', 'true');
    axisBadge = document.createElement('div');
    axisBadge.className = 'xframe-axis-badge';
    axisBadge.textContent = 'Eixo: —';
    toolbar.appendChild(axisBadge);
    root.appendChild(toolbar);

    pointerMoveHandler = event => {
        updateAxisHover(event);
        updateMiddlePan(event);
    };
    pointerDownHandler = event => {
        updateAxisHover(event);
        if (event.button === 1) {
            middlePan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
            try { canvas.setPointerCapture(event.pointerId); } catch { }
            canvas.style.cursor = 'grabbing';
            event.preventDefault();
            event.stopPropagation();
        }
    };
    pointerUpHandler = event => {
        if (!middlePan || event.pointerId !== middlePan.pointerId) return;
        middlePan = null;
        canvas.style.cursor = '';
        try { if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch { }
        event.preventDefault();
        event.stopPropagation();
    };

    canvas.addEventListener('pointermove', pointerMoveHandler, { passive: false });
    canvas.addEventListener('pointerdown', pointerDownHandler, { passive: false });
    canvas.addEventListener('pointerup', pointerUpHandler, { passive: false });
    canvas.addEventListener('pointercancel', pointerUpHandler, { passive: false });
    canvas.addEventListener('lostpointercapture', pointerUpHandler, { passive: false });

    drawGrid();
}

export function setActiveAxis(axis) {
    const value = AXES.includes(axis) ? axis : 'None';
    if (root) root.dataset.activeAxis = value;
    if (axisBadge) axisBadge.textContent = value === 'None' ? 'Eixo: —' : `Eixo: ${value}`;
    drawGrid();
    drawAxisOverlay(value);
}

export function setThemeAwareGrid(enabled = true) {
    if (overlay) overlay.hidden = !enabled;
}

export function resetCamera() {
    window.dispatchEvent(new CustomEvent('xframe-camera-reset'));
}

function updateAxisHover(event) {
    if (!canvas || event.target !== canvas || middlePan) return;
    const axis = detectAxisHover(event.clientX, event.clientY);
    if (axisBadge) axisBadge.textContent = axis === 'None' ? 'Eixo: —' : `Hover: ${axis}`;
    drawAxisOverlay(axis);
}

function updateMiddlePan(event) {
    if (!middlePan || event.pointerId !== middlePan.pointerId) return;
    const dx = event.clientX - middlePan.x;
    const dy = event.clientY - middlePan.y;
    middlePan.x = event.clientX;
    middlePan.y = event.clientY;
    if (dx === 0 && dy === 0) return;
    window.dispatchEvent(new CustomEvent('xframe-camera-pan', { detail: { dx, dy } }));
    event.preventDefault();
    event.stopPropagation();
}

function drawGrid() {
    if (!overlay || !canvas) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const fragment = document.createDocumentFragment();
    const spacing = 24;
    const major = spacing * 5;

    for (let x = 0; x <= width; x += spacing) {
        const line = svgLine(x, 0, x, height, x % major === 0 ? 'var(--mud-palette-primary)' : 'var(--mud-palette-divider)', x % major === 0 ? 0.20 : 0.10);
        fragment.appendChild(line);
    }
    for (let y = 0; y <= height; y += spacing) {
        const line = svgLine(0, y, width, y, y % major === 0 ? 'var(--mud-palette-primary)' : 'var(--mud-palette-divider)', y % major === 0 ? 0.20 : 0.10);
        fragment.appendChild(line);
    }
    overlay.replaceChildren(fragment);
}

function drawAxisOverlay(axis) {
    if (!overlay || !canvas || !AXES.includes(axis)) return;
    const labels = [...(root?.querySelectorAll('span') ?? [])].filter(element => AXES.includes(element.textContent?.trim()));
    const target = labels.find(element => element.textContent?.trim() === axis);
    if (!target) return;
    const canvasRect = canvas.getBoundingClientRect();
    const labelRect = target.getBoundingClientRect();
    const points = labels.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 - canvasRect.left, y: rect.top + rect.height / 2 - canvasRect.top };
    });
    if (!points.length) return;
    const center = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length
    };
    const end = { x: labelRect.left + labelRect.width / 2 - canvasRect.left, y: labelRect.top + labelRect.height / 2 - canvasRect.top };
    const line = svgLine(center.x, center.y, end.x, end.y, AXIS_COLORS[axis], 0.95);
    line.setAttribute('stroke-width', '8');
    line.setAttribute('stroke-linecap', 'round');
    overlay.appendChild(line);
}

function svgLine(x1, y1, x2, y2, stroke, opacity) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', stroke);
    line.setAttribute('opacity', String(opacity));
    line.setAttribute('shape-rendering', 'crispEdges');
    return line;
}

function detectAxisHover(clientX, clientY) {
    if (!root || !canvas) return 'None';
    const rect = canvas.getBoundingClientRect();
    let closest = 'None';
    let distance = 28;
    for (const element of root.querySelectorAll('span')) {
        const axis = element.textContent?.trim();
        if (!AXES.includes(axis)) continue;
        const bounds = element.getBoundingClientRect();
        const x = Math.max(bounds.left, Math.min(clientX, bounds.right));
        const y = Math.max(bounds.top, Math.min(clientY, bounds.bottom));
        const d = Math.hypot(clientX - x, clientY - y);
        if (d < distance && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            closest = axis;
            distance = d;
        }
    }
    return closest;
}

export function dispose() {
    canvas?.removeEventListener('pointermove', pointerMoveHandler);
    canvas?.removeEventListener('pointerdown', pointerDownHandler);
    canvas?.removeEventListener('pointerup', pointerUpHandler);
    canvas?.removeEventListener('pointercancel', pointerUpHandler);
    canvas?.removeEventListener('lostpointercapture', pointerUpHandler);
    canvas?.style.removeProperty('cursor');
    overlay?.remove();
    toolbar?.remove();
    if (root) {
        delete root.dataset.xframeViewportHelpers;
        delete root.dataset.activeAxis;
        root.classList.remove('xframe-viewport-overlay-host');
    }
    canvas = null;
    root = null;
    overlay = null;
    toolbar = null;
    resetButton = null;
    axisBadge = null;
    pointerMoveHandler = null;
    pointerDownHandler = null;
    pointerUpHandler = null;
    middlePan = null;
}
