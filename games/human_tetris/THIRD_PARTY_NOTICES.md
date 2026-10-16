# Third-party notices

The supplied KORU example was used **only for camera/pose integration**. The following files are retained and should keep their respective notices:

- `public/models/pose_full.task` / `pose_lite.task`: MediaPipe Pose Landmarker models, source: Google AI Edge model distribution, redistributed as in the supplied example.
- `public/vendor/vision_wasm_*.js` / `.wasm`: MediaPipe Tasks Vision runtime. Source: `@mediapipe/tasks-vision@0.10.32`. Emscripten module worker adjustments already present in the supplied files.
- `@mediapipe/tasks-vision`: Apache-2.0, https://github.com/google-ai-edge/mediapipe . A license copy is provided in `public/licenses/MediaPipe-Apache-2.0.txt`.
- Vite, TypeScript, and Vitest are development-only tools, each governed by its own package license; consult npm package license metadata.

The new game scene, wall silhouette outlines and target poses are original implementation. No proprietary game assets, commercial sprites or character models are included. No third-party CDN is required at runtime.
