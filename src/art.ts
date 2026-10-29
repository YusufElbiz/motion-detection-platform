import type {Category} from './config.ts';
import {wasteDefinition,variantsFor} from './waste.ts';

// Local, transparent, photorealistic PNGs for both falling waste and bin examples.
export function wasteArt(category:Category,variant?:string):string {
 const requested=wasteDefinition(variant);
 const item=requested?.category===category?requested:variantsFor(category)[0];
 return `<img class="waste-photo" src="/waste/${item.id}.png" alt="" draggable="false" decoding="async" width="512" height="512" />`;
}
export {landscape} from './environment.ts';
