"use server";
import { cache } from "react";
import { getDateRange, validateArticle, formatArticle } from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/contants";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  throw new Error("Finnhub API key is not set in environment variables.");
}

/**
 * Fetches JSON from the given URL with optional cache revalidation.
 *
 * @param url - The request URL to fetch.
 * @param revalidateSeconds - If provided, enables caching with the specified revalidation window in seconds; otherwise no caching is used.
 * @returns The parsed JSON body of the HTTP response.
 * @throws Error if the HTTP response status is not OK; the error message includes the status code and status text.
 */
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

/**
 * Fetches and formats market news either for the provided stock symbols or general market news.
 *
 * @param symbols - Optional array of stock ticker symbols; when omitted or empty, general market news is returned.
 * @returns An array of up to six formatted MarketNewsArticle objects. If `symbols` are provided, returned articles are company-specific for those tickers and deduplicated by URL; otherwise, returns general market news.
 * @throws Error - Throws "Failed to fetch news" if the fetch or processing fails.
 */
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

/**
 * Fetches up to six deduplicated, formatted general market news articles from Finnhub.
 *
 * Validates and deduplicates raw general-news items (by id, URL, and headline), limits the result to six entries, and converts each into a MarketNewsArticle.
 *
 * @returns An array of up to six formatted MarketNewsArticle objects.
 */
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

/**
 * Searches for stocks by query or returns popular stocks if no query is provided.
 *
 * @param query - The search query.
 * @returns A promise that resolves to an array of StockWithWatchlistStatus objects.
 */
export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
      let results: FinnhubSearchResult[] = [];

      if (!query) {
        // Fetch the top 10 popular symbols
        const popularSymbols = POPULAR_STOCK_SYMBOLS.slice(0, 10);
        const profiles = await Promise.all(
          popularSymbols.map((symbol) =>
            fetchJSON(
              `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
              3600
            )
          )
        );

        results = profiles.map((profile, index) => ({
          symbol: popularSymbols[index],
          description: profile.name || "",
          displaySymbol: popularSymbols[index],
          type: "Common Stock",
          exchange: profile.exchange || "US",
        }));
      } else {
        const trimmedQuery = query.trim();
        const response: FinnhubSearchResponse = await fetchJSON(
          `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
            trimmedQuery
          )}&token=${FINNHUB_API_KEY}`,
          1800
        );
        results = response.result || [];
      }

      return results
        .map((result) => ({
          symbol: result.symbol.toUpperCase(),
          name: result.description,
          exchange: result.exchange || "US",
          type: result.type || "Stock",
          isInWatchlist: false,
        }))
        .slice(0, 15);
    } catch (error) {
      console.error("Error in stock search: ", error);
      return [];
    }
  }
);
