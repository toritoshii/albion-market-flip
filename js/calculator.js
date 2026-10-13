/**
 * Albion Market Flip Calculator
 * Exact tax & margin formulas for Albion Online
 */

const Calculator = {
  SETUP_FEE_RATE: 0.025, // 2.5% for all orders
  PREMIUM_TAX_RATE: 0.04, // 4.0% with Premium
  NON_PREMIUM_TAX_RATE: 0.08, // 8.0% without Premium

  /**
   * Calculate flip metrics for Buy Order -> Sell Order strategy
   * @param {number} sellPriceMin - Current lowest sell order in market
   * @param {number} buyPriceMax - Current highest buy order in market
   * @param {boolean} hasPremium - Whether account has active Premium
   * @param {number} quantity - Quantity of items (default 1)
   */
  calculateFlip(sellPriceMin, buyPriceMax, hasPremium = true, quantity = 1) {
    if (!sellPriceMin || !buyPriceMax || sellPriceMin <= 0 || buyPriceMax <= 0) {
      return null;
    }

    // Recommended Buy Order: 1 silver above highest competitor (or equal)
    const buyPrice = buyPriceMax + 1;
    // Recommended Sell Order: 1 silver below lowest competitor
    const sellPrice = sellPriceMin - 1 > buyPrice ? (sellPriceMin - 1) : sellPriceMin;

    const taxRate = hasPremium ? this.PREMIUM_TAX_RATE : this.NON_PREMIUM_TAX_RATE;

    // Fees for 1 item
    const buySetupFee = Math.round(buyPrice * this.SETUP_FEE_RATE);
    const sellSetupFee = Math.round(sellPrice * this.SETUP_FEE_RATE);
    const salesTax = Math.round(sellPrice * taxRate);
    const totalFees = buySetupFee + sellSetupFee + salesTax;

    const unitCost = buyPrice + buySetupFee;
    const unitNetRevenue = sellPrice - sellSetupFee - salesTax;
    const unitNetProfit = unitNetRevenue - unitCost;
    const roi = unitCost > 0 ? (unitNetProfit / unitCost) * 100 : 0;
    const grossMargin = sellPrice - buyPrice;

    // Scale for quantity
    const totalInvestment = unitCost * quantity;
    const totalRevenue = unitNetRevenue * quantity;
    const totalProfit = unitNetProfit * quantity;

    return {
      buyPrice,
      sellPrice,
      hasPremium,
      taxRate,
      buySetupFee,
      sellSetupFee,
      salesTax,
      totalFees,
      unitCost,
      unitNetRevenue,
      unitNetProfit,
      roi: parseFloat(roi.toFixed(1)),
      grossMargin,
      quantity,
      totalInvestment,
      totalRevenue,
      totalProfit,
      isProfitable: unitNetProfit > 0
    };
  },

  /**
   * Format silver number into human readable string (e.g. 1,450,200 or 1.45M)
   */
  formatSilver(amount, compact = false) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    if (compact) {
      if (Math.abs(amount) >= 1_000_000) {
        return (amount / 1_000_000).toFixed(2) + 'M';
      }
      if (Math.abs(amount) >= 1_000) {
        return (amount / 1_000).toFixed(1) + 'k';
      }
    }
    return new Intl.NumberFormat('en-US').format(Math.round(amount));
  },

  /**
   * Calculate data age in friendly string and freshness level
   */
  getDataAgeInfo(dateString) {
    if (!dateString || dateString.startsWith('0001-01-01')) {
      return { text: 'Chưa có', minutes: 999999, freshness: 'unknown' };
    }

    const itemDate = new Date(dateString + 'Z').getTime();
    const now = Date.now();
    const diffMs = now - itemDate;
    const minutes = Math.max(0, Math.floor(diffMs / 60000));

    let text = '';
    let freshness = 'fresh';

    if (minutes < 1) {
      text = 'Vừa xong';
      freshness = 'fresh';
    } else if (minutes < 60) {
      text = `${minutes}m trước`;
      freshness = minutes <= 30 ? 'fresh' : 'medium';
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      text = `${hours}h trước`;
      freshness = hours <= 6 ? 'medium' : 'stale';
    } else {
      const days = Math.floor(minutes / 1440);
      text = `${days}d trước`;
      freshness = 'expired';
    }

    return { text, minutes, freshness };
  }
};

window.Calculator = Calculator;
