// Market API Routes

const { getAllPrices, tradeCost, sharesForBudget, NUM_DAYS } = require('./lmsr');
const {
  createMarket,
  getB,
  ensureUserBalance,
  updateBalance,
  getUserShares,
  recordTrade,
  setSession,
  getSession,
  loadState,
  saveState,
  resolveMarket,
} = require('./state');

let marketState = null;
let statePath = null;

function getState() {
  return marketState;
}

function persist() {
  if (marketState && statePath) {
    saveState(marketState, statePath);
  }
}

function handlePrices() {
  if (!marketState) return { error: 'No market exists' };
  
  const b = getB(marketState);
  
  return {
    onDate: getAllPrices(marketState.amm.onDate.quantities, b, 'on_date'),
    byDate: getAllPrices(marketState.amm.byDate.quantities, b, 'by_date'),
    b,
    totalVolume: marketState.market.totalVolume,
    status: marketState.market.status,
  };
}

function handleBuy(body) {
  if (!marketState) return { error: 'No market exists' };
  if (marketState.market.status !== 'open') return { error: 'Market not open' };
  
  const { user, marketType, dayIndex, amount } = body;
  if (!user || !marketType || dayIndex === undefined || !amount || amount <= 0) {
    return { error: 'Invalid params: user, marketType, dayIndex, amount required' };
  }
  
  if (dayIndex < 0 || dayIndex >= NUM_DAYS) {
    return { error: 'Invalid dayIndex' };
  }
  
  const b = getB(marketState);
  const quantities = marketType === 'on_date' 
    ? marketState.amm.onDate.quantities 
    : marketState.amm.byDate.quantities;
  
  // Calculate shares for budget
  const shares = sharesForBudget(quantities, dayIndex, b, amount, true);
  
  // Execute trade
  const delta = new Array(NUM_DAYS).fill(0);
  delta[dayIndex] = shares;
  const cost = tradeCost(quantities, delta, b);
  
  // Update AMM quantities
  for (let i = 0; i < NUM_DAYS; i++) {
    quantities[i] += delta[i];
  }
  
  // Update user balance
  updateBalance(marketState, user, marketType, dayIndex, shares);
  
  // Update volume
  marketState.market.totalVolume += cost;
  
  recordTrade(marketState, {
    user,
    type: 'buy',
    marketType,
    dayIndex,
    amount: cost,
    shares,
  });
  
  persist();
  
  return {
    success: true,
    cost: Math.round(cost * 10000) / 10000,
    shares: Math.round(shares * 10000) / 10000,
    prices: handlePrices(),
  };
}

function handleSell(body) {
  if (!marketState) return { error: 'No market exists' };
  if (marketState.market.status !== 'open') return { error: 'Market not open' };
  
  const { user, marketType, dayIndex, shares } = body;
  if (!user || !marketType || dayIndex === undefined || !shares || shares <= 0) {
    return { error: 'Invalid params: user, marketType, dayIndex, shares required' };
  }
  
  // Check user has shares
  const userShares = getUserShares(marketState, user, marketType, dayIndex);
  if (userShares < shares - 0.001) {
    return { error: `Insufficient shares: have ${userShares}, need ${shares}` };
  }
  
  const b = getB(marketState);
  const quantities = marketType === 'on_date' 
    ? marketState.amm.onDate.quantities 
    : marketState.amm.byDate.quantities;
  
  // Calculate revenue
  const delta = new Array(NUM_DAYS).fill(0);
  delta[dayIndex] = -shares;
  const revenue = -tradeCost(quantities, delta, b);
  
  // Update AMM quantities
  for (let i = 0; i < NUM_DAYS; i++) {
    quantities[i] += delta[i];
  }
  
  // Update user balance
  updateBalance(marketState, user, marketType, dayIndex, -shares);
  
  // Update volume
  marketState.market.totalVolume += revenue;
  
  recordTrade(marketState, {
    user,
    type: 'sell',
    marketType,
    dayIndex,
    amount: -revenue,
    shares,
  });
  
  persist();
  
  return {
    success: true,
    revenue: Math.round(revenue * 10000) / 10000,
    shares: Math.round(shares * 10000) / 10000,
    prices: handlePrices(),
  };
}

