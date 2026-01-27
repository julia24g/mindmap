export default function blockNoteToPlainText(doc: any[]): string {
  if (!Array.isArray(doc)) return "";

  const lines: string[] = [];

  for (const block of doc) {
    const inline = Array.isArray(block?.content) ? block.content : [];
    const line = inline
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .join("");
    if (line.trim()) lines.push(line.trim());
  }

  return lines.join("\n");
}
