// LMSR (Logarithmic Market Scoring Rule) Pricing Engine

const NUM_DAYS = 28; // February 2026

// Log-sum-exp for numerical stability
function logSumExp(values) {
  const max = Math.max(...values);
  if (!isFinite(max)) return max;
  const sum = values.reduce((acc, v) => acc + Math.exp(v - max), 0);
  return max + Math.log(sum);
}

function costFunction(quantities, b) {
  const scaled = quantities.map(q => q / b);
  return b * logSumExp(scaled);
}

function allDayPrices(quantities, b) {
  const scaled = quantities.map(q => q / b);
  const lse = logSumExp(scaled);
  return scaled.map(s => Math.exp(s - lse));
}

function getAllPrices(quantities, b, marketType = 'on_date') {
  const dayPrices = allDayPrices(quantities, b);
  
  if (marketType === 'on_date') {
    return dayPrices.map((yesPrice, idx) => ({
      day: idx + 1,
      yesPrice: Math.round(yesPrice * 10000) / 10000,
      noPrice: Math.round((1 - yesPrice) * 10000) / 10000,
      yesCents: Math.round(yesPrice * 100 * 10) / 10,
      noCents: Math.round((1 - yesPrice) * 100 * 10) / 10,
    }));
  }
  
  let cumulative = 0;
  return dayPrices.map((p, idx) => {
    cumulative += p;
    return {
      day: idx + 1,
      yesPrice: Math.round(cumulative * 10000) / 10000,
      noPrice: Math.round((1 - cumulative) * 10000) / 10000,
      yesCents: Math.round(cumulative * 100 * 10) / 10,
      noCents: Math.round((1 - cumulative) * 100 * 10) / 10,
    };
  });
}

function tradeCost(currentQty, tradeVector, b) {
  const newQty = currentQty.map((q, i) => q + (tradeVector[i] || 0));
  return costFunction(newQty, b) - costFunction(currentQty, b);
}

function dynamicB(alpha, totalVolume, minB) {
  return Math.max(minB, alpha * totalVolume);
}

function sharesForBudget(quantities, dayIndex, b, budget, isBuy = true) {
  const direction = isBuy ? 1 : -1;
  let low = 0;
  let high = budget * 100; // Upper bound on shares
  
  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;
    const delta = new Array(quantities.length).fill(0);
    delta[dayIndex] = mid * direction;
    const cost = tradeCost(quantities, delta, b);
    
    if (Math.abs(cost - budget) < 0.0001) {
      return mid;
    }
    
    if (cost < budget) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return (low + high) / 2;
}

function quantitiesFromPrices(prices, b) {
  const sum = prices.reduce((a, b) => a + b, 0);
  const normalized = prices.map(p => Math.max(0.001, p / sum));
  
  const logPrices = normalized.map(p => Math.log(p));
  const avgLog = logPrices.reduce((a, b) => a + b, 0) / logPrices.length;
  
  return logPrices.map(lp => b * (lp - avgLog));
}

module.exports = {
  NUM_DAYS,
  costFunction,
  allDayPrices,
  getAllPrices,
  tradeCost,
  dynamicB,
  sharesForBudget,
  quantitiesFromPrices,
};
