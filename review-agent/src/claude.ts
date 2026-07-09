// Ported from ~/dev/restaurant-review-agent/src/claude.js, which
// already produced a real, accepted reply for Thrasher's — the tone
// ladder, model choice, prompt-caching setup, and hard rules below are
// reused verbatim. The only real change is that the system prompt now
// takes the business name/description/contact-email as parameters
// (from review_agent_settings, per-tenant) instead of reading
// process.env.RESTAURANT_NAME/RESTAURANT_EMAIL from a single .env file.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ReviewAgentSettings = {
  businessName: string;
  businessDescription: string | null;
  replyContactEmail: string;
};

function getToneInstruction(rating: number, email: string): string {
  if (rating === 5) {
    return "The reviewer left a 5-star review. Respond with a warm, grateful, enthusiastic tone. Reference something specific from their review to show you genuinely read it.";
  }
  if (rating === 4) {
    return "The reviewer left a 4-star review. Respond with an appreciative and encouraging tone. Acknowledge their positive experience and invite them back.";
  }
  if (rating === 3) {
    return "The reviewer left a 3-star review. Respond with an understanding, sincere tone. Thank them for their honest feedback and invite them back to try again.";
  }
  // 1-2 stars
  return `The reviewer left a ${rating}-star review. Respond with an empathetic, apologetic tone. Acknowledge their specific issue directly — do not be vague. End with a warm invitation to contact us directly at ${email} so we can make it right.`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/\*(.*?)\*/g, "$1") // *italic*
    .replace(/`(.*?)`/g, "$1") // `code`
    .replace(/#{1,6}\s+/g, "") // ## headers
    .replace(/>\s+/g, "") // > blockquotes
    .replace(/\n{3,}/g, "\n\n") // excessive blank lines
    .trim();
}

function buildSystemPrompt(businessName: string, businessDescription: string | null): string {
  const description = businessDescription ? `, ${businessDescription},` : "";
  return `You are the owner of ${businessName}${description} replying to a Google review on behalf of the business. Write professionally and courteously, the way a thoughtful owner or general manager would respond in public.

Tone:
- Polished, sincere, and warm without being stiff. Professional, not casual or jokey
- Complete sentences and correct grammar. Contractions are fine ("we're", "you'll"), but no slang or fragments
- Genuine, not generic. Reference something specific from their review so it never reads like a template
- Courteous and measured, especially with criticism. Stay calm, take responsibility, never argue or get defensive
- Do not use em-dashes (—). Use commas, periods, or shorter sentences instead

Hard rules:
- Under 65 words
- Plain text only, no markdown, no bullets, no emojis
- Use the reviewer's first name naturally, if they have one. Opening with it is fine (for example, "Thank you, [first name], ...")
- You may mention "${businessName}" once, usually near the end
- Avoid hollow corporate filler ("your satisfaction is our priority", "we strive for excellence"). Be specific and human instead`;
}

// Generates a reply for a single Google review.
export async function generateReply(
  reviewerName: string,
  starRating: number,
  comment: string,
  settings: ReviewAgentSettings,
): Promise<string> {
  const userMessage = `Reviewer name: ${reviewerName}
Star rating: ${starRating} out of 5
Review text: ${comment || "(No written comment — star rating only)"}

${getToneInstruction(starRating, settings.replyContactEmail)}

Write the reply now.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(settings.businessName, settings.businessDescription),
        cache_control: { type: "ephemeral" }, // cache system prompt across reviews in one scan
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return stripMarkdown(raw);
}
