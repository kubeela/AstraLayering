// Relative to <dir>/<name>. Keep producer output and workbench discovery aligned.
// The lighting files reserve the output contract for the upcoming lighting section;
// their absence does not prevent previewing the assembled character.
export const studioArtifacts = {
  document: "character-assembly/step01/character-assembled.kra",
  color: "character-assembly/step01/character-assembled.png",
  normal: "lighting/normal.png",
  depth: "lighting/depth.png",
} as const;
