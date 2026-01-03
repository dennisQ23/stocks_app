"use server";

import { getDateRange, validateArticle, formatArticle } from "@/lib/utils";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  throw new Error("Finnhub API key is not set in environment variables.");
}

async function fetchJSON(url: string, revalidateSeconds?: number) {
  const options: RequestInit = revalidateSeconds
    ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
    : { cache: "no-store" };

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `Finnhub API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function getNews(
  symbols?: string[]
): Promise<MarketNewsArticle[]> {
  try {
    const { from, to } = getDateRange(5);

    if (symbols && symbols.length > 0) {
      const cleanSymbols = symbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s !== "");

      if (cleanSymbols.length === 0) return getGeneralNews();

      const articles: MarketNewsArticle[] = [];
      const rounds = 6;
      const seenUrls = new Set<string>();

      for (let i = 0; i < rounds; i++) {
        const symbol = cleanSymbols[i % cleanSymbols.length];
        const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

        try {
          const rawArticles: RawNewsArticle[] = await fetchJSON(url, 3600); // Cache for 1 hour

          for (const raw of rawArticles) {
            if (validateArticle(raw) && !seenUrls.has(raw.url!)) {
              articles.push(formatArticle(raw, true, symbol, i));
              seenUrls.add(raw.url!);
              break; // Take one valid article per round
            }
          }
        } catch (err) {
          console.error(`Error fetching news for ${symbol}:`, err);
        }
      }

      return articles.sort((a, b) => b.datetime - a.datetime);
    } else {
      return getGeneralNews();
    }
  } catch (error) {
    console.error("Error in getNews:", error);
    throw new Error("Failed to fetch news");
  }
}

async function getGeneralNews(): Promise<MarketNewsArticle[]> {
  const url = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
  const rawArticles: RawNewsArticle[] = await fetchJSON(url, 3600);

  const uniqueArticles = new Map<string, RawNewsArticle>();

  for (const article of rawArticles) {
    if (validateArticle(article)) {
      const key = `${article.id}-${article.url}-${article.headline}`;
      if (!uniqueArticles.has(key)) {
        uniqueArticles.set(key, article);
      }
    }
  }

  return Array.from(uniqueArticles.values())
    .slice(0, 6)
    .map((article, index) => formatArticle(article, false, undefined, index));
}
