# Third-party notices

## Google MediaPipe Tasks Vision and Pose Landmarker

- Package: `@mediapipe/tasks-vision` (npm 0.10.32)
- Source: https://github.com/google-ai-edge/mediapipe
- Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- Runtime: local WASM (`public/vendor/`) and Pose Landmarker models (`public/models/`), inherited from the prior Human Tetris prototype.
- MediaPipe framework: Apache License 2.0. Notice copy: `public/licenses/MediaPipe-Apache-2.0.txt`.
- Before redistributing a commercial product, recheck applicable model-file and package terms and include required attributions.

## Other runtime dependencies

- Vite 7.3.7: MIT. Preserved text: `public/licenses/Vite-MIT.txt`.
- TypeScript 5.9.3: Apache-2.0. Preserved text: `public/licenses/TypeScript-Apache-2.0.txt`. This corrects the older notice that described TypeScript as MIT.
- No third-party character, animation, music or sound pack was added.
- The geometric Canvas child has been replaced by the user's supplied PNG sheets and generated pose variants of that same character. Original image hashes and full generation prompts are included. See `public/sprites/ASSET_NOTICES.md`. These images are not labelled CC0; the MIT code license is not used to infer a license for unrelated artwork.
- Existing model/WASM bytes and the MediaPipe notice are unchanged. Original sound synthesis and CSS monster remain in the project.
