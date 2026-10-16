/**
 * Flip strategies. Pure functions over AODP price records so they can be tested in Node.
 *
 *  stationary  : Buy Order + Sell Order in the same city (classic "flip tại chỗ").
 *  transport   : buy in city A, carry, sell in city B (best B picked automatically).
 *  blackmarket : buy gear in a city, instant-sell to the Black Market in Caerleon.
 */
(function (root) {
  const Calc = (typeof module !== 'undefined' && typeof require === 'function')
    ? require('./calculator.js')
    : root.Calculator;

  const CITIES = ['Lymhurst', 'Fort Sterling', 'Thetford', 'Bridgewatch', 'Martlock', 'Caerleon', 'Brecilien'];
  const BLACK_MARKET = 'Black Market';
  const ALL = 'ALL';

  /** item_id|quality -> { location -> record } */
  function buildIndex(records) {
    const index = new Map();
    for (const r of records) {
      const key = `${r.item_id}|${r.quality}`;
      if (!index.has(key)) index.set(key, {});
      index.get(key)[r.city] = r;
    }
    return index;
  }

  // Price you pay on the buy side.
  function buySide(rec, buyType) {
    if (!rec) return null;
    if (buyType === 'instant') {
      return rec.sell_price_min > 0 ? { price: rec.sell_price_min, minutes: Calc.minutesSince(rec.sell_price_min_date) } : null;
    }
    return rec.buy_price_max > 0 ? { price: rec.buy_price_max + 1, minutes: Calc.minutesSince(rec.buy_price_max_date) } : null;
  }

  // Price you receive on the sell side.
  function sellSide(rec, sellType) {
    if (!rec) return null;
    if (sellType === 'instant') {
      return rec.buy_price_max > 0 ? { price: rec.buy_price_max, minutes: Calc.minutesSince(rec.buy_price_max_date) } : null;
    }
    return rec.sell_price_min > 1 ? { price: rec.sell_price_min - 1, minutes: Calc.minutesSince(rec.sell_price_min_date) } : null;
  }

  function makeOpportunity(itemId, quality, buyCity, buyType, buy, sellCity, sellType, sell, hasPremium) {
    const calc = Calc.computeTrade({ buyPrice: buy.price, buyType, sellPrice: sell.price, sellType, hasPremium });
    if (!calc) return null;
    const minutes = Math.max(buy.minutes, sell.minutes);
    return {
      id: itemId,
      quality,
      buyCity,
      sellCity,
      buyType,
      sellType,
      ...calc,
      minutes,
      spreadRatio: sell.price / buy.price
    };
  }

  function better(a, b) {
    if (!a) return b;
    if (!b) return a;
    return b.unitNetProfit > a.unitNetProfit ? b : a;
  }

  /**
   * @param {Map} index       from buildIndex
   * @param {object} opts
   * @param {'stationary'|'transport'|'blackmarket'} opts.mode
   * @param {string} opts.city              city to flip in / buy from, or 'ALL'
   * @param {boolean} opts.hasPremium
   * @param {'order'|'instant'} [opts.buyType]   transport / blackmarket only
   * @param {'order'|'instant'} [opts.sellType]  transport only
   * @param {boolean} [opts.avoidCaerleon]       transport only
   * @param {number} [opts.maxSpreadRatio]       drop sell/buy ratios above this (fake listings); 0 = off
   * @param {(id: string) => boolean} [opts.isBmItem]
   */
  function findOpportunities(index, opts) {
    const out = [];
    const maxRatio = opts.maxSpreadRatio || 0;
    const buyCities = opts.city === ALL ? CITIES : [opts.city];

    for (const [key, byLoc] of index) {
      const sep = key.lastIndexOf('|');
      const itemId = key.slice(0, sep);
      const quality = parseInt(key.slice(sep + 1), 10);
      let best = null;
      const consider = (opp) => {
        if (!opp) return;
        if (maxRatio > 0 && opp.spreadRatio > maxRatio) return; // likely a fake/troll listing
        best = better(best, opp);
      };

      if (opts.mode === 'stationary') {
        const rec = byLoc[opts.city];
        const buy = buySide(rec, 'order');
        const sell = sellSide(rec, 'order');
        if (buy && sell && sell.price > buy.price) {
          consider(makeOpportunity(itemId, quality, opts.city, 'order', buy, opts.city, 'order', sell, opts.hasPremium));
        }
      } else if (opts.mode === 'transport') {
        for (const src of buyCities) {
          const buy = buySide(byLoc[src], opts.buyType);
          if (!buy) continue;
          for (const dst of CITIES) {
            if (dst === src) continue;
            if (opts.avoidCaerleon && (dst === 'Caerleon' || src === 'Caerleon')) continue;
            const sell = sellSide(byLoc[dst], opts.sellType);
            if (!sell) continue;
            consider(makeOpportunity(itemId, quality, src, opts.buyType, buy, dst, opts.sellType, sell, opts.hasPremium));
          }
        }
      } else if (opts.mode === 'blackmarket') {
        if (opts.isBmItem && !opts.isBmItem(itemId)) continue;
        const sell = sellSide(byLoc[BLACK_MARKET], 'instant');
        if (!sell) continue;
        for (const src of buyCities) {
          const buy = buySide(byLoc[src], opts.buyType);
          if (!buy) continue;
          consider(makeOpportunity(itemId, quality, src, opts.buyType, buy, BLACK_MARKET, 'instant', sell, opts.hasPremium));
        }
      }

      if (best) out.push(best);
    }
    return out;
  }

  const Strategies = { CITIES, BLACK_MARKET, ALL, buildIndex, findOpportunities, buySide, sellSide };
  if (typeof module !== 'undefined') module.exports = Strategies;
  if (typeof window !== 'undefined') window.Strategies = Strategies;
})(typeof window !== 'undefined' ? window : globalThis);
