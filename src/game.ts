import {categories,categoryIds, config, type Category, type Difficulty} from './config.ts';
import {variantsFor,wasteDefinition} from './waste.ts';
export interface Waste {id: number; category: Category; variant?:string; x: number; y: number}
export interface GameState {objects: Waste[]; score: number; goal:number; nextId: number; elapsed: number; spawned: number; complete: boolean;categoryBag?:Category[];variantBags?:Partial<Record<Category,string[]>>}
export const createState = (goal:number=config.goal): GameState => ({objects: [], score: 0, goal:Number.isFinite(goal)?Math.max(1,Math.min(40,Math.round(goal))):config.goal, nextId: 1, elapsed: 0, spawned: 0, complete: false});
export const classify = (waste: Category, bin: Category) => waste === bin;
export function wasteName(waste:Waste){const definition=wasteDefinition(waste.variant);return definition?.category===waste.category?definition.name:categories[waste.category].name;}
export function spawn(state: GameState,random:()=>number=Math.random) {
  const draw=<T>(bag:T[])=>bag.splice(Math.min(bag.length-1,Math.floor(random()*bag.length)),1)[0];
  // A random draw without replacement gives variety without starving a category.
  if(!state.categoryBag?.length)state.categoryBag=[...categoryIds];
  const category=draw(state.categoryBag);
  state.variantBags??={};
  if(!state.variantBags[category]?.length)state.variantBags[category]=variantsFor(category).map(item=>item.id);
  const variant=draw(state.variantBags[category]!);
  // Position has no category/bin input. Prefer space away from other objects.
  let x=110+random()*1060,bestGap=-1;
  for(let attempt=0;attempt<12;attempt++){
    const candidate=attempt===0?x:110+random()*1060;
    const gap=state.objects.length?Math.min(...state.objects.map(object=>Math.abs(object.x-candidate))):Infinity;
    if(gap>bestGap){x=candidate;bestGap=gap;}
    if(gap>=125)break;
  }
  state.spawned++;
  state.objects.push({id:state.nextId++,category,variant,x,y:155});
}
export function advance(state: GameState, seconds: number, difficulty: Difficulty, held: number | null | ReadonlySet<number>) {
  if (state.complete) return;
  const dt = Math.max(0, Math.min(seconds, 0.05));
  const settings = config.difficulties[difficulty];
  state.elapsed += dt;
  if (state.elapsed >= settings.interval && state.objects.length < settings.maxObjects && state.spawned<state.goal) {spawn(state); state.elapsed = 0;}
  for (const object of state.objects) if (!(typeof held==='object'&&held!==null?held.has(object.id):object.id===held)) object.y = Math.min(476, object.y + settings.speed * dt);
}
export function sort(state: GameState, id: number, bin: Category): boolean {
  const object = state.objects.find(item => item.id === id);
  if (!object || state.complete || !classify(object.category, bin)) return false;
  state.objects = state.objects.filter(item => item.id !== id);
  state.score++;
  state.complete = state.score >= state.goal;
  return true;
}
