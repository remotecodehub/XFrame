let canvas = null;
let root = null;
let grid = null;
let toolbar = null;
let resetButton = null;
let axisBadge = null;
let pointerMoveHandler = null;
let pointerDownHandler = null;

const AXES = ['X', 'Y', 'Z'];

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
    if (axisBadge && axis !== 'None') axisBadge.textContent = `Hover: ${axis}`;
}

function detectAxisLabelHover(clientX, clientY) {
    if (!root) return 'None';
    const rect = canvas.getBoundingClientRect();
    let closest = 'None';
    let distance = 18;
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
    resetButton?.removeEventListener('click', resetCamera);
    grid?.remove();
    toolbar?.remove();
    if (root) {
        delete root.dataset.xframeViewportHelpers;
        root.classList.remove('xframe-viewport-host');
        delete root.dataset.activeAxis;
    }
    canvas = null;
    root = null;
    grid = null;
    toolbar = null;
    resetButton = null;
    axisBadge = null;
    pointerMoveHandler = null;
    pointerDownHandler = null;
}
