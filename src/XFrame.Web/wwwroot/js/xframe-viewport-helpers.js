let canvas = null;
let root = null;
let grid = null;
let toolbar = null;
let resetButton = null;
let axisBadge = null;
let axisOverlay = null;
let pointerMoveHandler = null;
let pointerDownHandler = null;

const AXES = ['X', 'Y', 'Z'];
const AXIS_COLORS = { X: '#ef4444', Y: '#22c55e', Z: '#3b82f6' };

export function initialize(canvasId) {
    canvas = document.getElementById(canvasId);
    root = canvas?.parentElement ?? null;
    if (!canvas || !root || root.dataset.xframeViewportHelpers === 'true') return;
    root.dataset.xframeViewportHelpers = 'true';
    root.classList.add('xframe-viewport-host');
    grid = document.createElement('div');
    grid.className = 'xframe-viewport-grid';
    grid.setAttribute('aria-hidden', 'true');
    root.appendChild(grid);
    axisOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    axisOverlay.classList.add('xframe-axis-overlay');
    Object.assign(axisOverlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2', overflow: 'visible' });
    root.appendChild(axisOverlay);
    toolbar = document.createElement('div');
    toolbar.className = 'xframe-viewport-toolbar';
    resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'xframe-camera-reset';
    resetButton.title = 'Resetar visualização da câmera';
    resetButton.textContent = '↻';
    resetButton.addEventListener('click', resetCamera);
    toolbar.appendChild(resetButton);
    axisBadge = document.createElement('div');
    axisBadge.className = 'xframe-axis-badge';
    axisBadge.textContent = 'Eixo: —';
    toolbar.appendChild(axisBadge);
    root.appendChild(toolbar);
    pointerMoveHandler = event => updateAxisHover(event);
    pointerDownHandler = event => updateAxisHover(event);
    canvas.addEventListener('pointermove', pointerMoveHandler, { passive: true });
    canvas.addEventListener('pointerdown', pointerDownHandler, { passive: true });
}

export function setActiveAxis(axis) {
    const value = AXES.includes(axis) ? axis : 'None';
    if (root) root.dataset.activeAxis = value;
    if (axisBadge) axisBadge.textContent = value === 'None' ? 'Eixo: —' : `Eixo: ${value}`;
    drawAxisOverlay(value);
}

export function setThemeAwareGrid(enabled = true) {
    if (grid) grid.hidden = !enabled;
}

export function resetCamera() {
    const cubeButton = [...(root?.querySelectorAll('button') ?? [])].find(button => button.textContent?.trim() === 'ISO TFR');
    if (cubeButton) {
        cubeButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
        return;
    }
    window.dispatchEvent(new CustomEvent('xframe-camera-reset'));
}

function updateAxisHover(event) {
    if (event.target !== canvas) return;
    const axis = detectAxisLabelHover(event.clientX, event.clientY);
    if (axisBadge) axisBadge.textContent = axis === 'None' ? 'Eixo: —' : `Hover: ${axis}`;
    drawAxisOverlay(axis);
}

function drawAxisOverlay(axis) {
    if (!axisOverlay) return;
    axisOverlay.replaceChildren();
    if (!AXES.includes(axis)) return;
    const labels = [...(root?.querySelectorAll('span') ?? [])].filter(element => AXES.includes(element.textContent?.trim()));
    const target = labels.find(element => element.textContent?.trim() === axis);
    if (!target) return;
    const canvasRect = canvas.getBoundingClientRect();
    const labelRect = target.getBoundingClientRect();
    const points = labels.map(element => { const r = element.getBoundingClientRect(); return { x: r.left + r.width / 2 - canvasRect.left, y: r.top + r.height / 2 - canvasRect.top }; });
    if (!points.length) return;
    const center = { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
    const end = { x: labelRect.left + labelRect.width / 2 - canvasRect.left, y: labelRect.top + labelRect.height / 2 - canvasRect.top };
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(center.x));
    line.setAttribute('y1', String(center.y));
    line.setAttribute('x2', String(end.x));
    line.setAttribute('y2', String(end.y));
    line.setAttribute('stroke', AXIS_COLORS[axis]);
    line.setAttribute('stroke-width', '7');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.9');
    axisOverlay.appendChild(line);
}

function detectAxisLabelHover(clientX, clientY) {
    if (!root) return 'None';
    const rect = canvas.getBoundingClientRect();
    let closest = 'None';
    let distance = 24;
    for (const element of root.querySelectorAll('span')) {
        const axis = element.textContent?.trim();
        if (!AXES.includes(axis)) continue;
        const bounds = element.getBoundingClientRect();
        const x = Math.max(bounds.left, Math.min(clientX, bounds.right));
        const y = Math.max(bounds.top, Math.min(clientY, bounds.bottom));
        const d = Math.hypot(clientX - x, clientY - y);
        if (d < distance && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) { closest = axis; distance = d; }
    }
    return closest;
}

export function dispose() {
    canvas?.removeEventListener('pointermove', pointerMoveHandler);
    canvas?.removeEventListener('pointerdown', pointerDownHandler);
    resetButton?.removeEventListener('click', resetCamera);
    grid?.remove();
    axisOverlay?.remove();
    toolbar?.remove();
    if (root) { delete root.dataset.xframeViewportHelpers; root.classList.remove('xframe-viewport-host'); delete root.dataset.activeAxis; }
    canvas = null; root = null; grid = null; axisOverlay = null; toolbar = null; resetButton = null; axisBadge = null; pointerMoveHandler = null; pointerDownHandler = null;
}
