/**
 * Albion Market Flip Calculator
 *
 * Fee rules (Albion Online):
 *  - Placing an order (Buy Order or Sell Order): 2.5% setup fee on the order value.
 *  - Instant buy (taking an existing Sell Order): no fee.
 *  - Every sale (filled Sell Order or instant sell into a Buy Order / Black Market):
 *    market tax 4% with Premium, 8% without.
 */

const Calculator = {
  SETUP_FEE_RATE: 0.025,
  PREMIUM_TAX_RATE: 0.04,
  NON_PREMIUM_TAX_RATE: 0.08,

  // Share of an item's daily traded volume we assume one trader can realistically capture.
  MARKET_SHARE: 0.1,

  /**
   * Generic trade calculation.
   * @param {object} p
   * @param {number} p.buyPrice   unit price paid
   * @param {'order'|'instant'} p.buyType
   * @param {number} p.sellPrice  unit price received (before fees)
   * @param {'order'|'instant'} p.sellType
   * @param {boolean} p.hasPremium
   * @param {number} [p.quantity=1]
   */
  computeTrade({ buyPrice, buyType, sellPrice, sellType, hasPremium = true, quantity = 1 }) {
    if (!buyPrice || !sellPrice || buyPrice <= 0 || sellPrice <= 0) return null;

    const taxRate = hasPremium ? this.PREMIUM_TAX_RATE : this.NON_PREMIUM_TAX_RATE;
    const buySetupFee = buyType === 'order' ? Math.round(buyPrice * this.SETUP_FEE_RATE) : 0;
    const sellSetupFee = sellType === 'order' ? Math.round(sellPrice * this.SETUP_FEE_RATE) : 0;
    const salesTax = Math.round(sellPrice * taxRate);

    const unitCost = buyPrice + buySetupFee;
    const unitNetRevenue = sellPrice - sellSetupFee - salesTax;
    const unitNetProfit = unitNetRevenue - unitCost;
    const roi = unitCost > 0 ? (unitNetProfit / unitCost) * 100 : 0;

    return {
      buyPrice,
      sellPrice,
      buyType,
      sellType,
      hasPremium,
      taxRate,
      buySetupFee,
      sellSetupFee,
      salesTax,
      totalFees: buySetupFee + sellSetupFee + salesTax,
      unitCost,
      unitNetRevenue,
      unitNetProfit,
      roi: parseFloat(roi.toFixed(1)),
      grossMargin: sellPrice - buyPrice,
      quantity,
      totalInvestment: unitCost * quantity,
      totalRevenue: unitNetRevenue * quantity,
      totalProfit: unitNetProfit * quantity,
      isProfitable: unitNetProfit > 0
    };
  },

  /**
   * Stationary flip: Buy Order at (highest buy + 1) -> Sell Order at (lowest sell - 1).
   * Kept for backwards compatibility.
   */
  calculateFlip(sellPriceMin, buyPriceMax, hasPremium = true, quantity = 1) {
    if (!sellPriceMin || !buyPriceMax || sellPriceMin <= 0 || buyPriceMax <= 0) return null;
    const buyPrice = buyPriceMax + 1;
    const sellPrice = sellPriceMin - 1 > buyPrice ? sellPriceMin - 1 : sellPriceMin;
    return this.computeTrade({ buyPrice, buyType: 'order', sellPrice, sellType: 'order', hasPremium, quantity });
  },

  /** Estimated profit/day if we capture MARKET_SHARE of the daily volume. */
  estimateDaily(unitNetProfit, dailyVolume) {
    if (dailyVolume == null || unitNetProfit <= 0) return { qtyPerDay: null, profitPerDay: null };
    const qtyPerDay = Math.max(0, Math.floor(dailyVolume * this.MARKET_SHARE));
    return { qtyPerDay, profitPerDay: qtyPerDay * unitNetProfit };
  },

  formatSilver(amount, compact = false) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    if (compact) {
      if (Math.abs(amount) >= 1_000_000) return (amount / 1_000_000).toFixed(2) + 'M';
      if (Math.abs(amount) >= 1_000) return (amount / 1_000).toFixed(1) + 'k';
    }
    return new Intl.NumberFormat('en-US').format(Math.round(amount));
  },

  /** Minutes since an AODP timestamp (UTC, no 'Z'). Missing -> Infinity. */
  minutesSince(dateString) {
    if (!dateString || dateString.startsWith('0001-01-01')) return Infinity;
    const t = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z').getTime();
    if (isNaN(t)) return Infinity;
    return Math.max(0, Math.floor((Date.now() - t) / 60000));
  },

  freshnessOf(minutes) {
    if (!isFinite(minutes)) return 'unknown';
    if (minutes < 60) return 'fresh';
    if (minutes < 360) return 'medium';
    if (minutes < 1440) return 'stale';
    return 'expired';
  },

  ageText(minutes) {
    if (!isFinite(minutes)) return 'Chưa có';
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes}m trước`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h trước`;
    return `${Math.floor(minutes / 1440)}d trước`;
  },

  /** Backwards-compatible helper used by older code. */
  getDataAgeInfo(dateString) {
    const minutes = this.minutesSince(dateString);
    return {
      text: this.ageText(minutes),
      minutes: isFinite(minutes) ? minutes : 999999,
      freshness: isFinite(minutes) ? this.freshnessOf(minutes) : 'unknown'
    };
  }
};

if (typeof window !== 'undefined') window.Calculator = Calculator;
if (typeof module !== 'undefined') module.exports = Calculator;
