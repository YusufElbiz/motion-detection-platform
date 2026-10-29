import type {InputSink,Position} from '../input.ts';
import {config} from '../config.ts';
import {mapPoint,clamp01,palmCenter} from '../tracking/coordinates.ts';
import type {Bounds,TrackingFrame,TrackedHand} from '../tracking/types.ts';
import {motionConfig,type MotionSettings} from './config.ts';
import {PinchRecognizer,pinchRatio} from './pinch.ts';
import {DwellTimer} from './dwell.ts';
import {FistRecognizer,landmarkPose,fistDefaults,type PoseMeasurement,type FistState} from './fist.ts';
import {classifyPose,type PoseEvidence} from '../gesture-lab/geometry.ts';
import {gestureDefaults} from '../gesture-lab/gesture.ts';
import {permittedJump} from './continuity.ts';
// Anything hands can grab: the sorting playfield or the workshop.
export interface MotionWorld {
  heldBy(pointerId:string):number|undefined;
  objectAt(point:Position,pointerId:string):{id:number}|undefined;
  targetBin(point:Position):string|undefined;
}
export type MotionState='IDLE'|'HOVERING'|'GRAB_PENDING'|'CARRYING'|'RELEASE_PENDING'|'RELEASED'|'TRACKING_LOST';
interface HandContext {
  id:string;colorSlot:number;position:Position;state:MotionState;progress:number;
  lastSeen:number;readyAt:number;lostAt?:number;recoveryAt?:number;cooldownUntil:number;
  pinch:PinchRecognizer;dwell:DwellTimer;fist:FistRecognizer;
  measurement:PoseMeasurement&{evidence?:PoseEvidence;modelGesture?:TrackedHand['modelGesture']};rawPalm:{x:number;y:number};smoothPalm:{x:number;y:number};rawMapped:Position;angle:number;unknownAt?:number;
}
export interface HandCursor {id:string;colorSlot:number;position:Position;state:MotionState;progress:number;carrying:boolean;gesture:FistState;angle:number}
export function mapHandPoint(point:{x:number;y:number;z:number},bounds:Bounds|undefined,sensitivity:number){
  const mapped=mapPoint(point,1,1,true,bounds);
  const gain=Math.max(.7,Math.min(1.6,sensitivity));
  return {x:clamp01(.5+(mapped.x-.5)*gain)*config.width,y:clamp01(.5+(mapped.y-.5)*gain)*config.height};
}
export function clampPalmAnchor(position:Position):Position {
  // Same visible-center limits used by InteractionController.move(). No palm /
  // object separation when the calibrated reach maps beyond a playfield edge.
  return {x:Math.max(50,Math.min(1230,position.x)),y:Math.max(130,Math.min(675,position.y))};
}
export class MotionInput {
  settings:MotionSettings={...motionConfig};
  bounds?:Bounds;
  aspect=4/3;
  thresholds={...fistDefaults,confirmMs:60,modelEnter:gestureDefaults.threshold,modelKeep:gestureDefaults.threshold-.12};
  records:{type:string;pointerId:string;at:number;confirmationMs:number;sampleToDispatchMs:number;state:MotionState;gesture:FistState;sampleGapMs:number}[]=[];
  private contexts=new Map<string,HandContext>();
  private lastFrame=-Infinity;
  private enabled=false;
  private world:MotionWorld;
  private sink:InputSink;
  constructor(world:MotionWorld,sink:InputSink){this.world=world;this.sink=sink;}
  // Switching worlds releases every carry first; nothing moves between scenes.
  useWorld(world:MotionWorld){this.reset();this.world=world;}
  get cursors():HandCursor[]{return [...this.contexts.values()].map(c=>({id:c.id,colorSlot:c.colorSlot,position:{...c.position},state:c.state,progress:c.progress,carrying:this.world.heldBy(c.id)!==undefined,gesture:c.fist.state,angle:c.angle}));}
  get diagnostics(){return [...this.contexts.values()].map(c=>({id:c.id,gesture:c.fist.state,measurement:c.measurement,rawPalm:c.rawPalm,smoothedPalm:c.smoothPalm,rawMapped:c.rawMapped,mapped:c.position,confirmationMs:c.fist.lastConfirmationMs,objectId:this.world.heldBy(c.id)??null,state:c.state}));}
  enable(){this.reset();this.enabled=true;}
  disable(){this.reset();this.enabled=false;}
  reset(){for(const context of this.contexts.values())this.emit(context,'input-disabled');this.contexts.clear();this.lastFrame=-Infinity;}
  update(frame:TrackingFrame,now=frame.timestamp){
    if(!this.enabled||frame.timestamp<=this.lastFrame)return;this.lastFrame=frame.timestamp;
    for(const handId of frame.suppressedHandIds??[]){
      const id=`hand-${handId}`,context=this.contexts.get(id);
      if(context){this.emit(context,'input-disabled');this.contexts.delete(id);}
    }
    if(frame.ambiguous){
      // Association during overlap is not trustworthy: never transfer a carry.
      for(const context of this.contexts.values()){if(this.settings.method!=='fist')this.emit(context,'input-disabled');this.lose(context,now);}
      this.tick(now);return;
    }
    const seen=new Set<string>(),present=new Set(frame.hands.map(hand=>`hand-${hand.id}`));
    for(const hand of frame.hands.slice(0,2)){
      const id=`hand-${hand.id}`;seen.add(id);
      const anchor=this.settings.method==='fist'?hand.palmCenter:hand.indexTip;
      const mappedAnchor=mapHandPoint(anchor,this.bounds,this.settings.sensitivity);
      const position=this.settings.method==='fist'?clampPalmAnchor(mappedAnchor):mappedAnchor;
      // Fist mode already measures all four fingers in classifyPose. Avoid the
      // unused pinch and second legacy geometry pass on every hand/sample.
      const ratio=this.settings.method==='pinch'?pinchRatio(hand.raw,this.aspect):undefined;
      const geometry:PoseMeasurement=this.settings.method==='fist'?{pose:'UNKNOWN',score:0,source:'heuristic',fingers:[]}:landmarkPose(hand.raw,this.aspect,this.thresholds);
      // Same color slot with a new track ID cannot inherit the previous carry.
      // A different hand still visible in this frame is not an inheritance.
      for(const old of this.contexts.values())if(old.id!==id&&!present.has(old.id)&&old.colorSlot===hand.colorSlot){this.emit(old,'input-disabled');this.contexts.delete(old.id);}
      let context=this.contexts.get(id);
      if(context)context.colorSlot=hand.colorSlot;
      if(!context){context={id,colorSlot:hand.colorSlot,position,state:'IDLE',progress:0,lastSeen:now,readyAt:now,cooldownUntil:0,pinch:new PinchRecognizer(),dwell:new DwellTimer(),fist:new FistRecognizer(),measurement:geometry,rawPalm:palmCenter(hand.raw),smoothPalm:hand.palmCenter,rawMapped:position,angle:0};this.contexts.set(id,context);}
      if(this.settings.method==='fist'){
        // Use the SAME 3D decision as the accepted laboratory. Keep the game
        // ownership/arming/release state machine; raw model None is not a veto.
        const evidence=classifyPose({...hand,landmarks:hand.raw},context.fist.stable,{threshold:this.thresholds.modelEnter,openMs:this.thresholds.confirmMs,closedMs:this.thresholds.confirmMs},this.aspect);
        const modelSource=evidence.source==='model'||evidence.source==='agreement';
        context.measurement={pose:evidence.pose,source:modelSource?'model':'heuristic',score:modelSource?(hand.modelGesture?.score??0):Math.max(evidence.geometry.extended,evidence.geometry.curled)/4,fingers:geometry.fingers,evidence,modelGesture:hand.modelGesture};
      }else context.measurement=geometry;
      context.rawPalm=palmCenter(hand.raw);context.smoothPalm=hand.palmCenter;
      const rawMapped=mapHandPoint(this.settings.method==='fist'?palmCenter(hand.raw):hand.raw[8],this.bounds,this.settings.sensitivity);
      context.rawMapped=this.settings.method==='fist'?clampPalmAnchor(rawMapped):rawMapped;
      const wrist=mapHandPoint(hand.wrist,this.bounds,this.settings.sensitivity);
      context.angle=Math.atan2(wrist.y-mappedAnchor.y,wrist.x-mappedAnchor.x)*180/Math.PI-90;
      if(ratio===undefined&&this.settings.method==='pinch'){this.lose(context,now);continue;}
      if(now-context.lastSeen>this.settings.maxEvidenceGapMs)this.lose(context,context.lastSeen+this.settings.maxEvidenceGapMs);
      if(context.state==='TRACKING_LOST'){
        const held=this.world.heldBy(id)!==undefined;
        if(now-context.lostAt!>this.settings.lossGraceMs||Math.hypot(position.x-context.position.x,position.y-context.position.y)>this.settings.recoveryDistance||(held&&this.settings.method==='pinch'&&ratio!>this.settings.pinchClose)||(held&&this.settings.method==='fist'&&context.measurement.pose!=='CLOSED')){
          this.rearm(context,position,now);
        }else{
          context.lastSeen=now;context.recoveryAt??=now;
          if(now-context.recoveryAt<this.settings.recoveryStableMs)continue;
          context.state=held?'CARRYING':'IDLE';context.lostAt=undefined;context.recoveryAt=undefined;context.dwell.reset();
          if(held){context.pinch.resumeCarry();context.fist.resumeCarry();}else{context.pinch.reset();context.fist.reset();context.readyAt=now;}
        }
      }
      const jumpLimit=this.settings.method==='fist'?permittedJump(this.settings.maxJumpDistance,now-context.lastSeen):this.settings.maxJumpDistance;
      if(Math.hypot(position.x-context.position.x,position.y-context.position.y)>jumpLimit){this.rearm(context,position,now);continue;}
      context.position=position;context.lastSeen=now;
      this.emit(context,'pointer');
      if(now-context.readyAt<this.settings.handReadyMs)continue;
      if(this.world.heldBy(id)!==undefined)this.emit(context,'grab-held');
      if(this.settings.method==='fist')this.fist(context,now);
      else if(this.settings.method==='pinch'){context.fist.update(geometry.pose,now);this.pinch(context,ratio!,now);}
      else {context.fist.update(geometry.pose,now);this.dwell(context,now);}
    }
    for(const context of this.contexts.values())if(!seen.has(context.id))this.lose(context,now);
    this.tick(now);
  }
  tick(now:number){
    if(!this.enabled)return;
    for(const context of this.contexts.values()){
      if(now-context.lastSeen>this.settings.maxEvidenceGapMs)this.lose(context,context.lastSeen+this.settings.maxEvidenceGapMs);
      if(context.lostAt!==undefined&&now-context.lostAt>this.settings.lossGraceMs){this.emit(context,'input-disabled');this.contexts.delete(context.id);}
    }
  }
  private emit(context:HandContext,type:Parameters<InputSink>[0]['type'],targetId?:number){
    if(type==='grab-start'||type==='grab-release'||type==='input-disabled'||type==='pointer-lost'){
      this.records.push({type,pointerId:context.id,at:performance.now(),confirmationMs:context.fist.lastConfirmationMs,sampleToDispatchMs:Math.max(0,performance.now()-this.lastFrame),state:context.state,gesture:context.fist.state,sampleGapMs:Math.max(0,performance.now()-context.lastSeen)});if(this.records.length>30)this.records.shift();
    }
    this.sink({type,pointerId:context.id,position:context.position,source:'hand',targetId});
  }
  private lose(context:HandContext,now:number){
    if(context.state==='TRACKING_LOST')return;
    context.state='TRACKING_LOST';context.lostAt=now;context.recoveryAt=undefined;context.progress=0;context.dwell.reset();this.emit(context,'pointer-lost');
  }
  private rearm(context:HandContext,position:Position,now:number){
    this.emit(context,'input-disabled');context.position=position;context.lastSeen=now;context.readyAt=now;context.state='IDLE';context.progress=0;context.lostAt=undefined;context.recoveryAt=undefined;context.unknownAt=undefined;context.dwell.reset();context.pinch.reset();context.fist.reset();
  }
  private fist(context:HandContext,now:number){
    context.fist.confirmationMs=Math.max(60,this.thresholds.confirmMs);
    context.fist.minimumSamples=2;
    const object=this.world.objectAt(context.position,context.id);
    const result=context.fist.update(context.measurement.pose,now);
    if(context.measurement.pose==='UNKNOWN'){
      context.unknownAt??=now;
      if(now-context.unknownAt>220){this.lose(context,now);return;}
    }else context.unknownAt=undefined;
    if(result.grabbed&&object)this.emit(context,'grab-start',object.id);
    const held=this.world.heldBy(context.id)!==undefined;
    if(result.released&&held){this.emit(context,'grab-release');context.state='RELEASED';context.progress=0;return;}
    context.state=held?(context.fist.state==='OPENING'?'RELEASE_PENDING':'CARRYING'):context.fist.state==='CLOSING'?'GRAB_PENDING':object?'HOVERING':'IDLE';
    context.progress=0; // Fist control has no dwell ring or long hold requirement.
  }
  private pinch(context:HandContext,ratio:number,now:number){
    const result=context.pinch.update(ratio,now);
    const object=this.world.objectAt(context.position,context.id);
    if(result.started&&now>=context.cooldownUntil)this.emit(context,'grab-start',object?.id);
    const held=this.world.heldBy(context.id)!==undefined;
    if(result.released&&held){this.emit(context,'grab-release');context.state='RELEASED';context.cooldownUntil=now+this.settings.cooldownMs;context.progress=0;return;}
    context.state=held?(context.pinch.state==='RELEASING'?'RELEASE_PENDING':'CARRYING'):context.pinch.state==='CLOSING'?'GRAB_PENDING':object?'HOVERING':'IDLE';
    context.progress=context.pinch.state==='CLOSING'?.5:context.pinch.state==='RELEASING'?.7:0;
  }
  private dwell(context:HandContext,now:number){
    if(now<context.cooldownUntil){context.state='RELEASED';context.progress=0;context.dwell.reset();return;}
    if(this.world.heldBy(context.id)!==undefined){
      const bin=this.world.targetBin(context.position);
      const result=context.dwell.update(bin?`bin-${bin}`:undefined,now,this.settings.dwellReleaseMs);
      context.state=bin?'RELEASE_PENDING':'CARRYING';context.progress=result.progress;
      if(result.complete){this.emit(context,'grab-release');context.state='RELEASED';context.cooldownUntil=now+this.settings.cooldownMs;context.dwell.reset();context.progress=0;}
    }else{
      const object=this.world.objectAt(context.position,context.id);
      const result=context.dwell.update(object?`object-${object.id}`:undefined,now,this.settings.dwellGrabMs);
      context.state=object?(result.progress>0?'GRAB_PENDING':'HOVERING'):'IDLE';context.progress=result.progress;
      if(result.complete){this.emit(context,'grab-start',object?.id);context.dwell.reset();context.progress=0;if(this.world.heldBy(context.id)!==undefined)context.state='CARRYING';}
    }
  }
}
