/**
 * Internal AI service module — single place for all Claude API calls.
 * All AI features (Q&A, grading) call through here. Swapping the model
 * or moving to a self-hosted provider is a one-file change.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function answerLessonQuestion(
  lessonTitle: string,
  lessonDescription: string | null,
  questionText: string
): Promise<string> {
  const context = lessonDescription
    ? `Lesson: ${lessonTitle}. Topic summary: ${lessonDescription}`
    : `Lesson: ${lessonTitle}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system:
      "You are a friendly coding tutor for Nigerian secondary school students aged 11-17. " +
      `You are helping with one specific lesson only: ${context}. ` +
      "You must ONLY answer questions that are directly about this lesson topic. " +
      "If the student asks about anything outside this lesson — other subjects, general chat, unrelated coding topics, or personal matters — " +
      "do not answer it. Instead, politely tell them in one sentence that you can only help with questions about this lesson, and encourage them to stay focused. " +
      "Write in plain, simple sentences — no markdown, no asterisks, no hashes, no bullet symbols, no bold or italic formatting. " +
      "Never use symbols like *, **, #, ##, -, or backticks in your reply. " +
      "Speak directly to the student in a warm, encouraging tone, as if you are talking to them face to face. " +
      "Structure your answer in short, clearly separated paragraphs with a blank line between each. Never write everything in one block. " +
      "Keep your answer to two or three paragraphs at most. " +
      "If you give a code example, introduce it with 'Here is an example:' on its own line, then write the code on separate lines below it.",
    messages: [
      {
        role: "user",
        content: questionText,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "(No answer generated)";
}

export async function answerTeacherQuestion(
  lessonTitle: string,
  lessonDescription: string | null,
  questionText: string
): Promise<string> {
  const context = lessonDescription
    ? `Lesson: ${lessonTitle}. Topic summary: ${lessonDescription}`
    : `Lesson: ${lessonTitle}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 768,
    system:
      "You are an expert coding education assistant helping a secondary school teacher prepare and deliver a lesson. " +
      `The lesson is: ${context}. ` +
      "Answer the teacher's questions about this lesson thoroughly — you can go deeper than you would for a student. " +
      "Help the teacher understand the concept well enough to explain it clearly, anticipate student confusion, and give good examples. " +
      "Write in plain, clear sentences — no markdown, no asterisks, no hashes, no bullet symbols, no bold or italic formatting. " +
      "Never use symbols like *, **, #, ##, -, or backticks. " +
      "Structure your answer in short, clearly separated paragraphs with a blank line between each. " +
      "If you give a code example, introduce it with 'Here is an example:' on its own line, then write the code on separate lines below it.",
    messages: [{ role: "user", content: questionText }],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "(No answer generated)";
}

export interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  sourceLessonId: string;
}

export async function generateAssessmentQuestions(
  lessonsData: Array<{ id: string; order: number; title: string; notes: string | null }>,
  questionCount: number,
  assessmentType: "midterm" | "exam"
): Promise<{ questions: GeneratedQuestion[]; practicalPrompt: string | null }> {
  // Lessons from order 8+ are coding lessons — only these get a practical exercise
  const codingLessons = lessonsData.filter((l) => l.order >= 8);
  const hasPractical = codingLessons.length > 0;

  // Truncate each lesson's notes to keep prompt within limits
  const lessonContext = lessonsData
    .map((l) => {
      const notes = (l.notes ?? "").slice(0, 1800);
      return `--- Lesson ${l.order}: ${l.title} (ID: ${l.id}) ---\n${notes}`;
    })
    .join("\n\n");

  const typeLabel = assessmentType === "midterm" ? "Mid-Term" : "Final Exam";

  const practicalInstruction = hasPractical
    ? [
        "- Also generate one practical coding exercise. Requirements for the practical:",
        "  * Base it STRICTLY on the coding lessons provided above (lesson 8 and beyond only)",
        "  * Reference specific concepts, tags, properties, or techniques that appear in those lesson notes",
        "  * The task must be completable by a student who has studied ONLY the lessons listed above",
        "  * Do NOT introduce any concept, tag, property, or technique not present in the lesson notes",
        "  * Name the specific things the student must use (e.g. exact HTML tags, CSS properties covered)",
        "  * The practical must produce a visible result in a browser",
      ].join("\n")
    : "- Do NOT include a practical exercise. These lessons are theory-only (no coding yet).";

  const schemaExample = hasPractical
    ? JSON.stringify({
        questions: [
          {
            questionText: "example question?",
            options: ["option 1", "option 2", "option 3", "option 4"],
            correctOptionIndex: 0,
            sourceLessonId: "the-lesson-uuid-here",
          },
        ],
        practicalPrompt: "Using only what you learned in [specific lesson title], create a page that...",
      })
    : JSON.stringify({
        questions: [
          {
            questionText: "example question?",
            options: ["option 1", "option 2", "option 3", "option 4"],
            correctOptionIndex: 0,
            sourceLessonId: "the-lesson-uuid-here",
          },
        ],
        practicalPrompt: null,
      });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    system:
      "You are an expert secondary school examination setter for Nigerian JSS students. " +
      "You generate high-quality multiple-choice questions strictly from the lesson content provided. " +
      "Every question and every part of the practical must derive directly from the lesson notes given — " +
      "never introduce outside knowledge or concepts not present in the provided notes. " +
      "Return ONLY valid JSON — no explanations, no markdown, no text outside the JSON object.",
    messages: [
      {
        role: "user",
        content: [
          `Generate exactly ${questionCount} multiple-choice questions for a ${typeLabel} assessment covering these lessons:`,
          "",
          lessonContext,
          "",
          "Requirements:",
          `- Exactly ${questionCount} questions in the 'questions' array — no more, no fewer`,
          "- The 'questions' array must contain ONLY multiple-choice questions — never put the practical inside it",
          "- Each question must have exactly 4 answer options (plain text, no A/B/C/D prefix)",
          "- correctOptionIndex is 0-based (0=first option is correct, 1=second, etc.)",
          "- Questions must test real understanding of the lesson content, not just recall of definitions",
          "- sourceLessonId must be the exact lesson ID string from above",
          practicalInstruction,
          "",
          "Return ONLY this JSON (no other text):",
          schemaExample,
        ].join("\n"),
      },
    ],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("AI returned no text");

  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response contained no JSON");

  const parsed = JSON.parse(jsonMatch[0]) as {
    questions: GeneratedQuestion[];
    practicalPrompt: string | null;
  };

  // Validate + clamp
  const questions = parsed.questions.slice(0, questionCount).map((q) => ({
    questionText: String(q.questionText ?? ""),
    options: (Array.isArray(q.options) ? q.options : ["", "", "", ""]).map(String),
    correctOptionIndex: Math.min(3, Math.max(0, Number(q.correctOptionIndex ?? 0))),
    sourceLessonId: String(q.sourceLessonId ?? lessonsData[0]?.id ?? ""),
  }));

  const practicalPrompt = hasPractical && parsed.practicalPrompt
    ? String(parsed.practicalPrompt)
    : null;

  return { questions, practicalPrompt };
}

export async function regenerateSingleQuestion(
  lessonTitle: string,
  lessonNotes: string | null,
  existingQuestions: string[],
): Promise<GeneratedQuestion & { sourceLessonId: string }> {
  const notes = (lessonNotes ?? "").slice(0, 2000);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: "You generate a single exam question. Return ONLY valid JSON.",
    messages: [
      {
        role: "user",
        content: [
          `Generate ONE new multiple-choice question about: ${lessonTitle}`,
          "",
          "Lesson content:",
          notes,
          "",
          "These questions already exist (don't duplicate them):",
          existingQuestions.slice(0, 10).join("\n"),
          "",
          'Return ONLY JSON: {"questionText":"...","options":["...","...","...","..."],"correctOptionIndex":0}',
        ].join("\n"),
      },
    ],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("No response");
  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON");
  const q = JSON.parse(jsonMatch[0]);
  return {
    questionText: String(q.questionText ?? ""),
    options: (Array.isArray(q.options) ? q.options : ["", "", "", ""]).map(String),
    correctOptionIndex: Math.min(3, Math.max(0, Number(q.correctOptionIndex ?? 0))),
    sourceLessonId: "",
  };
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
