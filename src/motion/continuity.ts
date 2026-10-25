// maxJumpDistance was tuned for approximately 20 samples/s. A fixed distance
// per result penalizes the same physical speed when inference slows down.
export function permittedJump(baseDistance:number,elapsedMs:number){
  const elapsed=Number.isFinite(elapsedMs)?Math.max(0,elapsedMs):0;
  return baseDistance*Math.max(1,Math.min(2,elapsed/50));
}
