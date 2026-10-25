export interface Position {x: number; y: number}
export type InputAction = 'pointer'|'grab-start'|'grab-held'|'grab-release'|'pointer-lost'|'input-disabled';
export interface GameInputEvent {type:InputAction;pointerId:string;source:'mouse'|'hand';position?:Position;targetId?:number}
export type InputSink = (event:GameInputEvent)=>void;
export function attachMouse(surface: HTMLElement, sink: InputSink, width: number, height: number) {
  const point = (event: PointerEvent) => {const r = surface.getBoundingClientRect(); return {x: (event.clientX-r.left)*width/r.width, y: (event.clientY-r.top)*height/r.height};};
  let down=false;
  const emit=(type:InputAction,position?:Position)=>sink({type,pointerId:'mouse',source:'mouse',position});
  surface.addEventListener('pointerdown', event => {if (event.button !== 0) return;down=true;surface.setPointerCapture(event.pointerId);emit('grab-start',point(event));});
  surface.addEventListener('pointermove', event => emit(down?'grab-held':'pointer',point(event)));
  surface.addEventListener('pointerup', event => {down=false;emit('grab-release',point(event));});
  surface.addEventListener('pointercancel', () => {down=false;emit('input-disabled');});
  surface.addEventListener('lostpointercapture', () => {if(down)emit('input-disabled');down=false;});
}
