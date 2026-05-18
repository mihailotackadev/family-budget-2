import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const { images } = await request.json();
    if (!images?.length) return Response.json({ error: 'No images' }, { status: 400 });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const content = [
      ...images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.data },
      })),
      {
        type: 'text',
        text: `Scan this receipt and extract all purchased items.
Return ONLY a valid JSON array, no markdown, no backticks.
Format: [{"description":"item name","amount":12.50,"category":"food"}]
Categories: food, chemicals, clothing, transport, health, entertainment, utilities, other
Rules: deduplicate overlapping photos, use total price for weighted items, skip tax/total lines.`,
      },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0].text.trim().replace(/```json|```/g, '');
    return Response.json({ items: JSON.parse(text) });
  } catch (err) {
    return Response.json({ error: 'Scan failed' }, { status: 500 });
  }
}
