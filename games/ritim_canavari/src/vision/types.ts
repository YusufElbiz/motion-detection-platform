export interface Landmark { x:number; y:number; z?:number; visibility?:number; presence?:number }
export interface PosePacket { poses:Landmark[][]; timestamp:number; inferenceMs:number; frameAt:number }
export interface VisionSettings { model:'full'|'lite'; resolution:number; numPoses:1|2|3; delegate:'GPU'|'CPU' }
