import type { BlockNoteEditor } from "@blocknote/core";

/**
 * Loads BlockNote blocks from a JSON string into the editor.
 * Falls back to an empty document on missing/invalid JSON.
 */
export function loadEditorFromNotes(
  editor: BlockNoteEditor,
  notesJSON?: string | null,
): void {
  // Always clear if nothing to load
  if (!notesJSON) {
    editor.replaceBlocks(editor.document, []);
    return;
  }

  try {
    const parsed = JSON.parse(notesJSON);

    // Basic shape guard: BlockNote expects an array of blocks
    if (!Array.isArray(parsed)) {
      console.error("notesJSON is not an array of blocks:", parsed);
      editor.replaceBlocks(editor.document, []);
      return;
    }

    editor.replaceBlocks(editor.document, parsed);
  } catch (err) {
    console.error("Invalid notesJSON:", err);
    editor.replaceBlocks(editor.document, []);
  }
}
