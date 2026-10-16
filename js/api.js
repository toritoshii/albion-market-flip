/**
 * Albion Online Data Project (AODP) API Client
 * Supports Asia (East), Americas (West), Europe servers.
 *
 * AODP rate limit: ~180 requests/min and ~300 requests/5 min per IP.
 * We request every market location in one call per chunk of items, so switching
 * city or flip mode never needs a refetch.
 */

const AlbionAPI = {
  SERVERS: {
    east: { name: 'Asia (Singapore)', url: 'https://east.albion-online-data.com' },
    west: { name: 'Americas (Washington)', url: 'https://west.albion-online-data.com' },
    europe: { name: 'Europe (Amsterdam)', url: 'https://europe.albion-online-data.com' }
  },

  CITIES: ['Lymhurst', 'Fort Sterling', 'Thetford', 'Bridgewatch', 'Martlock', 'Caerleon', 'Brecilien'],
  BLACK_MARKET: 'Black Market',

  CHUNK_SIZE: 60,
  THROTTLE_MS: 350,          // ~170 req/min worst case, under AODP's limit
  MAX_RETRIES: 3,

  currentServer: 'east',
  priceCache: new Map(),     // key -> { timestamp, data }
  priceTTL: 2 * 60 * 1000,
  historyCache: new Map(),   // key -> { timestamp, volume }
  historyTTL: 30 * 60 * 1000,

  setServer(serverKey) {
    if (this.SERVERS[serverKey]) {
      this.currentServer = serverKey;
      this.priceCache.clear();
      this.historyCache.clear();
    }
  },

  getBaseUrl() {
    return this.SERVERS[this.currentServer].url;
  },

  getItemImageUrl(itemId, quality = 1) {
    if (!itemId) return '';
    return `https://render.albiononline.com/v1/item/${encodeURIComponent(itemId)}.png?quality=${quality}`;
  },

  chunkArray(array, size = this.CHUNK_SIZE) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
  },

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  },

  /** fetch JSON with retry on 429 / 5xx / network errors (exponential backoff). */
  async fetchJson(url) {
    let delay = 2000;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch(url);
        if (resp.ok) return await resp.json();
        if (resp.status !== 429 && resp.status < 500) {
          console.warn(`AODP ${resp.status}: ${url}`);
          return null;
        }
        const retryAfter = parseInt(resp.headers.get('Retry-After') || '', 10);
        if (!isNaN(retryAfter)) delay = retryAfter * 1000;
        console.warn(`AODP ${resp.status}, retry in ${delay}ms`);
      } catch (err) {
        console.warn('AODP network error, retrying', err);
      }
      if (attempt < this.MAX_RETRIES) {
        await this.sleep(delay);
        delay *= 2;
      }
    }
    return null;
  },

  /**
   * Fetch current prices for items at every city + Black Market.
   * @returns {Promise<{data: object[], failedChunks: number}>}
   */
  async fetchPrices(itemIds, qualities = [1, 2, 3], onProgress = null, forceRefresh = false) {
    if (!itemIds || itemIds.length === 0) return { data: [], failedChunks: 0 };

    const locations = [...this.CITIES, this.BLACK_MARKET].map(encodeURIComponent).join(',');
    const chunks = this.chunkArray(itemIds);
    const results = [];
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const cacheKey = `${this.currentServer}:${qualities.join(',')}:${chunk.join(',')}`;
      const cached = this.priceCache.get(cacheKey);
      const now = Date.now();

      if (!forceRefresh && cached && now - cached.timestamp < this.priceTTL) {
        results.push(...cached.data);
      } else {
        const url = `${this.getBaseUrl()}/api/v2/stats/prices/${chunk.map(encodeURIComponent).join(',')}.json` +
          `?locations=${locations}&qualities=${qualities.join(',')}`;
        const data = await this.fetchJson(url);
        if (data) {
          results.push(...data);
          this.priceCache.set(cacheKey, { timestamp: now, data });
        } else {
          failedChunks++;
        }
        if (i < chunks.length - 1) await this.sleep(this.THROTTLE_MS);
      }

      if (onProgress) onProgress(i + 1, chunks.length, Math.round(((i + 1) / chunks.length) * 100));
    }

    return { data: results, failedChunks };
  },

  historyKey(location, itemId, quality) {
    return `${this.currentServer}|${location}|${itemId}|${quality}`;
  },

  getCachedVolume(location, itemId, quality) {
    const c = this.historyCache.get(this.historyKey(location, itemId, quality));
    if (c && Date.now() - c.timestamp < this.historyTTL) return c.volume;
    return undefined;
  },

  /**
   * Average units sold per day over the last `days` days, per (location, item, quality).
   * @param {{location: string, itemId: string, quality: number}[]} requests
   * @returns {Promise<void>} results are stored in historyCache (read via getCachedVolume)
   */
  async fetchDailyVolumes(requests, days = 7, onProgress = null) {
    const pending = requests.filter(r => this.getCachedVolume(r.location, r.itemId, r.quality) === undefined);
    if (pending.length === 0) return;

    // Group by location, then chunk item IDs.
    const byLocation = new Map();
    for (const r of pending) {
      if (!byLocation.has(r.location)) byLocation.set(r.location, new Set());
      byLocation.get(r.location).add(r.itemId);
    }

    const jobs = [];
    for (const [location, ids] of byLocation) {
      for (const chunk of this.chunkArray([...ids])) jobs.push({ location, chunk });
    }

    const cutoff = Date.now() - days * 86400000;
    for (let j = 0; j < jobs.length; j++) {
      const { location, chunk } = jobs[j];
      const url = `${this.getBaseUrl()}/api/v2/stats/history/${chunk.map(encodeURIComponent).join(',')}.json` +
        `?locations=${encodeURIComponent(location)}&time-scale=24`;
      const data = await this.fetchJson(url);
      const now = Date.now();

      // Mark everything requested as 0 first, so items with no sales are cached too.
      if (data) {
        for (const id of chunk) {
          for (const q of [1, 2, 3, 4, 5]) {
            this.historyCache.set(this.historyKey(location, id, q), { timestamp: now, volume: 0 });
          }
        }
        for (const series of data) {
          const points = (series.data || []).filter(p => new Date(p.timestamp + 'Z').getTime() >= cutoff);
          const sold = points.reduce((s, p) => s + (p.item_count || 0), 0);
          this.historyCache.set(this.historyKey(series.location, series.item_id, series.quality), {
            timestamp: now,
            volume: Math.round((sold / days) * 10) / 10
          });
        }
      }

      if (onProgress) onProgress(j + 1, jobs.length);
      if (j < jobs.length - 1) await this.sleep(this.THROTTLE_MS);
    }
  }
};

if (typeof window !== 'undefined') window.AlbionAPI = AlbionAPI;
if (typeof module !== 'undefined') module.exports = AlbionAPI;
