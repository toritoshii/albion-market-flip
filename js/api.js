/**
 * Albion Online Data Project (AODP) API Client
 * Supports Asia (East), Americas (West), Europe servers
 */

const AlbionAPI = {
  SERVERS: {
    east: { name: 'Asia (Singapore)', url: 'https://east.albion-online-data.com' },
    west: { name: 'Americas (Washington)', url: 'https://west.albion-online-data.com' },
    europe: { name: 'Europe (Amsterdam)', url: 'https://europe.albion-online-data.com' }
  },

  currentServer: 'east',
  cache: new Map(),
  cacheTTL: 2 * 60 * 1000, // 2 minutes cache

  setServer(serverKey) {
    if (this.SERVERS[serverKey]) {
      this.currentServer = serverKey;
      this.cache.clear();
    }
  },

  getBaseUrl() {
    return this.SERVERS[this.currentServer].url;
  },

  getItemImageUrl(itemId, quality = 1) {
    if (!itemId) return '';
    return `https://render.albiononline.com/v1/item/${itemId}.png?quality=${quality}`;
  },

  /**
   * Split an array into chunks
   */
  chunkArray(array, size = 60) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Fetch market prices for a list of item IDs
   * @param {string[]} itemIds
   * @param {string} location - City name (e.g., "Lymhurst")
   * @param {number[]} qualities - Array of qualities (1 to 5)
   * @param {function} onProgress - Progress callback (loaded, total, percent)
   * @param {boolean} forceRefresh - Bypass cache if true
   */
  async fetchPrices(itemIds, location = 'Lymhurst', qualities = [1, 2, 3], onProgress = null, forceRefresh = false) {
    if (!itemIds || itemIds.length === 0) return [];

    const chunks = this.chunkArray(itemIds, 60);
    const results = [];
    const now = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const cacheKey = `${this.currentServer}:${location}:${chunk.join(',')}`;

      if (!forceRefresh && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (now - cached.timestamp < this.cacheTTL) {
          results.push(...cached.data);
          if (onProgress) {
            onProgress(i + 1, chunks.length, Math.round(((i + 1) / chunks.length) * 100));
          }
          continue;
        }
      }

      const qualityParam = qualities.length ? qualities.join(',') : '1,2,3';
      const encodedCity = encodeURIComponent(location);
      const url = `${this.getBaseUrl()}/api/v2/stats/prices/${chunk.join(',')}.json?locations=${encodedCity}&qualities=${qualityParam}`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`AODP API error ${resp.status} on chunk ${i + 1}`);
        } else {
          const data = await resp.json();
          results.push(...data);
          this.cache.set(cacheKey, { timestamp: now, data });
        }
      } catch (err) {
        console.error(`Failed to fetch chunk ${i + 1}:`, err);
      }

      if (onProgress) {
        onProgress(i + 1, chunks.length, Math.round(((i + 1) / chunks.length) * 100));
      }

      // Small throttle to be courteous to public API
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 60));
      }
    }

    return results;
  },

  /**
   * Fetch item sales volume history for a specific item
   */
  async fetchItemHistory(itemId, location = 'Lymhurst') {
    const encodedCity = encodeURIComponent(location);
    const url = `${this.getBaseUrl()}/api/v2/stats/history/${itemId}.json?locations=${encodedCity}&time-scale=24`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return [];
      return await resp.json();
    } catch (err) {
      console.error(`Error fetching history for ${itemId}:`, err);
      return [];
    }
  }
};

window.AlbionAPI = AlbionAPI;
