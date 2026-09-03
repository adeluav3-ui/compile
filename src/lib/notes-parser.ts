export function parseNotesFile(
  content: string
): Array<{ lessonNumber: number; notes: string }> {
  const blocks = content
    .split("---LESSON BREAK---")
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  return blocks.flatMap((block) => {
    const lines = block.split("\n");
    const match = lines[0]?.trim().match(/^# Lesson (\d+) Study Notes:/);
    if (!match) return [];
    const lessonNumber = parseInt(match[1], 10);
    let contentStart = 1;
    while (contentStart < lines.length && lines[contentStart].trim() === "")
      contentStart++;
    const notes = lines.slice(contentStart).join("\n").trim();
    return [{ lessonNumber, notes }];
  });
}
