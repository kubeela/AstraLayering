export type PhysicsBinding = { enabled:boolean; kind:'cloth'|'ribbon'; direction:'up'|'down'|'left'|'right'; fixed:number; transition:number; maxAngle:number; maxTravel:number; stretch:number; stiffness:number; damping:number };
export const physicsVersion:string;
export function bindingDefaults(kind?: string):PhysicsBinding;
export function validateBinding(value:unknown):PhysicsBinding;
export class ClothBody {
  constructor(bounds:{x:number;y:number;width:number;height:number},binding:PhysicsBinding);
  binding:PhysicsBinding; rest:Float64Array; positions:Float64Array; velocity:Float64Array; weights:Float64Array; limits:Float64Array;
  maxDistance:number; freeLength:number; cols:number; rows:number; impulses:number;
  indices:Uint32Array;
  stats:{travel:number;angle:number;stretch:number;limited:boolean};
  reset():void; step(dt?:number):void; moving():boolean;
  impulse(x:number,y:number,vx:number,vy:number,radius:number):void;
  inspect(scale?:number):{valid:boolean;travel:number;angle:number;stretch:number};
  hit(x:number,y:number,layers:{bounds:{x:number;y:number;width:number;height:number};maskedRgba:Uint8ClampedArray}[]):boolean;
}
