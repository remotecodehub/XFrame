let canvas = null;
let dotnet = null;
let renderer = null;
let tool = 'Select';
let scene = { Objects: [], SelectedObjectId: null, Tool: 'Select' };
let drag = null;
let initialized = false;
const AXES = ['X', 'Y', 'Z'];
const HIT_RADIUS = 40;
const TRANSLATE_SENSITIVITY = 0.05;

export async function initialize(canvasId, callback) { canvas=document.getElementById(canvasId); dotnet=callback; if(!canvas||initialized)return; renderer=await import('./xframe-webgpu.js'); canvas.addEventListener('pointerdown',pointerDown,true); canvas.addEventListener('pointermove',pointerMove,true); canvas.addEventListener('pointerup',pointerUp,true); canvas.addEventListener('pointercancel',pointerCancel,true); canvas.addEventListener('lostpointercapture',lostPointerCapture,true); initialized=true; }
export function setTool(nextTool){tool=nextTool||'Select';if(tool!=='Translate')cancelDrag();}
export function setScene(json){const incoming=typeof json==='string'?JSON.parse(json):json;if(!incoming)return;scene=incoming;if(drag){const object=scene.Objects?.find(o=>o.Id===drag.objectId);if(object)object.Transform=cloneTransform(drag.last);}}
export async function dispose(){if(canvas&&initialized){canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointermove',pointerMove,true);canvas.removeEventListener('pointerup',pointerUp,true);canvas.removeEventListener('pointercancel',pointerCancel,true);canvas.removeEventListener('lostpointercapture',lostPointerCapture,true);}initialized=false;drag=null;canvas=null;dotnet=null;renderer=null;}
function pointerDown(event){if(tool!=='Translate'||event.button!==0||drag)return;const selected=scene.Objects?.find(o=>o.Id===scene.SelectedObjectId);if(!selected)return;const point=pointerPoint(event),labels=axisLabels(),axis=hitAxis(point.x,point.y,labels);if(axis==='None')return;const position=vectorValue(selected.Transform?.Position),rotation=vectorValue(selected.Transform?.Rotation),scale=vectorValue(selected.Transform?.Scale,[1,1,1]),center=gizmoCenter(labels),direction=normalize2([labels[axis].x-center.x,labels[axis].y-center.y]);drag={pointerId:event.pointerId,objectId:selected.Id,axis,start:point,direction,position,rotation,scale,last:cloneTransform(selected.Transform)};try{canvas.setPointerCapture(event.pointerId);}catch{}event.preventDefault();event.stopImmediatePropagation();}
function pointerMove(event){if(!drag||event.pointerId!==drag.pointerId)return;const point=pointerPoint(event),delta=(point.x-drag.start.x)*drag.direction.x+(point.y-drag.start.y)*drag.direction.y,position=[...drag.position];position[axisIndex(drag.axis)]+=delta*TRANSLATE_SENSITIVITY;drag.last={Position:{X:position[0],Y:position[1],Z:position[2]},Rotation:{X:drag.rotation[0],Y:drag.rotation[1],Z:drag.rotation[2]},Scale:{X:drag.scale[0],Y:drag.scale[1],Z:drag.scale[2]}};applyPreview();event.preventDefault();event.stopImmediatePropagation();}
function pointerUp(event){if(!drag||event.pointerId!==drag.pointerId)return;finishDrag(event);}
function pointerCancel(event){if(!drag||event.pointerId!==drag.pointerId)return;finishDrag(event);}
function lostPointerCapture(event){if(!drag||event.pointerId!==drag.pointerId)return;finishDrag(event);}
function finishDrag(event){const current=drag;applyPreview();const t=cloneTransform(current.last),p=vectorValue(t.Position),r=vectorValue(t.Rotation),s=vectorValue(t.Scale,[1,1,1]);dotnet?.invokeMethodAsync('OnTransformCommitted',current.objectId,p[0],p[1],p[2],r[0],r[1],r[2],s[0],s[1],s[2]);try{if(canvas?.hasPointerCapture?.(current.pointerId))canvas.releasePointerCapture(current.pointerId);}catch{}drag=null;event.preventDefault();event.stopImmediatePropagation();}
function applyPreview(){if(!drag)return;const object=scene.Objects?.find(o=>o.Id===drag.objectId);if(!object)return;object.Transform=cloneTransform(drag.last);renderer?.render?.(JSON.stringify(scene));}
function cancelDrag(){if(!drag)return;try{if(canvas?.hasPointerCapture?.(drag.pointerId))canvas.releasePointerCapture(drag.pointerId);}catch{}drag=null;}
function axisLabels(){const result={},root=canvas?.parentElement,canvasRect=canvas?.getBoundingClientRect();if(!root||!canvasRect)return result;for(const element of root.querySelectorAll('span')){const axis=element.textContent?.trim();if(!AXES.includes(axis))continue;const rect=element.getBoundingClientRect();result[axis]={x:rect.left+rect.width/2-canvasRect.left,y:rect.top+rect.height/2-canvasRect.top};}return result;}
function hitAxis(x,y,labels){let best='None',distance=HIT_RADIUS;for(const axis of AXES){const label=labels[axis];if(!label)continue;const d=Math.hypot(x-label.x,y-label.y);if(d<distance){distance=d;best=axis;}}return best;}
function gizmoCenter(labels){const values=AXES.map(a=>labels[a]).filter(Boolean);if(!values.length)return{x:canvas.clientWidth/2,y:canvas.clientHeight/2};return{x:values.reduce((s,v)=>s+v.x,0)/values.length,y:values.reduce((s,v)=>s+v.y,0)/values.length};}
function pointerPoint(event){const rect=canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
function cloneTransform(t){const p=vectorValue(t?.Position),r=vectorValue(t?.Rotation),s=vectorValue(t?.Scale,[1,1,1]);return{Position:{X:p[0],Y:p[1],Z:p[2]},Rotation:{X:r[0],Y:r[1],Z:r[2]},Scale:{X:s[0],Y:s[1],Z:s[2]}};}
function vectorValue(v,f=[0,0,0]){return v?[v.X??v.x??f[0],v.Y??v.y??f[1],v.Z??v.z??f[2]]:f;}
function axisIndex(a){return a==='X'?0:a==='Y'?1:2;}
function normalize2(v){const l=Math.hypot(v[0],v[1])||1;return{x:v[0]/l,y:v[1]/l};}
