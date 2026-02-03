export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string[]; 
  outcomes: string[];
  volume: string;
  active: boolean;
  closed: boolean;
  liquidity: string;
  endDate: string;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  createdAt: string;
  volume: string;
  markets: PolymarketMarket[];
}

export interface PolymarketTag {
  id: string;
  label: string;
  slug: string;
}

const PROXY_URL = '/api/polymarket';

export async function fetchTags(): Promise<PolymarketTag[]> {
  try {
    const response = await fetch(`${PROXY_URL}?endpoint=tags&limit=2000`);
    if (!response.ok) throw new Error(`Failed to fetch tags`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}

export async function fetchEventsByTag(tagId: string): Promise<PolymarketEvent[]> {
  try {
    const response = await fetch(`${PROXY_URL}?endpoint=events&tag_id=${tagId}&limit=20&closed=false`);
    if (!response.ok) throw new Error(`Failed to fetch events`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching events:`, error);
    return [];
  }
}

export interface CategorizedEvents {
  politics: PolymarketEvent[];
  crypto: PolymarketEvent[];
}

export function detectMarketType(event: PolymarketEvent): 'Range-based' | 'Event-based' {
  // If the title or question contains range indicators like "FDV", "price", "between", or has many numerical outcomes
  const title = (event.title || "").toLowerCase();
  const description = (event.description || "").toLowerCase();
  
  const rangeKeywords = ['fdv', 'price of', 'market cap', 'range', 'between', 'above', 'below', '$'];
  const isRangeTitle = rangeKeywords.some(kw => title.includes(kw) || description.includes(kw));
  
  // Check if any market in the event has outcomes that look like ranges (e.g., "$10k - $20k")
  const hasRangeOutcomes = event.markets?.some(m => {
    const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
    return Array.isArray(outcomes) && outcomes.some(o => (o as string).includes('-') || (o as string).includes('$'));
  });

  return (isRangeTitle || hasRangeOutcomes) ? 'Range-based' : 'Event-based';
}

export async function fetchTrendingEvents(): Promise<CategorizedEvents> {
    try {
        console.log("fetchTrendingEvents: Starting fetch...");
        
        // Fetch Crypto (21) and Politics (2) separately
        const [cryptoEvents, politicsEvents] = await Promise.all([
          fetchEventsByTag('21'),
          fetchEventsByTag('2')
        ]);
        
        const filterAndSort = (events: PolymarketEvent[]) => 
          events
            .filter(e => Number(e.volume) > 100)
            .sort((a, b) => Number(b.volume) - Number(a.volume));

        return {
          crypto: filterAndSort(cryptoEvents),
          politics: filterAndSort(politicsEvents)
        };
    } catch (error) {
        console.error("fetchTrendingEvents: Error:", error);
        return { politics: [], crypto: [] };
    }
}

export async function fetchEventBySlug(slug: string): Promise<PolymarketEvent | null> {
  try {
    const response = await fetch(`${PROXY_URL}?endpoint=events&slug=${slug}`);
    if (!response.ok) throw new Error(`Failed to fetch event`);
    const data = await response.json();
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  } catch (error) {
    console.error(`Error fetching event by slug:`, error);
    return null;
  }
}
