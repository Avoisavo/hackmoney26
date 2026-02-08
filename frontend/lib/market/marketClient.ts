// Market Client for CLOB Server

const CLOB_URL = process.env.NEXT_PUBLIC_CLOB_URL || 'http://localhost:3001';

interface PriceData {
  day: number;
  yesPrice: number;
  noPrice: number;
  yesCents: number;
  noCents: number;
}

interface MarketPrices {
  onDate: PriceData[];
  byDate: PriceData[];
  b: number;
  totalVolume: number;
  status: string;
}

interface BuyRequest {
  user: string;
  marketType: 'on_date' | 'by_date';
  dayIndex: number;
  amount: number;
}

interface SellRequest {
  user: string;
  marketType: 'on_date' | 'by_date';
  dayIndex: number;
  shares: number;
}

interface TradeResult {
  success: boolean;
  cost?: number;
  revenue?: number;
  shares?: number;
  prices?: MarketPrices;
  error?: string;
}

interface Position {
  marketType: string;
  day: number;
  shares: number;
  price: number;
  value: number;
}

interface UserPositions {
  address: string;
  positions: Position[];
  totalShareValue: number;
  session: any;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${CLOB_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

// ==================== READ ====================

export async function fetchMarketPrices(): Promise<MarketPrices> {
  return request<MarketPrices>('/api/market/prices');
}

export async function fetchPositions(address: string): Promise<UserPositions> {
  return request<UserPositions>(`/api/market/positions/${address}`);
}

export async function fetchMarketState(): Promise<any> {
  return request<any>('/api/market/state');
}

// ==================== WRITE ====================

export async function buyShares(params: BuyRequest): Promise<TradeResult> {
  return request<TradeResult>('/api/market/buy', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function sellShares(params: SellRequest): Promise<TradeResult> {
  return request<TradeResult>('/api/market/sell', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function registerSession(params: {
  user: string;
  sessionId?: string;
  userBalance?: number;
  clobBalance?: number;
  version?: number;
}): Promise<{ success: boolean }> {
  return request('/api/market/session', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ==================== CLOB STATUS ====================

export async function fetchCLOBStatus(): Promise<{
  status: string;
  authenticated: boolean;
  clobAddress: string;
  sessionKey: string;
}> {
  const res = await fetch(`${CLOB_URL}/status`);
  return res.json();
}
