/** Strip markdown bold/italic markers from plain text fields */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*{3}(.+?)\*{3}/g, "$1")       // ***bold italic***
    .replace(/\*\*(.+?)\*\*/g, "$1")          // **bold**
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1"); // *italic*
}
