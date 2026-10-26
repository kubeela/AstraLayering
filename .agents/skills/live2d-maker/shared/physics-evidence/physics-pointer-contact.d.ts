export const pointerContactVersion: string;
export function sweptPointerContact(body:any,layers:any[],from:number[],to:number[],radius:number):number[]|null;
export function pointerCommand(body:any,layers:any[],from:number[],to:number[],dt:number,radius:number,force?:number):{type:string;id:string;args:number[]}|null;
