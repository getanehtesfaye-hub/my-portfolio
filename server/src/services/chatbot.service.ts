import { query } from "../db/pool";

type Faq = { id: string; question: string; answer: string; keywords: string[]; priority: number };
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);

// Keyword hits weigh most, then question-word overlap, then admin-set priority as a tie-breaker.
export async function findAnswer(question: string) {
  const faqs = await query<Faq>("select id, question, answer, keywords, priority from faqs where active");
  const q = new Set(tokens(question));
  let best: { faq: Faq; score: number } | null = null;
  for (const faq of faqs) {
    const score =
      faq.keywords.flatMap(tokens).filter((t) => q.has(t)).length * 3 +
      tokens(faq.question).filter((t) => q.has(t)).length +
      faq.priority / 100;
    if (score >= 2 && (!best || score > best.score)) best = { faq, score };
  }
  return best ? { matched: true, id: best.faq.id, answer: best.faq.answer } : { matched: false as const };
}
