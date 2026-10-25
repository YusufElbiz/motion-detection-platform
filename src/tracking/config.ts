export const trackingConfig = {
  cameraWidth: 640, cameraHeight: 480, cameraFps: 30,
  inferenceFps: 24, inferenceWidth: 640,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  smoothingTimeConstantMs: 65,
  lossTimeoutMs: 350,
  matchDistance: 0.24,
  ambiguityDistance: 0.1,
  modelTimeoutMs: 30000,
  frameTimeoutMs: 10000,
};
