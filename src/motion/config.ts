export type GrabMethod='fist'|'dwell'|'pinch';
export const motionConfig={
  method:'fist' as GrabMethod,
  dwellGrabMs:900,dwellReleaseMs:650,cooldownMs:450,
  pinchClose:.35,pinchRelease:.6,pinchCloseMs:140,pinchReleaseMs:180,pinchArmMs:100,
  handReadyMs:60,maxEvidenceGapMs:170,lossGraceMs:650,recoveryStableMs:100,
  recoveryDistance:150,maxJumpDistance:320,grabRadius:82,binPadding:14,sensitivity:1,
};
export type MotionSettings=typeof motionConfig;
