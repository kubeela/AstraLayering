import type { PhysicsBinding } from './physics-model.js';
export type PhysicsPart = { id:string; uuid?:string; legacyId?:string; partPath?:string|null; contentHash?:string;
  sourceLayerUuids?:string[]; bounds?:{x:number;y:number;width:number;height:number} };
export type RecipeContext = { sourceHash:string; size:number[] };
export type RecipeRecord = { ref:any; binding:PhysicsBinding };
export type PhysicsRecipe = { schema:2; solver:string; sourceHash:string; size:number[]; records:Record<string,RecipeRecord> };
export function physicsRecipe(parts:PhysicsPart[], bindings:Map<string,PhysicsBinding>, context:RecipeContext, pending?:Map<string,RecipeRecord>):PhysicsRecipe;
export function restorePhysicsRecipe(recipe:any, parts:PhysicsPart[], context:RecipeContext, initial?:Map<string,PhysicsBinding>):{
  bindings:Map<string,PhysicsBinding>; pending:Map<string,RecipeRecord>; issues:{key:string;partPath?:string;reason:string}[]; migrated:boolean
};
export function physicsRecordKey(layer:PhysicsPart, context:RecipeContext):string;
