// Market State Management

const fs = require('fs');
const path = require('path');
const { NUM_DAYS, dynamicB, quantitiesFromPrices } = require('./lmsr');

const DEFAULT_STATE_PATH = path.join(__dirname, 'data', 'market-state.json');

// ==================== INITIAL MARKET DATA ====================
// Derived from iran.json prices (28 days in February)

const INITIAL_ON_DATE_PRICES = [
  0.024, 0.015, 0.086, 0.032, 0.007, 0.059, 0.011, 0.123,
  0.044, 0.016, 0.078, 0.021, 0.094, 0.036, 0.019, 0.062,
  0.035, 0.089, 0.023, 0.158, 0.042, 0.017, 0.111, 0.054,
  0.028, 0.182, 0.036, 0.220
];

// ==================== STATE FUNCTIONS ====================

function createMarket(opts = {}) {
  const b = opts.minB || 150;
  
  const onDateQuantities = quantitiesFromPrices(INITIAL_ON_DATE_PRICES, b);
  
  const byDateQuantities = new Array(NUM_DAYS).fill(0);
  
  return {
    market: {
      id: opts.id || 'us-iran-2026',
      events: [
        { type: 'on_date', description: 'US next strikes Iran on [date]?' },
        { type: 'by_date', description: 'US strikes Iran by [date]?' },
      ],
      status: 'open',
      resolution: null,
      totalVolume: opts.initialVolume || 1000,
    },
    amm: {
      onDate: {
        quantities: onDateQuantities,
      },
      byDate: {
        quantities: byDateQuantities,
      },
      alpha: opts.alpha || 0.04,
      minB: opts.minB || 150,
    },
    balances: {},
    trades: [],
    sessions: {},
  };
}

function getB(state) {
  return dynamicB(state.amm.alpha, state.market.totalVolume, state.amm.minB);
}

function ensureUserBalance(state, user) {
  if (!state.balances[user]) {
    state.balances[user] = {
      onDate: new Array(NUM_DAYS).fill(0),
      byDate: new Array(NUM_DAYS).fill(0),
      usd: 0,
    };
  }
  return state.balances[user];
}

function updateBalance(state, user, marketType, dayIndex, delta) {
  ensureUserBalance(state, user);
  if (marketType === 'on_date') {
    state.balances[user].onDate[dayIndex] += delta;
  } else {
    state.balances[user].byDate[dayIndex] += delta;
  }
}

function getUserShares(state, user, marketType, dayIndex) {
  ensureUserBalance(state, user);
  if (marketType === 'on_date') {
    return state.balances[user].onDate[dayIndex] || 0;
  }
  return state.balances[user].byDate[dayIndex] || 0;
}

function recordTrade(state, trade) {
  state.trades.push({
    id: state.trades.length + 1,
    timestamp: Date.now(),
    ...trade,
  });
  
  // Keep only last 100 trades
  if (state.trades.length > 100) {
    state.trades = state.trades.slice(-100);
  }
}

function setSession(state, user, session) {
  state.sessions[user] = {
    ...state.sessions[user],
    ...session,
    updatedAt: Date.now(),
  };
}

function getSession(state, user) {
  return state.sessions[user] || null;
}

// ==================== PERSISTENCE ====================

function loadState(filePath = DEFAULT_STATE_PATH) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load state:', err.message);
  }
  return null;
}

function saveState(state, filePath = DEFAULT_STATE_PATH) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save state:', err.message);
  }
}

function resolveMarket(state, winningDay) {
  state.market.status = 'resolved';
  state.market.resolution = winningDay;
  
  // Calculate payouts (simplified)
  const payouts = {};
  for (const [user, balance] of Object.entries(state.balances)) {
    const shares = balance.onDate[winningDay - 1] || 0;
    if (shares > 0) {
      payouts[user] = shares;
    }
  }
  
  return { winningDay, payouts };
}

module.exports = {
  DEFAULT_STATE_PATH,
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
};
