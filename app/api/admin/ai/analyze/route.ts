import { NextRequest, NextResponse } from 'next/server';

// ─── No SDK — direct REST call. More reliable across environments. ───

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

/* ------------------------------------------------------------------ */
/*  Rate-limit (simple in-memory — swap for Upstash Redis in prod)     */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 60_000;
const MAX_REQ   = 10;
const rateMap   = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQ) return false;
  entry.count++;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Prompt                                                              */
/* ------------------------------------------------------------------ */

function buildPrompt(stats: unknown): string {
  // Send only the fields Gemini actually needs — strip heavy arrays like recentAppointments
  const s = stats as any;
  const slim = {
    clients: s.totalClients,
    pets: s.totalPets,
    vets: s.totalVeterinarians,
    revenue: {
      today: s.billingStats?.todaySales,
      weekly: s.weeklyRevenue,
      monthly: s.billingStats?.monthlyRevenue,
      total: s.billingStats?.totalRevenue,
      outstanding: s.billingStats?.outstandingBalance,
    },
    invoices: {
      paid: s.billingStats?.paidInvoices,
      unpaid: s.billingStats?.unpaidInvoices,
      partial: s.billingStats?.partialInvoices,
    },
    appointments: {
      today: s.appointmentStats?.todayCount,
      week: s.appointmentStats?.thisWeekCount,
      total: s.appointmentStats?.totalCount,
      completionRate: s.appointmentStats?.completionRate,
      cancelRate: s.appointmentStats?.cancelRate,
      byType: s.appointmentStats?.byType,
    },
    inventory: {
      lowStockCount: s.inventoryStats?.lowStockCount,
      outOfStock: s.inventoryStats?.outOfStock,
      lowStockItems: (s.lowStockProducts ?? []).map((p: any) => ({
        name: p.product_name,
        qty: p.stock_quantity,
      })),
    },
    pets_by_species: s.petStats?.petsBySpecies,
    vets_performance: s.vetPerformance,
  };

  return `Veterinary clinic data (PHP currency): ${JSON.stringify(slim)}

Reply with ONLY this JSON, no extra text:
{"summary":"2 sentences max","critical_alerts":[{"type":"inventory|finance|ops","message":"under 20 words","severity":"high|medium"}],"agentic_recommendations":[{"action":"under 12 words","reasoning":"1 sentence","expected_impact":"1 sentence"}],"deep_insight":"1 sentence cross-domain finding"}

Rules: flag stock<=10 as high inventory, outstanding>15% of total revenue as high finance, cancelRate>15 as medium ops. Give 2-3 alerts and 3 recommendations max.`;
}

/* ------------------------------------------------------------------ */
/*  Extract the first valid JSON object from any string                 */
/* ------------------------------------------------------------------ */

function extractJSON(text: string): unknown {
  // 1. Try the whole string first (ideal case)
  try { return JSON.parse(text); } catch {}

  // 2. Strip markdown fences then try again
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(stripped); } catch {}

  // 3. Grab the first { ... } block (handles prose before/after the JSON)
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  throw new SyntaxError(`Could not extract JSON. Got: ${text.slice(0, 300)}`);
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Wait a minute.' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set.' }, { status: 503 });
  }

  let stats: unknown;
  try {
    stats = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  let rawText = '';

  try {
    // ── Direct Gemini REST call (no SDK) ──
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(stats) }] }],
        generationConfig: {
          temperature: 1,        // 2.5 Flash requires temperature >= 1
          maxOutputTokens: 8192, // needs room — thinking tokens count toward this budget
        },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[AI Analyze] Gemini HTTP error:', geminiRes.status, errBody);
      return NextResponse.json(
        { error: `Gemini API error ${geminiRes.status}: ${errBody.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();

    // Pull text out of Gemini's response envelope
    rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Useful during development — remove before going to production
    console.log('[AI Analyze] Raw response:', rawText);

    if (!rawText) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason ?? 'unknown';
      console.error('[AI Analyze] Empty response. finishReason:', finishReason);
      return NextResponse.json(
        { error: `Gemini returned no content (finishReason: ${finishReason})` },
        { status: 502 }
      );
    }

    const parsed = extractJSON(rawText) as any;

    // ── Shape validation ──
    if (
      typeof parsed?.summary !== 'string' ||
      !Array.isArray(parsed?.critical_alerts) ||
      !Array.isArray(parsed?.agentic_recommendations) ||
      typeof parsed?.deep_insight !== 'string'
    ) {
      console.error('[AI Analyze] Unexpected shape:', parsed);
      return NextResponse.json(
        {
          error: 'AI response had an unexpected structure.',
          raw: rawText.slice(0, 500), // ← remove before production
        },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error('[AI Analyze] Error:', err.message, '| raw so far:', rawText.slice(0, 300));
    return NextResponse.json(
      {
        error: err.message ?? 'Unexpected server error.',
        raw: rawText.slice(0, 500), // ← remove before production
      },
      { status: 500 }
    );
  }
}