export type GrabMethod='fist'|'dwell'|'pinch';
export const motionConfig={
  method:'fist' as GrabMethod,
  dwellGrabMs:900,dwellReleaseMs:650,cooldownMs:450,
  pinchClose:.35,pinchRelease:.6,pinchCloseMs:140,pinchReleaseMs:180,pinchArmMs:100,
  handReadyMs:60,maxEvidenceGapMs:170,lossGraceMs:650,recoveryStableMs:100,
  recoveryDistance:170,maxJumpDistance:420,grabRadius:100,binPadding:44,sensitivity:1,
};
export type MotionSettings=typeof motionConfig;