function handleGetPositions(address) {
  if (!marketState) return { error: 'No market exists' };
  
  ensureUserBalance(marketState, address);
  const balance = marketState.balances[address];
  const b = getB(marketState);
  
  const onDatePrices = getAllPrices(marketState.amm.onDate.quantities, b, 'on_date');
  const byDatePrices = getAllPrices(marketState.amm.byDate.quantities, b, 'by_date');
  
  const positions = [];
  let totalValue = 0;
  
  for (let i = 0; i < NUM_DAYS; i++) {
    if (balance.onDate[i] > 0) {
      const value = balance.onDate[i] * onDatePrices[i].yesPrice;
      totalValue += value;
      positions.push({
        marketType: 'on_date',
        day: i + 1,
        shares: Math.round(balance.onDate[i] * 10000) / 10000,
        price: onDatePrices[i].yesPrice,
        value: Math.round(value * 10000) / 10000,
      });
    }
    if (balance.byDate[i] > 0) {
      const value = balance.byDate[i] * byDatePrices[i].yesPrice;
      totalValue += value;
      positions.push({
        marketType: 'by_date',
        day: i + 1,
        shares: Math.round(balance.byDate[i] * 10000) / 10000,
        price: byDatePrices[i].yesPrice,
        value: Math.round(value * 10000) / 10000,
      });
    }
  }
  
  const session = getSession(marketState, address);
  
  return {
    address,
    positions,
    totalShareValue: Math.round(totalValue * 10000) / 10000,
    session,
  };
}

function handleRegisterSession(body) {
  if (!marketState) return { error: 'No market exists' };
  
  const { user, sessionId, userBalance, clobBalance, version } = body;
  if (!user) return { error: 'Missing user address' };
  
  setSession(marketState, user, { sessionId, userBalance, clobBalance, version });
  persist();
  
  return { success: true, session: getSession(marketState, user) };
}

function handleGetState() {
  if (!marketState) return { error: 'No market exists' };
  
  return {
    market: marketState.market,
    amm: {
      b: getB(marketState),
      alpha: marketState.amm.alpha,
      minB: marketState.amm.minB,
    },
    tradeCount: marketState.trades.length,
    recentTrades: marketState.trades.slice(-10),
  };
}

function handleResolve(body) {
  if (!marketState) return { error: 'No market exists' };
  
  const { winningDay } = body;
  if (!winningDay || winningDay < 1 || winningDay > NUM_DAYS) {
    return { error: 'Provide winningDay: 1-28' };
  }
  
  const result = resolveMarket(marketState, winningDay);
  persist();
  
  return { success: true, ...result };
}

// ==================== ROUTER ====================

function createMarketRouter(opts = {}) {
  const path = require('path');
  statePath = opts.statePath || path.join(__dirname, 'data', 'market-state.json');
  
  // Load or create market
  marketState = loadState(statePath);
  if (!marketState) {
    console.log('Creating new market...');
    marketState = createMarket({
      id: 'us-iran-2026',
      alpha: 0.04,
      minB: 150,
      initialVolume: 1000,
    });
    persist();
    console.log('Market created and initialized from iran.json prices');
  } else {
    console.log(`Loaded existing market: ${marketState.market.id} (${marketState.market.status})`);
  }
  
  return function handleMarketRequest(req, res, parsedUrl, body) {
    const url = parsedUrl || req.url;
    const method = req.method;
    
    let pathname = url;
    if (url.includes('?')) {
      pathname = url.split('?')[0];
    }
    
    if (!pathname.startsWith('/api/market')) return false;
    const route = pathname.slice('/api/market'.length) || '/';
    
    let result;
    
    try {
      if (method === 'GET') {
        if (route === '/prices') {
          result = handlePrices();
        } else if (route === '/state') {
          result = handleGetState();
        } else if (route.startsWith('/positions/')) {
          const address = route.slice('/positions/'.length);
          result = handleGetPositions(address);
        } else {
          return false;
        }
      } else if (method === 'POST') {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        
        if (route === '/buy') {
          result = handleBuy(data);
        } else if (route === '/sell') {
          result = handleSell(data);
        } else if (route === '/session') {
          result = handleRegisterSession(data);
        } else if (route === '/resolve') {
          result = handleResolve(data);
        } else {
          return false;
        }
      } else {
        return false;
      }
      
      res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return true;
      
    } catch (err) {
      console.error('Market API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  };
}

module.exports = { createMarketRouter, getState };
