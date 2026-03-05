import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You parse food diary text into JSON array ONLY. No markdown, no backticks, no explanation.
Each item: {"food":"Russian name","time":"time or period","kcal":N,"protein":N,"fat":N,"carbs":N,"where":"location","micros":{}}
micros keys: zinc,vitD,omega3,vitC,collagen,b6,b12,copper,magnesium,iodine,iron,calcium,potassium,fiber. Include micronutrient only if >5% daily value.
Reference values per item:
- Chicken breast 90g: protein 18, kcal 90, zinc 1, b6 0.5, potassium 260
- Salmon onigiri: protein 7, kcal 200, omega3 0.3, vitD 100, b12 1
- Egg: protein 6, kcal 70, zinc 0.6, vitD 40, b12 0.5
- Kiwi: vitC 85, potassium 215, fiber 2.5
- Nori 4g: iodine 70, b12 1
- Dark chocolate 80% 50g: magnesium 115, iron 3, zinc 1.5, copper 0.5
- Protein milk 350ml: calcium 800, protein 25, b12 1.5, potassium 570
- Whey 40g: protein 30, calcium 100
- Shrimp 100g: protein 20, zinc 1.5, b12 1.5
- Pumpkin seeds 30g: zinc 2.3, magnesium 45
- Cashew 30g: zinc 1.7, copper 0.3, magnesium 25
- Edamame 100g: protein 11, zinc 1.4, fiber 5
- Spinach 100g: magnesium 80, iron 2.7, fiber 2.2, potassium 560
- Banana: potassium 400, fiber 2.5, carbs 27
- Bacon 2 strips: protein 6, fat 7, kcal 86
Use EXACT numbers from text when provided. Estimate reasonably when not.
Return ONLY valid JSON array.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Parse these meals:\n\n" + text }],
    });
    const raw = message.content.map((block: any) => (block.type === "text" ? block.text : "")).join("").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
