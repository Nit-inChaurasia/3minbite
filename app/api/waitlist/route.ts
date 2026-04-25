import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const redis = Redis.fromEnv();

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "3minbite", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
}

interface Article {
  title: string;
  description: string | null;
  url: string;
  source: { name: string };
}

async function fetchNews(industry: string) {
  const key = process.env.NEWS_API_KEY;
  const base = "https://newsapi.org/v2";
  const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];
  const q = encodeURIComponent(industry);

  const [r1, r2, r3] = await Promise.all([
    fetch(`${base}/everything?q=${q}+India&language=en&sortBy=publishedAt&from=${from}&pageSize=6&apiKey=${key}`),
    fetch(`${base}/everything?q=${q}+%28funding+OR+launch+OR+hiring%29+India&language=en&sortBy=publishedAt&from=${from}&pageSize=5&apiKey=${key}`),
    fetch(`${base}/everything?q=${q}+%28acquisition+OR+merger+OR+IPO+OR+revenue%29+India&language=en&sortBy=publishedAt&from=${from}&pageSize=5&apiKey=${key}`),
  ]);

  const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const dedupe = (list: Article[]) => {
    const result: Article[] = [];
    for (const a of (list || [])) {
      if (!a.title || a.title === "[Removed]" || !a.url) continue;
      const titleKey = a.title.slice(0, 60).toLowerCase().replace(/\s+/g, " ").trim();
      if (seenUrls.has(a.url) || seenTitles.has(titleKey)) continue;
      seenUrls.add(a.url);
      seenTitles.add(titleKey);
      result.push(a);
    }
    return result.slice(0, 3);
  };

  return {
    general: dedupe(d1.articles),
    competitor: dedupe(d2.articles),
    financial: dedupe(d3.articles),
  };
}

