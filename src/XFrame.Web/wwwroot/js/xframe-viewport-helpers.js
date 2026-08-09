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
    root.classList.add('xframe