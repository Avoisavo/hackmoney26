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
      fetch(`${PROXY_URL}?endpoint=events&tag_id=${tagId}&limit=200&closed=${closed}&order=volume&direction=desc`)
        .then(r => r.ok ? r.json() : []);

    const [
      politicsActiveRaw,
      cryptoActiveRaw,
    ] = await Promise.all([
      fetchBatch('2', false),
      fetchBatch('21', false),
    ]);

    const now = new Date();

    const blacklist = [
      'oregon-republican',
      'west-virginia-democratic-senate-primary-winner',
      'oklahoma-democratic-senate-primary-winner',
      'mark-kelly-charge',
      'mike-lindell',
      'stacey-plaskett',
      'katie-porter',
      'new-york-governor-democratic-primary-winner',
      'steve-bannon',
      'trump-say-education',
      'kansas-democratic',
      'delaware-democratic',
      'karoline-leavitt',
      'cbs-evening-news',
      'republika-srpska',
      'bush-say',
      'trump-say',
      'cheney-memorial',
      'education-event',
      'august-23'
    ];

    // Filter for fragmented events (high market count)
    const processActive = (events: PolymarketEvent[], isPolitics: boolean) => {
      let hasElon = false;
      let hasPassenger = false;
      return events
        .filter(e => {
          const slug = (e.slug || "").toLowerCase();
          const title = (e.title || "").toLowerCase();

          // Whitelist checks - ALWAYS KEEP THESE
          const isElon16 = title.includes('elon musk') && title.includes('september 16');
          if (isElon16) {
            hasElon = true;
            return true;
          }
          if (slug === 'ny-06-democratic-primary-winner' || slug.includes('xrp')) return true;
          if (title.includes('dreamcash') || title.includes('penguin') || title.includes('hylo') || title.includes('xrp')) return true;
          if (title.includes('who will trump pick')) return true;

          // Limit Elon Musk to only one (if not already found via whitelist)
          if (title.includes('elon musk')) {
            if (hasElon) return false;
            hasElon = true;
            return true;
          }

          // Limit TSA Passengers to only one
          if (title.includes('passenger') || title.includes('tsa')) {
            if (hasPassenger) return false;
            hasPassenger = true;
            return true;
          }

          // Blacklist checks
          if (blacklist.some(b => slug.includes(b) || title.includes(b))) return false;

          // Repetitive binary house elections
          if (isPolitics && title.includes("house election winner") && !title.includes("ny-06")) return false;

          const markets = e.markets || [];
          // Require > 3 markets for non-whitelisted to avoid "2 options" issues
          if (markets.length <= 3) return false;

          const mainMarket = markets[0];
          if (!mainMarket?.endDate) return false;
          return new Date(mainMarket.endDate) > now;
        })
        .sort((a, b) => {
          // Priority for whitelisted
          const aWhite = (a.title || "").toLowerCase().match(/ny-06|xrp|dreamcash|penguin|hylo|who will trump pick|elon musk|passenger|tsa/) ? 1 : 0;
          const bWhite = (b.title || "").toLowerCase().match(/ny-06|xrp|dreamcash|penguin|hylo|who will trump pick|elon musk|passenger|tsa/) ? 1 : 0;
          if (aWhite !== bWhite) return bWhite - aWhite;
          return (b.markets?.length || 0) - (a.markets?.length || 0);
        })
        .slice(0, 4);
    };

    const processResolved = (events: PolymarketEvent[]) => {
      let hasElon = false;
      let hasPassenger = false;
      return events
        .filter(e => {
          const slug = (e.slug || "").toLowerCase();
          const title = (e.title || "").toLowerCase();

          // Specific date whitelist
          if (title.includes('elon musk') && title.includes('september 16')) {
            hasElon = true;
            return true;
          }

          // Blacklist requested binaries/bad logic
          if (blacklist.some(b => slug.includes(b) || title.includes(b))) return false;

          // Limit Elon Musk to only one
          if (title.includes('elon musk')) {
            if (hasElon) return false;
            hasElon = true;
            return true;
          }

          // Limit TSA Passengers
          if (title.includes('passenger') || title.includes('tsa')) {
            if (hasPassenger) return false;
            hasPassenger = true;
            return true;
          }

          // Ensure we only show fragmented outcomes (min 4 sub-markets)
          return e.markets && e.markets.length > 3;
        })
        .sort((a, b) => {
          // Priority for whitelisted patterns in resolved
          const aWhite = (a.title || "").toLowerCase().match(/who will trump pick|elon musk|passenger|tsa/) ? 1 : 0;
          const bWhite = (b.title || "").toLowerCase().match(/who will trump pick|elon musk|passenger|tsa/) ? 1 : 0;
          if (aWhite !== bWhite) return bWhite - aWhite;
          return (b.markets?.length || 0) - (a.markets?.length || 0);
        })
        .slice(0, 4);
    };

    return {
      politics: {
        active: processActive(politicsActiveRaw, true),
        resolved: []
      },
      crypto: {
        active: processActive(cryptoActiveRaw, false),
        resolved: []
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