// Strip source prefixes like "ETtech Deals Digest: " or "Mint | " from titles
function cleanTitle(text: string): string {
  return text
    .replace(/^ET\w*(\s+\w+)*:\s*/i, "")
    .replace(/^(Times|Mint|NDTV|Hindustan|Business\s+Standard|LiveMint|MoneyControl|Inc42)(\s+\w+)*[:|]\s*/i, "")
    .replace(/^[\w\s]+(Digest|Wrap|Roundup|Brief)[:|]\s*/i, "")
    .replace(/[—–]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function a(word: string, url: string): string {
  return `<a href="${url}" style="color:#0070F3;text-decoration:none;font-weight:600;border-bottom:1px solid #bfdbfe;">${word}</a>`;
}

function generateSubject(industry: string, articles: { general: Article[]; competitor: Article[]; financial: Article[] }): string {
  const top = ([...articles.general, ...articles.competitor, ...articles.financial][0]?.title || "").toLowerCase();

  if (/fund|rais|million|billion|crore/.test(top)) return `Money is moving in ${industry} right now`;
  if (/launch|introduc|new product|unveil/.test(top)) return `Someone in ${industry} just dropped something new`;
  if (/acqui|merger|buyout/.test(top)) return `A big deal just closed in ${industry}`;
  if (/regulat|rbi|sebi|ban|licen/.test(top)) return `The rules just changed in ${industry}`;
  if (/layoff|hiring|fired|talent/.test(top)) return `The talent situation in ${industry} is getting real`;

  const pool = [
    `Something just shifted in ${industry}`,
    `Your ${industry} world had a moment today`,
    `The ${industry} plot thickens`,
    `Things got interesting in ${industry}`,
    `What you missed in ${industry} today`,
    `The ${industry} update worth your morning`,
    `Your 180 second ${industry} brief is here`,
  ];
  return pool[new Date().getDay() % pool.length];
}

function p(content: string, style = ""): string {
  return `<p style="font-size:15px;line-height:1.85;margin:0 0 22px;color:#1a1a1a;${style}">${content}</p>`;
}

function buildEmailHtml(
  name: string,
  industry: string,
  description: string,
  news: { general: Article[]; competitor: Article[]; financial: Article[] }
): string {
  const firstName = name.split(" ")[0];
  const all = [...news.general, ...news.competitor, ...news.financial];

  if (all.length === 0) return buildFallback(firstName, industry);

  const topArticle = all[0];
  const hookTitle = cleanTitle(topArticle.title);
  const hookDesc = topArticle.description
    ? cleanTitle(topArticle.description).slice(0, 110).replace(/\.+$/, "")
    : "";

  // Personalised opening based on description
  const personalLine = description
    ? `You mentioned you are ${description.toLowerCase().replace(/\.$/, "")}. So this one lands right in your world.`
    : `Here is what is moving in ${industry} today.`;

  // Build story blocks
  const blocks: string[] = [];

  // Greeting
  blocks.push(p(`Hey ${firstName},`));

  // Hook (bold headline + context sentence + one link)
  const hookContext = hookDesc
    ? `${hookDesc}... ${a("Full story", topArticle.url)}.`
    : `${a("Read this", topArticle.url)}.`;

  blocks.push(p(
    `<strong style="font-size:16px;">${hookTitle}.</strong><br><span style="color:#374151;font-size:14px;">${personalLine}</span>`,
  ));
  blocks.push(p(hookContext));

  // Remaining general articles
  const restGeneral = news.general.filter((art) => art.url !== topArticle.url);
  const generalOpeners = ["That is not the whole picture.", "And it does not stop there.", "There is more to unpack."];
  restGeneral.forEach((art, i) => {
    const title = cleanTitle(art.title);
    const opener = generalOpeners[i] || "";
    blocks.push(p(`${opener ? opener + " " : ""}${title}. ${a("More here", art.url)}.`));
  });

  // Separator
  if (news.competitor.length > 0 || news.financial.length > 0) {
    blocks.push(`<hr style="border:none;border-top:1px solid #f3f4f6;margin:4px 0 22px;">`);
  }

  // Competitor / moves articles
  const competitorOpeners = [
    `On the moves front in ${industry},`,
    "Meanwhile,",
    "And separately,",
  ];
  news.competitor.forEach((art, i) => {
    const title = cleanTitle(art.title);
    const opener = competitorOpeners[i] || "Also,";
    const titleLower = title.charAt(0).toLowerCase() + title.slice(1);
    blocks.push(p(`${opener} ${titleLower}. ${a("This one", art.url)} is worth two minutes.`));
  });

  // Financial / deals articles
  const financialOpeners = [
    "On the money and deals side,",
    "Worth noting on the numbers front,",
    "And financially speaking,",
  ];
  news.financial.forEach((art, i) => {
    const title = cleanTitle(art.title);
    const opener = financialOpeners[i] || "Also,";
    const titleLower = title.charAt(0).toLowerCase() + title.slice(1);
    blocks.push(p(`${opener} ${titleLower}. ${a("Details here", art.url)}.`));
  });

  // Witty closing
  const closings = [
    `That is ${industry} for you. Never a quiet morning.`,
    `There you have it. The kind of update that saves you an hour and costs you nothing.`,
    `Read it, absorb it, go do something great with it.`,
    `Not bad for 180 seconds, right?`,
    `Stay sharp. The ${industry} world moves fast, but now you move faster.`,
    `That is your world today. Go get it.`,
    `Plenty happening out there. Good thing you have 3minbite.`,
  ];
  const closing = closings[new Date().getHours() % closings.length];

  blocks.push(`<hr style="border:none;border-top:1px solid #f3f4f6;margin:8px 0 28px;">`);
  blocks.push(p(closing, "color:#374151;"));
  blocks.push(p(`As promised, news under 180 secs.`, "color:#374151;font-style:italic;margin-bottom:6px;"));
  blocks.push(`<p style="font-size:14px;color:#9ca3af;margin:0;">The 3minbite Team</p>`);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:36px 24px;background:#fff;color:#1a1a1a;">
  <p style="font-size:11px;color:#d1d5db;margin:0 0 40px;letter-spacing:.1em;text-transform:uppercase;">3minbite</p>
  ${blocks.join("\n  ")}
</body></html>`;
}

function buildFallback(firstName: string, industry: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:36px 24px;background:#fff;color:#1a1a1a;">
  <p style="font-size:11px;color:#d1d5db;margin:0 0 40px;letter-spacing:.1em;text-transform:uppercase;">3minbite</p>
  <p style="font-size:15px;line-height:1.85;margin:0 0 22px;">Hey ${firstName},</p>
  <p style="font-size:15px;line-height:1.85;margin:0 0 22px;">Turns out ${industry} decided to take a breather today. No major headlines in the last 48 hours. That is either very good news or the calm before something interesting. We are watching.</p>
  <p style="font-size:15px;line-height:1.85;margin:0 0 36px;">Check back tomorrow. The world rarely stays quiet for long.</p>
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 24px;">
  <p style="font-size:13px;color:#9ca3af;margin:0;line-height:1.8;">As promised, news under 180 secs.<br>The 3minbite Team</p>
</body></html>`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, industry, description, email } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!industry || typeof industry !== "string" || !industry.trim()) {
    return NextResponse.json({ error: "Industry is required" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  const added = await redis.sadd("waitlist", normalized);
  await redis.hset(`user:${normalized}`, {
    name: name.trim(),
    industry: industry.trim(),
    description: (description || "").trim(),
    email: normalized,
    createdAt: Date.now(),
  });

  try {
    const news = await fetchNews(industry.trim());
    const subject = generateSubject(industry.trim(), news);
    const html = buildEmailHtml(name.trim(), industry.trim(), (description || "").trim(), news);
    await sendEmail(normalized, subject, html);
  } catch (err) {
    console.error("Email pipeline failed:", err);
  }

  return NextResponse.json({ status: added === 1 ? "joined" : "already_joined" });
}
