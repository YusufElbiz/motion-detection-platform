import {describe,it,expect} from 'vitest';
import {CHALLENGES} from '../src/game/poses';
import {GameEngine} from '../src/game/engine';
describe('SOLO',()=>{
  it('16 solo poses without pair contact',()=>{expect(CHALLENGES).toHaveLength(16);expect(CHALLENGES.every(c=>!c.contact)).toBe(true)});
  it('solo ready clears wall without second player',()=>{const g=new GameEngine();g.start(true);g.players[0].ready=true;let t=100;g.tick(t);for(let i=0;i<300&&g.stage==='approach';i++){t+=60;g.tick(t)}expect(g.stage).toBe('clear')});
  it('wrong solo pose bounces',()=>{const g=new GameEngine();g.start();let t=100;g.tick(t);for(let i=0;i<300&&g.stage==='approach';i++){t+=60;g.tick(t)}expect(g.stage).toBe('bounce')});
});
