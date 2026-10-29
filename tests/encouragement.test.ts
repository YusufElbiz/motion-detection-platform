import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncouragementSchedule} from '../src/encouragement.ts';
test('encouragement requires four more correct objects AND forty active seconds',()=>{
 const schedule=new EncouragementSchedule();
 assert.equal(schedule.take(1,45),false);assert.equal(schedule.take(4,12),false);
 assert.equal(schedule.take(4,40),true);assert.equal(schedule.take(5,80),false);
 assert.equal(schedule.take(8,65),false);assert.equal(schedule.take(8,80),true);
 schedule.postpone(100);assert.equal(schedule.take(12,125),false);assert.equal(schedule.take(12,140),true);
 schedule.reset();assert.equal(schedule.take(4,39),false);assert.equal(schedule.take(4,40),true);
});
