export interface Point {x: number; y: number; z: number}
export interface Bounds {left: number; top: number; right: number; bottom: number}
export type TrackingEngine='landmarks'|'gestures';
export interface ModelGesture {label:string;score:number}
export interface Detection {landmarks: Point[]; worldLandmarks?:Point[]; handedness: string; handednessScore: number; modelGesture?:ModelGesture}
export interface TrackedHand extends Detection {
  id: number;
  colorSlot: number;
  raw: Point[];
  wrist: Point;
  indexTip: Point;
  thumbTip: Point;
  palmCenter: Point;
}
export interface TrackingFrame {timestamp: number; hands: TrackedHand[]; ambiguous: boolean}
export interface InferenceResult {detections: Detection[]; latencyMs: number; timestamp: number; transferMs?:number}
export interface TrackingBackend {
  initialize(delegate: 'CPU' | 'GPU',engine?:TrackingEngine): Promise<'CPU' | 'GPU'>;
  infer(frame: ImageBitmap, timestamp: number): Promise<InferenceResult>;
  close(): void;
}
export type WorkerReply = {kind: 'ready'; delegate: 'CPU' | 'GPU'} | {kind: 'result'; result: InferenceResult} | {kind: 'error'; message: string};
