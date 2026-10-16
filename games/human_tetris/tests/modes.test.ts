import {describe,it,expect} from 'vitest';
import {GameEngine,challengesFor} from '../src/game/engine';
import {DUO_CHALLENGES} from '../src/game/poses-duo';
import {CHALLENGES} from '../src/game/poses';
const forward=(game:GameEngine,first=100)=>{
  game.tick(first);
  let t=first;
  for(let i=0;i<300&&game.stage==='approach';i++){t+=60;game.tick(t)}
  return t;
};
describe('Solo / Duo integration',()=>{
  it('mode toggles challenge sets and resets progress',()=>{
    const g=new GameEngine();
    expect(g.count).toBe(CHALLENGES.length);
    g.selectMode('duo');expect(g.count).toBe(DUO_CHALLENGES.length);
    expect(challengesFor('duo')[0].name).toBe(DUO_CHALLENGES[0].name);
    g.selectMode('solo');expect(g.level).toBe(0);
  });
  it('DUO does not pass when only one player is ready',()=>{
    const g=new GameEngine('duo');g.start(true);g.players[0].ready=true;
    forward(g);expect(g.stage).toBe('bounce');expect(g.level).toBe(0);
  });
  it('DUO passes when both players are ready',()=>{
    const g=new GameEngine('duo');g.start(true);g.players[0].ready=true;g.players[1].ready=true;
    forward(g);expect(g.stage).toBe('clear');expect(g.score).toBeGreaterThan(0);
  });
  it('SOLO passes independently of second player',()=>{
    const g=new GameEngine('solo');g.start(true);g.players[0].ready=true;
    forward(g);expect(g.stage).toBe('clear');
  });
});
