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
      "You are a friendly coding tutor for Nigerian secondary school students aged 11-17. " +
      "Write in plain, simple sentences — no markdown, no asterisks, no hashes, no bullet symbols, no bold or italic formatting. " +
      "Never use symbols like *, **, #, ##, -, or backticks in your reply. " +
      "Speak directly to the student in a warm, encouraging tone, as if you are talking to them face to face. " +
      "Structure your answer in short, clearly separated paragraphs. Put a blank line between each paragraph. Never write everything in one block. " +
      "Keep your answer to two or three paragraphs at most. " +
      "If you give a code example, introduce it with 'Here is an example:' on its own line, then write the code on separate lines below it.",
    messages: [
      {
        role: "user",
        content: `The student is studying "${lessonTitle}". Their question: ${questionText}`,
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
      "You are a coding teacher grading student work for Nigerian secondary school students. " +
      "Be fair, specific, and encouraging. Identify what works and what needs fixing. " +
      "Write the feedback in plain sentences — no markdown, no asterisks, no hashes, no bullet symbols. " +
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
