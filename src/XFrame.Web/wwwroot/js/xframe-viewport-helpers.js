let canvas = null;
let root = null;
let overlay = null;
let toolbar = null;
let axisBadge = null;
let pointerMoveHandler = null;
let pointerDownHandler = null;
let pointerUpHandler = null;
let resizeHandler = null;
let middlePan = null;

const AXES = ['X', 'Y', 'Z'];
const AXIS_COLORS = { X: 'var(--mud-palette-error)', Y: 'var(--mud-palette-success)', Z: 'var(--mud-palette-info)' };

export function initialize(canvasId) {
    canvas = document.getElementById(canvasId); root = canvas?.parentElement ?? null;
    if (!canvas || !root || canvas.dataset.xframeViewportHelpers === 'true') return;
    canvas.dataset.xframeViewportHelpers = 'true';
    overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); overlay.classList.add('xframe-viewport-overlay'); overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, { position:'fixed', pointerEvents:'none', zIndex:'5', overflow:'hidden' }); document.body.appendChild(overlay);
    toolbar = document.createElement('div'); toolbar.className='xframe-viewport-helper-status'; toolbar.setAttribute('aria-hidden','true'); axisBadge=document.createElement('div'); axisBadge.className='xframe-axis-badge'; axisBadge.textContent='Eixo: —'; toolbar.appendChild(axisBadge); document.body.appendChild(toolbar);
    pointerMoveHandler=event=>{ updateAxisHover(event); updateMiddlePan(event); };
    pointerDownHandler=event=>{ updateAxisHover(event); if(event.button!==1)return; middlePan={pointerId:event.pointerId,x:event.clientX,y:event.clientY}; try{canvas.setPointerCapture(event.pointerId);}catch{} canvas.style.cursor='grabbing'; event.preventDefault(); event.stopPropagation(); };
    pointerUpHandler=event=>{ if(!middlePan||event.pointerId!==middlePan.pointerId)return; middlePan=null; canvas.style.cursor=''; try{if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);}catch{} event.preventDefault(); event.stopPropagation(); };
    resizeHandler=()=>updateOverlayBounds();
    canvas.addEventListener('pointermove',pointerMoveHandler,{passive:false}); canvas.addEventListener('pointerdown',pointerDownHandler,{passive:false}); canvas.addEventListener('pointerup',pointerUpHandler,{passive:false}); canvas.addEventListener('pointercancel',pointerUpHandler,{passive:false}); canvas.addEventListener('lostpointercapture',pointerUpHandler,{passive:false}); window.addEventListener('resize',resizeHandler);
    updateOverlayBounds(); drawGrid();
}
export function setActiveAxis(axis){const value=AXES.includes(axis)?axis:'None';if(canvas)canvas.dataset.activeAxis=value;if(axisBadge)axisBadge.textContent=value==='None'?'Eixo: —':`Eixo: ${value}`;drawAxisOverlay(value);}
export function setThemeAwareGrid(enabled=true){if(overlay)overlay.hidden=!enabled;}
export function resetCamera(){const cubeButton=[...(root?.querySelectorAll('button')??[])].find(button=>button.textContent?.trim()==='ISO TFR');if(cubeButton){cubeButton.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));return;}window.dispatchEvent(new CustomEvent('xframe-camera-reset'));}
function updateOverlayBounds(){if(!canvas||!overlay||!toolbar)return;const rect=canvas.getBoundingClientRect();Object.assign(overlay.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});Object.assign(toolbar.style,{position:'fixed',left:`${rect.left+14}px`,top:`${rect.top+14}px`});drawAxisOverlay(canvas.dataset.activeAxis||'None');}
function updateAxisHover(event){if(!canvas||event.target!==canvas||middlePan)return;const axis=detectAxisHover(event.clientX,event.clientY);if(axisBadge)axisBadge.textContent=axis==='None'?'Eixo: —':`Hover: ${axis}`;drawAxisOverlay(axis);}
function updateMiddlePan(event){if(!middlePan||event.pointerId!==middlePan.pointerId)return;const dx=event.clientX-middlePan.x,dy=event.clientY-middlePan.y;middlePan.x=event.clientX;middlePan.y=event.clientY;if(dx===0&&dy===0)return;window.dispatchEvent(new CustomEvent('xframe-camera-pan',{detail:{dx,dy}}));event.preventDefault();event.stopPropagation();}
function drawGrid(){if(!overlay||!canvas)return;const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),fragment=document.createDocumentFragment(),spacing=24,major=spacing*5;for(let x=0;x<=width;x+=spacing)fragment.appendChild(svgLine(x,0,x,height,x%major===0?'var(--mud-palette-primary)':'var(--mud-palette-divider)',x%major===0?.20:.10));for(let y=0;y<=height;y+=spacing)fragment.appendChild(svgLine(0,y,width,y,y%major===0?'var(--mud-palette-primary)':'var(--mud-palette-divider)',y%major===0?.20:.10));overlay.replaceChildren(fragment);}
function drawAxisOverlay(axis){drawGrid();if(!overlay||!canvas||!AXES.includes(axis))return;const labels=[...(root?.querySelectorAll('span')??[])].filter(element=>AXES.includes(element.textContent?.trim())),target=labels.find(element=>element.textContent?.trim()===axis);if(!target)return;const canvasRect=canvas.getBoundingClientRect(),labelRect=target.getBoundingClientRect(),points=labels.map(element=>{const r=element.getBoundingClientRect();return{x:r.left+r.width/2-canvasRect.left,y:r.top+r.height/2-canvasRect.top};});if(!points.length)return;const center={x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length},end={x:labelRect.left+labelRect.width/2-canvasRect.left,y:labelRect.top+labelRect.height/2-canvasRect.top},line=svgLine(center.x,center.y,end.x,end.y,AXIS_COLORS[axis],.95);line.setAttribute('stroke-width','8');line.setAttribute('stroke-linecap','round');overlay.appendChild(line);}
function svgLine(x1,y1,x2,y2,stroke,opacity){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',String(x1));line.setAttribute('y1',String(y1));line.setAttribute('x2',String(x2));line.setAttribute('y2',String(y2));line.setAttribute('stroke',stroke);line.setAttribute('opacity',String(opacity));line.setAttribute('shape-rendering','crispEdges');return line;}
function detectAxisHover(clientX,clientY){if(!root||!canvas)return'None';const rect=canvas.getBoundingClientRect();let closest='None',distance=28;for(const element of root.querySelectorAll('span')){const axis=element.textContent?.trim();if(!AXES.includes(axis))continue;const bounds=element.getBoundingClientRect(),x=Math.max(bounds.left,Math.min(clientX,bounds.right)),y=Math.max(bounds.top,Math.min(clientY,bounds.bottom)),d=Math.hypot(clientX-x,clientY-y);if(d<distance&&clientX>=rect.left&&clientX<=rect.right&&clientY>=rect.top&&clientY<=rect.bottom){closest=axis;distance=d;}}return closest;}
export function dispose(){canvas?.removeEventListener('pointermove',pointerMoveHandler);canvas?.removeEventListener('pointerdown',pointerDownHandler);canvas?.removeEventListener('pointerup',pointerUpHandler);canvas?.removeEventListener('pointercancel',pointerUpHandler);canvas?.removeEventListener('lostpointercapture',pointerUpHandler);window.removeEventListener('resize',resizeHandler);canvas?.style.removeProperty('cursor');overlay?.remove();toolbar?.remove();if(canvas){delete canvas.dataset.xframeViewportHelpers;delete canvas.dataset.activeAxis;}canvas=null;root=null;overlay=null;toolbar=null;axisBadge=null;pointerMoveHandler=null;pointerDownHandler=null;pointerUpHandler=null;resizeHandler=null;middlePan=null;}
