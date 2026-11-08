import {test} from 'node:test';
import assert from 'node:assert/strict';
import {targetWeight,requiredGap} from '../assets/attention.js';

test('the interactive attention model matches normalized exponentials and its inverse',()=>{
 for(const n of [1,10,100,500,1000,10000]){
  const normalized=Math.exp(5)/(Math.exp(5)+n);
  assert.ok(Math.abs(targetWeight(n,5)-normalized)<1e-14);
  for(const p of [.1,.5,.9,.99])assert.ok(Math.abs(targetWeight(n,requiredGap(n,p))-p)<1e-14);
 }
 assert.equal(targetWeight(1,0),.5);
 assert.equal(targetWeight(10000,1000),1);
 assert.equal(targetWeight(10000,-1000),0);
 assert.throws(()=>targetWeight(0,5),RangeError);
 assert.throws(()=>requiredGap(100,1),RangeError);
});
