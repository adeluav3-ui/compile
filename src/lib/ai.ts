/**
 * Internal AI service module — single place for all Claude API calls.
 * All AI features (Q&A, grading) call through here. Swapping the model
 * or moving to a self-hosted provider is a one-file change.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function answerLessonQuestion(
  lessonTitle: string,
  questionText: string
): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system:
      "You are a helpful coding tutor for secondary school students in Nigeria. " +
      "Give clear, concise answers suited to students aged 11-17. " +
      "Use simple language. If relevant, include a short code example.",
    messages: [
      {
        role: "user",
        content: `The student is studying the lesson: "${lessonTitle}".\n\nTheir question: ${questionText}`,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "(No answer generated)";
}

export async function gradeSubmission(
  lessonTitle: string,
  rubric: string,
  code: string
): Promise<{ score: number; feedback: string }> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system:
      "You are a coding teacher grading student work. " +
      "Be fair, specific, and encouraging. Identify what works and what needs fixing. " +
      "Return ONLY a JSON object with exactly two fields: score (integer 0-100) and feedback (string).",
    messages: [
      {
        role: "user",
        content: [
          `Lesson: ${lessonTitle}`,
          `Grading rubric:\n${rubric}`,
          `Student's submission:\n\`\`\`\n${code}\n\`\`\``,
          "Grade this submission and return JSON: {\"score\": <0-100>, \"feedback\": \"<your feedback>\"}",
        ].join("\n\n"),
      },
    ],
  });

  const block = msg.content[0];
  if (block.type !== "text") return { score: 0, feedback: "Grading failed." };

  try {
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      feedback: String(parsed.feedback || ""),
    };
  } catch {
    return { score: 0, feedback: block.text };
  }
}
