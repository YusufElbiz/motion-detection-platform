# License and asset register

Phase 1 SVG artwork and Web Audio tones were created for this project. No external images/fonts/recordings are used in the application. System fonts remain supplied by the operating system. Phase 2 adds the MediaPipe runtime and Hand Landmarker model described below. No product license is assigned here; the owner should choose project distribution terms before commercialization.

Development tools: Vite (MIT), TypeScript (Apache-2.0), Playwright (Apache-2.0, browser testing only). Their notices and those of transitive tools must be retained when redistributing those tools. Production `dist` contains compiled application code and the MediaPipe runtime/model, not the TypeScript compiler, Playwright or Vite server. A dependency license inventory is generated under `docs/dependency-licenses.json`, and full installed package root notices are collected in `docs/THIRD_PARTY_LICENSES.txt`. Keep the lockfile and audit licenses again when upgrading or bundling an installer. All 18 installed package license declarations were MIT, Apache-2.0, ISC or BSD-3-Clause; none declared GPL/AGPL. This inventory covers installed package declarations, not an artifact-specific inventory of all code compiled into upstream WASM. Optional binaries for other platforms require a fresh inventory if distributed. The Chrome browser used in testing is locally installed and is not redistributed with the project.

Primary references:
- https://github.com/vitejs/vite/blob/main/packages/vite/LICENSE.md
- https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt

## Phase 2 runtime and weights — checked 2026-10-23

Phase 3 rework also includes the official **Gesture Recognizer**, version `gesture_recognizer/gesture_recognizer/float16/1`, downloaded unmodified from https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task . SHA-256: `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`. The official guide links this model: https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer#models . The same upstream Apache-2.0 source/model clarification and redistribution requirements below apply; no alternate terms were identified for this artifact. Keep this attribution and the bundled upstream license when redistributing. The build verifies both frozen model hashes. Only one task model runs at a time: this model replaces Hand Landmarker in natural fist mode and also returns the landmarks; it is not a concurrent second tracker.

The new cartoon hands/arms are original first-party procedural SVG artwork in `src/motion/arms.ts`, without third-party character or image assets. Test-only generated skeletons in `scripts/hand-fixtures.mjs` are explicitly synthetic and contain no real user biometric measurements.

| Component | Frozen source/version | License evidence |
| --- | --- | --- |
| Official Tasks Vision JS/WASM | `@mediapipe/tasks-vision@1.1.1`, pinned in package/lockfile; original files copied without modification | Publisher npm package metadata declares Apache-2.0; upstream repository LICENSE |
| Hand Landmarker task bundle (palm detector and hand landmark model) | `hand_landmarker/hand_landmarker/float16/1`; 7,819,105 bytes | Official model guide download plus maintainer's statement that source and models are Apache-2.0 unless otherwise noted; no alternate license noted for this model |

Frozen model URL: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.

The SHA-256 and sizes of all copied runtime/model assets are recorded in `public/tracking/asset-manifest.json` and checked in the production build. The model is downloaded from the versioned `/1/` URL, not `/latest/`. Hashes freeze the reviewed bytes, but are not upstream cryptographic signatures.

Primary evidence (no inference of model licensing merely from a documentation footer):
- Publisher metadata: https://registry.npmjs.org/@mediapipe%2ftasks-vision/1.1.1 and the retained `public/tracking/sdk-package.json`.
- Upstream license: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE; exact downloaded text retained as `public/tracking/LICENSE.mediapipe.txt`.
- Official Hand Landmarker model link/card: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker#models
- Maintainer's general source/model license clarification, 2026-10-05: https://github.com/google-ai-edge/mediapipe/issues/6355 (schmidt-sebastian's October 5 comment).
- Upstream Web SDK/telemetry clarification: https://github.com/google-ai-edge/mediapipe/issues/6306

Apache-2.0 permits commercial use and redistribution subject to its conditions. Include the license, retain applicable copyright/patent/attribution notices, preserve any supplied NOTICE material, and mark changes to upstream files if you make them. It does not grant trademark rights or a warranty. The application adapter is separate first-party code; SDK/model files are unmodified. `public/tracking/LICENSE.mediapipe.txt`, `ATTRIBUTION.md` and `sdk-package.json` accompany production runtime files. Review these conditions for the distribution actually shipped.

**Known upstream provenance/notice limitation:** the exact npm 1.1.1 package inspected contains no root LICENSE/NOTICE/SBOM or artifact-to-source build attestation. Its Apache metadata and the maintainer statement are evidence for the top-level license, but do not prove every embedded dependency is Apache-only. For example, upstream discussions mention Eigen/MPL-covered components in prebuilt WASM. MPL-2.0 is distinct from GPL/AGPL and can permit commercial use with source/notice obligations for covered files. Before commercial redistribution, obtain complete artifact-specific third-party notices and source references from the supplier; a package-metadata inventory cannot settle that gap. No claim of completed commercial distribution clearance is made by this prototype. Public discussion: https://github.com/google-ai-edge/mediapipe/issues/6355 and https://github.com/google-ai-edge/mediapipe/issues/6306.

The 1.1.1 SDK contains performance/utilization telemetry code. Our worker blocks nonlocal fetch/XHR and all POST requests before loading the unmodified SDK; dev/preview CSP also limits connections to local origins. No model inputs or landmarks are sent. This is an application boundary, not a claim that upstream has no telemetry. Keep this policy when updating libraries or hosting elsewhere.

Synthetic browser screenshots are generated from Chrome's fake video source; the two-hand overlay screenshot uses explicitly mocked coordinates. No child image or external hand photograph is included. Future pose/gesture models require a separate license/source review.
