/**
 * Flip strategies. Pure functions over AODP price records so they can be tested in Node.
 *
 *  stationary  : Buy Order + Sell Order in the same city (classic "flip tại chỗ").
 *  transport   : buy in city A, carry, sell in city B (best B picked automatically).
 *  blackmarket : buy gear in a city, instant-sell to the Black Market in Caerleon.
 *  loot        : you already own the item (farmed loot) - best place/way to sell it.
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
   * @param {'stationary'|'transport'|'blackmarket'|'loot'} opts.mode
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

      if (opts.mode === 'loot') {
        const opp = bestLootSale(itemId, quality, byLoc, opts, maxRatio);
        if (opp) out.push(opp);
        continue;
      }

      if (best) out.push(best);
    }
    return out;
  }

  /** Net silver received for selling 1 unit you already own. */
  function netSale(price, sellType, hasPremium) {
    const taxRate = hasPremium ? Calc.PREMIUM_TAX_RATE : Calc.NON_PREMIUM_TAX_RATE;
    const setup = sellType === 'order' ? Math.round(price * Calc.SETUP_FEE_RATE) : 0;
    const tax = Math.round(price * taxRate);
    return { setup, tax, taxRate, net: price - setup - tax };
  }

  /**
   * Loot mode: you already own the item (from farming). Find where/how to sell it for the most silver.
   * opts.city = where you are now ('ALL' = willing to travel anywhere).
   */
  function bestLootSale(itemId, quality, byLoc, opts, maxRatio) {
    const places = opts.city === ALL ? CITIES.slice() : [opts.city];
    const bmOk = (!opts.isBmItem || opts.isBmItem(itemId)) && (opts.city === ALL || opts.city === 'Caerleon');
    const candidates = [];

    for (const city of places) {
      const rec = byLoc[city];
      if (!rec) continue;
      const instant = sellSide(rec, 'instant');
      const order = sellSide(rec, 'order');
      if (instant) candidates.push({ city, type: 'instant', side: instant });
      // A sell order far above what buyers pay is usually a troll listing that will never fill.
      if (order && !(maxRatio > 0 && instant && order.price / instant.price > maxRatio)) {
        candidates.push({ city, type: 'order', side: order });
      }
    }
    if (bmOk) {
      const bm = sellSide(byLoc[BLACK_MARKET], 'instant');
      if (bm) candidates.push({ city: BLACK_MARKET, type: 'instant', side: bm });
    }
    if (candidates.length === 0) return null;

    let best = null;
    let bestInstant = null;
    for (const c of candidates) {
      const s = netSale(c.side.price, c.type, opts.hasPremium);
      const row = { ...c, ...s };
      if (!best || row.net > best.net) best = row;
      if (c.type === 'instant' && (!bestInstant || row.net > bestInstant.net)) bestInstant = row;
    }

    return {
      id: itemId,
      quality,
      buyCity: best.city,
      sellCity: best.city,
      buyType: 'owned',
      sellType: best.type,
      buyPrice: 0,
      sellPrice: best.side.price,
      hasPremium: opts.hasPremium,
      taxRate: best.taxRate,
      buySetupFee: 0,
      sellSetupFee: best.setup,
      salesTax: best.tax,
      totalFees: best.setup + best.tax,
      unitCost: 0,
      unitNetRevenue: best.net,
      unitNetProfit: best.net,
      roi: 0,
      minutes: best.side.minutes,
      spreadRatio: 1,
      // Fallback if you don't want to wait for a sell order to fill.
      instantAlt: bestInstant && bestInstant !== best
        ? { city: bestInstant.city, price: bestInstant.side.price, net: bestInstant.net }
        : null
    };
  }

  const Strategies = { CITIES, BLACK_MARKET, ALL, buildIndex, findOpportunities, buySide, sellSide, netSale, bestLootSale };
  if (typeof module !== 'undefined') module.exports = Strategies;
  if (typeof window !== 'undefined') window.Strategies = Strategies;
})(typeof window !== 'undefined' ? window : globalThis);
