# Character image provenance

The three original PNG sheets were supplied by the user for direct integration in Ritim Canavarı. They remain byte-identical under `originals/`; file hashes are recorded in `sprite-source-manifest.json` at project root.

The idle, star target and clap preparation sprites use pixels extracted from those original sheets. No vector or primitive character reconstruction is used in the runtime renderer.

Missing shoulder, head/hip, knee, mixed-contact and preparation poses were created with the built-in image-generation tool as identity-preserving edits of the supplied character. The full prompt set is `sprite-generation-prompts.json`. Generated source sheets are preserved under `generated-atlases/`.

Slicing/placement is performed with uniform scale and fixed feet alignment; no independent limb warping, character recolouring or anatomical stretching is applied. All 13 gestures have separate target imagery. Runtime mirroring is a whole-sprite presentation transform matching the existing mirrored webcam display.

These images are not an imported Kenney, Quaternius or other third-party asset pack. They are not labelled CC0. The project MIT license governs the original code; it is not presented as evidence that arbitrary third-party artwork is MIT or public domain.
