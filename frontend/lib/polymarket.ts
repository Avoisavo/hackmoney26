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

export async function fetchEventsByTag(tagId: string, closed: boolean = false): Promise<PolymarketEvent[]> {
  try {
    const response = await fetch(`${PROXY_URL}?endpoint=events&tag_id=${tagId}&limit=20&closed=${closed}`);
    if (!response.ok) throw new Error(`Failed to fetch events`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching events:`, error);
    return [];
  }
}

export interface SectorData {
  active: PolymarketEvent[];
  resolved: PolymarketEvent[];
}

export interface CategorizedEvents {
  politics: SectorData;
  crypto: SectorData;
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
        console.log("fetchTrendingEvents: Starting fetch with date filtering...");
        
        // Use order=volume to get the most relevant events
        const fetchBatch = (tagId: string, closed: boolean) => 
          fetch(`${PROXY_URL}?endpoint=events&tag_id=${tagId}&limit=100&closed=${closed}&order=volume&direction=desc`)
            .then(r => r.ok ? r.json() : []);

        const [
          politicsActiveRaw, 
          politicsResolvedRaw,
          cryptoActiveRaw,
          cryptoResolvedRaw
        ] = await Promise.all([
          fetchBatch('2', false),
          fetchBatch('2', true),
          fetchBatch('21', false),
          fetchBatch('21', true)
        ]);

        const now = new Date();
        
        // Filter for truly ongoing events (endDate > now)
        const processActive = (events: PolymarketEvent[]) => 
          events
            .filter(e => {
              const mainMarket = e.markets?.[0];
              // Strictly ensure it has an endDate and it is in the future
              if (!mainMarket?.endDate) return false; 
              return new Date(mainMarket.endDate) > now;
            })
            .sort((a, b) => Number(b.volume) - Number(a.volume))
            .slice(0, 4);

        // Filter for historical events targetting December 2025
        const processResolved = (events: PolymarketEvent[]) => {
          const dec25Events = events.filter(e => {
            const dateStr = e.markets?.[0]?.endDate || "";
            return dateStr.includes('2025-12');
          });

          // If we found enough Dec 2025 events, return them. 
          // Otherwise, take the most recent ones as a fallback but prioritize Dec 2025.
          const results = dec25Events.length >= 4 
            ? dec25Events 
            : [...dec25Events, ...events.filter(e => !dec25Events.includes(e))]
          
          return results
            .sort((a, b) => Number(b.volume) - Number(a.volume))
            .slice(0, 4);
        };

        return {
          politics: {
            active: processActive(politicsActiveRaw),
            resolved: processResolved(politicsResolvedRaw)
          },
          crypto: {
            active: processActive(cryptoActiveRaw),
            resolved: processResolved(cryptoResolvedRaw)
          }
        };
    } catch (error) {
        console.error("fetchTrendingEvents: Error:", error);
        return { 
          politics: { active: [], resolved: [] }, 
          crypto: { active: [], resolved: [] } 
        };
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
