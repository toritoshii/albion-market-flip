/**
 * Albion Market Flip - Application Logic (v2)
 *  - Prices for every city + Black Market are fetched once per scan; switching city,
 *    mode or Premium only recalculates.
 *  - Sales volume (history API) is loaded in the background for the best candidates.
 */

(function () {
  'use strict';

  const ROW_LIMIT = 300;          // rows rendered at once (DOM stays fast)
  const VOLUME_CANDIDATES = 200;  // top opportunities we fetch sales history for

  const state = {
    server: 'east',
    city: 'Lymhurst',
    mode: 'stationary',
    category: 'hot',
    hasPremium: true,
    isScanning: false,

    buyType: 'instant',
    sellType: 'order',
    avoidCaerleon: true,

    search: '',
    tier: 'all',
    enchant: 'all',
    maxBudget: 0,
    minProfit: 1000,
    maxAgeMinutes: 1440,
    minVolume: 0,
    maxSpread: 3,

    sortField: 'unitNetProfit',
    sortAsc: false,

    scannedCategory: null,
    index: null,
    opportunities: [],

    volumeRunning: false,
    volumeRerun: false,

    autoScan: false,
    autoScanMinutes: 10,
    autoScanTimer: null,
    seenAlerts: new Set(),

    modalItem: null,
    modalQty: 1
  };

  const itemMap = new Map();
  (window.ALBION_ITEMS || []).forEach(it => itemMap.set(it.id, it));

  const MODE_INFO = {
    stationary: {
      citiesLabel: '📍 Thành phố đang đứng:',
      note: ''
    },
    transport: {
      citiesLabel: '📍 Mua ở:',
      note: 'Tool tự chọn thành phố bán có lời nhất. Nhớ tính thời gian chạy đường và rủi ro bị gank khi đi qua vùng đỏ/đen. Brecilien nằm trong Mists, đi bằng portal.'
    },
    loot: {
      citiesLabel: '📍 Bạn đang ở:',
      note: ''
    },
    blackmarket: {
      citiesLabel: '📍 Mua ở:',
      note: 'Black Market nằm ở Caerleon và chỉ mua gear (vũ khí, giáp, túi, áo choàng). Bán cho Black Market = bán ngay, chỉ mất thuế, không mất setup fee. Mua ngay tại Caerleon thì không phải chở qua vùng đỏ.'
    }
  };

  const $ = id => document.getElementById(id);
  const dom = {
    premiumToggle: $('premium-toggle'),
    premiumCard: $('premium-card'),
    premiumStatusTitle: $('premium-status-title'),
    premiumStatusDesc: $('premium-status-desc'),
    serverSelect: $('server-select'),
    currentServerBadge: $('current-server-badge'),

    modeContainer: $('mode-container'),
    citiesContainer: $('cities-container'),
    citiesLabel: $('cities-label'),
    cityAllBtn: $('btn-city-all'),
    categoryPresets: $('category-presets'),
    catalogCount: $('catalog-count'),

    modeOptions: $('mode-options'),
    buyTypeSelect: $('buy-type-select'),
    sellTypeSelect: $('sell-type-select'),
    sellTypeGroup: $('sell-type-group'),
    avoidCaerleon: $('avoid-caerleon'),
    avoidCaerleonGroup: $('avoid-caerleon-group'),
    modeNote: $('mode-note'),

    searchInput: $('search-input'),
    tierSelect: $('tier-select'),
    enchantSelect: $('enchant-select'),
    budgetSelect: $('budget-select'),
    minProfitSelect: $('min-profit-select'),
    maxAgeSelect: $('max-age-select'),
    minVolumeSelect: $('min-volume-select'),
    spreadSelect: $('spread-select'),

    scanBtn: $('scan-btn'),
    refreshBtn: $('refresh-btn'),
    resetBtn: $('reset-btn'),
    scanStatusText: $('scan-status-text'),

    progressContainer: $('progress-container'),
    progressBar: $('progress-bar'),
    progressLabel: $('progress-label'),
    progressPercent: $('progress-percent'),

    marketTableBody: $('market-table-body'),
    thBuy: $('th-buy'),
    thSell: $('th-sell'),
    thCost: $('th-cost'),
    thProfit: $('th-profit'),
    autoScanToggle: $('auto-scan-toggle'),
    autoScanInterval: $('auto-scan-interval'),
    marketResultsTable: $('market-results-table'),
    filteredItemsCount: $('filtered-items-count'),

    statOpportunities: $('stat-opportunities'),
    statOpportunitiesSub: $('stat-opportunities-sub'),
    statMaxProfit: $('stat-max-profit'),
    statAvgRoi: $('stat-avg-roi'),
    statCurrentCity: $('stat-current-city'),
    statFreshness: $('stat-freshness'),

    calcModal: $('calc-modal'),
    modalCloseBtn: $('modal-close-btn'),
    modalImg: $('modal-img'),
    modalItemName: $('modal-item-name'),
    modalItemEn: $('modal-item-en'),
    calcQtyInput: $('calc-qty-input'),
    qtyMinus: $('qty-minus'),
    qtyPlus: $('qty-plus'),

    modalSummaryProfit: $('modal-summary-profit'),
    modalSummaryRoi: $('modal-summary-roi'),
    modalBuyTitle: $('modal-buy-title'),
    modalBuyPriceLabel: $('modal-buy-price-label'),
    modalBuyPrice: $('modal-buy-price'),
    modalBuySetup: $('modal-buy-setup'),
    modalTotalBuy: $('modal-total-buy'),
    modalSellTitle: $('modal-sell-title'),
    modalSellPriceLabel: $('modal-sell-price-label'),
    modalSellPrice: $('modal-sell-price'),
    modalSellSetup: $('modal-sell-setup'),
    modalTaxLabel: $('modal-tax-label'),
    modalSellTax: $('modal-sell-tax'),
    modalTotalRevenue: $('modal-total-revenue'),
    modalGuideSteps: $('modal-guide-steps'),
    btnCopyItemName: $('btn-copy-item-name'),

    openHandbookBtn: $('open-handbook-btn'),
    handbookModal: $('handbook-modal'),
    handbookCloseBtn: $('handbook-close-btn')
  };

  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getItemsForScan() {
    const all = window.ALBION_ITEMS || [];
    if (state.category === 'all') return all;
    if (state.category === 'hot') return all.filter(it => it.hot);
    return all.filter(it => it.category === state.category);
  }

  // ---------- Init & events ----------

  function init() {
    dom.catalogCount.textContent = (window.ALBION_ITEMS || []).length.toLocaleString('en-US');
    setupEventListeners();
    updatePremiumUI();
    updateModeUI();
    updateCityStat();
  }

  function setupEventListeners() {
    dom.premiumToggle.addEventListener('change', e => {
      state.hasPremium = e.target.checked;
      updatePremiumUI();
      recalculateAll();
    });

    dom.serverSelect.addEventListener('change', e => {
      state.server = e.target.value;
      AlbionAPI.setServer(state.server);
      dom.currentServerBadge.textContent = state.server.toUpperCase();
      state.index = null;
      state.scannedCategory = null;
      state.opportunities = [];
      clearTable();
      updateStats([]);
    });

    dom.modeContainer.addEventListener('click', e => {
      const btn = e.target.closest('[data-mode]');
      if (!btn) return;
      state.mode = btn.dataset.mode;
      if (state.mode === 'stationary' && state.city === 'ALL') setActiveCity('Lymhurst');
      updateModeUI();
      recalcOrScan();
    });

    dom.citiesContainer.addEventListener('click', e => {
      const btn = e.target.closest('.city-btn');
      if (!btn) return;
      setActiveCity(btn.dataset.city);
      recalcOrScan();
    });

    dom.categoryPresets.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      document.querySelectorAll('#category-presets .cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.cat;
      startScan(false);
    });

    dom.buyTypeSelect.addEventListener('change', e => { state.buyType = e.target.value; recalculateAll(); });
    dom.sellTypeSelect.addEventListener('change', e => { state.sellType = e.target.value; recalculateAll(); });
    dom.avoidCaerleon.addEventListener('change', e => { state.avoidCaerleon = e.target.checked; recalculateAll(); });

    dom.searchInput.addEventListener('input', e => {
      state.search = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
    const bindSelect = (el, key, parse = v => parseInt(v, 10)) =>
      el.addEventListener('change', e => { state[key] = parse(e.target.value); applyFiltersAndRender(); });
    bindSelect(dom.tierSelect, 'tier', v => v);
    bindSelect(dom.enchantSelect, 'enchant', v => v);
    bindSelect(dom.budgetSelect, 'maxBudget');
    bindSelect(dom.minProfitSelect, 'minProfit');
    bindSelect(dom.maxAgeSelect, 'maxAgeMinutes');
    bindSelect(dom.minVolumeSelect, 'minVolume');
    dom.spreadSelect.addEventListener('change', e => { state.maxSpread = parseFloat(e.target.value); recalculateAll(); });

    dom.autoScanToggle.addEventListener('change', e => setAutoScan(e.target.checked));
    dom.autoScanInterval.addEventListener('change', e => {
      state.autoScanMinutes = parseInt(e.target.value, 10);
      if (state.autoScan) setAutoScan(true);
    });

    dom.scanBtn.addEventListener('click', () => startScan(false));
    dom.refreshBtn.addEventListener('click', () => startScan(true));
    dom.resetBtn.addEventListener('click', resetFilters);

    dom.marketResultsTable.querySelector('thead').addEventListener('click', e => {
      const th = e.target.closest('th');
      if (!th || !th.dataset.sort) return;
      const field = th.dataset.sort;
      if (state.sortField === field) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortField = field;
        state.sortAsc = (field === 'name' || field === 'unitCost' || field === 'minutes');
      }
      updateSortHeaderUI();
      applyFiltersAndRender();
    });

    dom.marketTableBody.addEventListener('click', e => {
      const row = e.target.closest('tr[data-key]');
      if (!row) return;
      const found = state.opportunities.find(it => it.key === row.dataset.key);
      if (found) openModal(found);
    });

    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.calcModal.addEventListener('click', e => { if (e.target === dom.calcModal) closeModal(); });

    dom.calcQtyInput.addEventListener('input', e => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      state.modalQty = val;
      updateModalCalculations();
    });
    dom.qtyMinus.addEventListener('click', () => {
      if (state.modalQty > 1) {
        state.modalQty--;
        dom.calcQtyInput.value = state.modalQty;
        updateModalCalculations();
      }
    });
    dom.qtyPlus.addEventListener('click', () => {
      state.modalQty++;
      dom.calcQtyInput.value = state.modalQty;
      updateModalCalculations();
    });

    dom.btnCopyItemName.addEventListener('click', () => {
      if (!state.modalItem) return;
      navigator.clipboard.writeText(state.modalItem.enName || state.modalItem.name).then(() => {
        const original = dom.btnCopyItemName.innerHTML;
        dom.btnCopyItemName.innerHTML = '✅ Đã Copy!';
        setTimeout(() => { dom.btnCopyItemName.innerHTML = original; }, 1500);
      });
    });

    if (dom.openHandbookBtn && dom.handbookModal) {
      dom.openHandbookBtn.addEventListener('click', () => dom.handbookModal.classList.add('is-active'));
      dom.handbookCloseBtn.addEventListener('click', () => dom.handbookModal.classList.remove('is-active'));
      dom.handbookModal.addEventListener('click', e => {
        if (e.target === dom.handbookModal) dom.handbookModal.classList.remove('is-active');
      });
      const tabBtns = dom.handbookModal.querySelectorAll('.handbook-tab-btn');
      const tabContents = dom.handbookModal.querySelectorAll('.handbook-content');
      tabBtns.forEach(btn => btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`content-${btn.dataset.tab}`);
        if (target) target.classList.add('active');
      }));
    }

    const originalTitle = document.title;
    window.addEventListener('focus', () => { document.title = originalTitle; });

    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (dom.calcModal.classList.contains('is-active')) closeModal();
      if (dom.handbookModal) dom.handbookModal.classList.remove('is-active');
    });
  }

  function setActiveCity(city) {
    state.city = city;
    document.querySelectorAll('.city-btn').forEach(b => b.classList.toggle('active', b.dataset.city === city));
    updateCityStat();
  }

  function recalcOrScan() {
    if (state.index && state.scannedCategory === state.category) recalculateAll();
    else startScan(false);
  }

  // ---------- UI state ----------

  function updatePremiumUI() {
    dom.premiumCard.classList.toggle('is-active', state.hasPremium);
    dom.premiumCard.classList.toggle('is-inactive', !state.hasPremium);
    if (state.hasPremium) {
      dom.premiumStatusTitle.innerHTML = '🌟 PREMIUM ACTIVE';
      dom.premiumStatusDesc.innerHTML = 'Thuế bán: <strong class="premium-badge-tax">4.0%</strong> | Setup lệnh: <strong>2.5%</strong>';
    } else {
      dom.premiumStatusTitle.innerHTML = '❌ KHÔNG PREMIUM';
      dom.premiumStatusDesc.innerHTML = 'Thuế bán: <strong style="color: var(--ruby-light)">8.0%</strong> | Setup lệnh: <strong>2.5%</strong>';
    }
  }

  function updateModeUI() {
    document.querySelectorAll('#mode-container [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
    const info = MODE_INFO[state.mode];
    dom.citiesLabel.textContent = info.citiesLabel;
    dom.cityAllBtn.classList.toggle('is-hidden', state.mode === 'stationary');
    dom.modeOptions.classList.toggle('is-hidden', state.mode === 'stationary' || state.mode === 'loot');
    const loot = state.mode === 'loot';
    dom.thBuy.textContent = loot ? 'Đồ Của Bạn' : 'Giá Mua';
    dom.thSell.textContent = loot ? 'Bán Ở Đâu / Giá' : 'Giá Bán';
    dom.thCost.textContent = loot ? 'Phí + Thuế' : 'Vốn Đầu Tư';
    dom.thProfit.textContent = loot ? 'Thực Nhận / Cái' : 'Lợi Nhuận Ròng';
    dom.sellTypeGroup.classList.toggle('is-hidden', state.mode !== 'transport');
    dom.avoidCaerleonGroup.classList.toggle('is-hidden', state.mode !== 'transport');
    dom.modeNote.textContent = info.note;
    updateCityStat();
  }

  function updateCityStat() {
    const city = state.city === 'ALL' ? 'Mọi thành phố' : state.city;
    dom.statCurrentCity.textContent = city;
    dom.statFreshness.textContent = {
      stationary: 'Flip tại chỗ',
      transport: 'Chạy hàng giữa thành phố',
      blackmarket: 'Bán cho Black Market',
      loot: 'Bán loot farm được'
    }[state.mode];
  }

  function updateSortHeaderUI() {
    dom.marketResultsTable.querySelectorAll('th').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === state.sortField) th.classList.add(state.sortAsc ? 'sorted-asc' : 'sorted-desc');
    });
  }

  function resetFilters() {
    const defaults = { search: '', tier: 'all', enchant: 'all', maxBudget: 0, minProfit: 1000, maxAgeMinutes: 1440, minVolume: 0 };
    Object.assign(state, defaults);
    dom.searchInput.value = '';
    dom.tierSelect.value = 'all';
    dom.enchantSelect.value = 'all';
    dom.budgetSelect.value = '0';
    dom.minProfitSelect.value = '1000';
    dom.maxAgeSelect.value = '1440';
    dom.minVolumeSelect.value = '0';
    applyFiltersAndRender();
  }

  function clearTable() {
    dom.marketTableBody.innerHTML = emptyRow('⚖️', 'Sẵn Sàng Quét Thị Trường',
      'Chọn chiến thuật, thành phố, nhóm hàng rồi nhấn <strong>Bắt Đầu Quét</strong>.');
    dom.filteredItemsCount.textContent = '0';
  }

  function emptyRow(icon, title, text) {
    return `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">${icon}</div><h3>${title}</h3><p>${text}</p></div></td></tr>`;
  }

  function setProgress(visible, percent = 0, label = '') {
    dom.progressContainer.classList.toggle('is-active', visible);
    dom.progressBar.style.width = `${percent}%`;
    dom.progressPercent.textContent = `${percent}%`;
    if (label) dom.progressLabel.innerHTML = label;
  }

  // ---------- Scan ----------

  async function startScan(forceRefresh = false) {
    if (state.isScanning) return;
    state.isScanning = true;

    const itemIds = getItemsForScan().map(it => it.id);
    setProgress(true, 0, `<span>⚡</span> Đang quét <strong>${itemIds.length}</strong> vật phẩm ở 7 thành phố + Black Market...`);
    dom.scanStatusText.textContent = `Đang kết nối API AODP (${state.server.toUpperCase()})...`;
    dom.scanBtn.disabled = true;
    dom.scanBtn.style.opacity = '0.7';

    try {
      const { data, failedChunks } = await AlbionAPI.fetchPrices(itemIds, [1, 2, 3], (loaded, total, percent) => {
        setProgress(true, percent, `<span>⚡</span> Đang tải giá: lô ${loaded}/${total} (${percent}%)`);
      }, forceRefresh);

      state.index = Strategies.buildIndex(data);
      state.scannedCategory = state.category;
      dom.scanStatusText.textContent = failedChunks
        ? `Quét xong nhưng ${failedChunks} lô bị lỗi (API quá tải?). Bấm Quét Lại sau ít phút.`
        : `Quét xong ${itemIds.length} vật phẩm. Đổi thành phố / chiến thuật không cần quét lại.`;
      recalculateAll();
    } catch (err) {
      console.error('Scan error:', err);
      dom.scanStatusText.textContent = 'Lỗi khi quét dữ liệu từ máy chủ. Vui lòng thử lại!';
    } finally {
      state.isScanning = false;
      dom.scanBtn.disabled = false;
      dom.scanBtn.style.opacity = '1';
      setTimeout(() => setProgress(false), 600);
    }
  }

  function recalculateAll() {
    if (!state.index) return;

    const raw = Strategies.findOpportunities(state.index, {
      mode: state.mode,
      city: state.city,
      hasPremium: state.hasPremium,
      buyType: state.buyType,
      sellType: state.sellType,
      avoidCaerleon: state.avoidCaerleon,
      maxSpreadRatio: state.maxSpread,
      isBmItem: id => (itemMap.get(id) || {}).bm
    });

    state.opportunities = raw.map(opp => {
      const meta = itemMap.get(opp.id) || { name: opp.id, enName: opp.id, tier: 0, enchant: 0, category: 'other' };
      const o = {
        ...opp,
        key: `${opp.id}|${opp.quality}`,
        name: meta.name,
        enName: meta.enName,
        tier: meta.tier,
        enchant: meta.enchant,
        category: meta.category
      };
      attachVolume(o);
      return o;
    });

    applyFiltersAndRender();
    loadVolumes();
  }

  function attachVolume(o) {
    const v = AlbionAPI.getCachedVolume(o.sellCity, o.id, o.quality);
    o.volume = v === undefined ? null : v;
    const est = Calculator.estimateDaily(o.unitNetProfit, o.volume);
    o.qtyPerDay = est.qtyPerDay;
    o.profitPerDay = est.profitPerDay;
  }

  // Background load of sales history for the best candidates under current filters.
  async function loadVolumes() {
    if (state.volumeRunning) { state.volumeRerun = true; return; }
    state.volumeRunning = true;
    try {
      do {
        state.volumeRerun = false;
        const candidates = filterList(state.opportunities, { ignoreVolume: true })
          .filter(o => o.unitNetProfit > 0 && o.volume === null)
          .sort((a, b) => b.unitNetProfit - a.unitNetProfit)
          .slice(0, VOLUME_CANDIDATES);
        if (candidates.length === 0) break;

        dom.scanStatusText.textContent = `Đang tải lượng bán/ngày cho ${candidates.length} món tốt nhất...`;
        await AlbionAPI.fetchDailyVolumes(
          candidates.map(o => ({ location: o.sellCity, itemId: o.id, quality: o.quality })),
          7,
          (done, total) => { dom.scanStatusText.textContent = `Đang tải lượng bán/ngày: ${done}/${total} lô...`; }
        );
        state.opportunities.forEach(attachVolume);
        applyFiltersAndRender();
        dom.scanStatusText.textContent = 'Đã có lượng bán/ngày (trung bình 7 ngày) cho các món đứng đầu.';
      } while (state.volumeRerun);
    } catch (err) {
      console.error('Volume load error:', err);
    } finally {
      state.volumeRunning = false;
    }
  }

  // ---------- Filter / sort / render ----------

  function filterList(list, { ignoreVolume = false } = {}) {
    const q = state.search;
    const tier = state.tier === 'all' ? null : parseInt(state.tier, 10);
    const enc = state.enchant === 'all' ? null : parseInt(state.enchant, 10);
    return list.filter(it => {
      if (q && !(it.name.toLowerCase().includes(q) || it.enName.toLowerCase().includes(q) || it.id.toLowerCase().includes(q))) return false;
      if (tier !== null && it.tier !== tier) return false;
      if (enc !== null && it.enchant !== enc) return false;
      if (state.maxBudget > 0 && it.unitCost > state.maxBudget) return false;
      if (it.unitNetProfit < state.minProfit) return false;
      if (state.maxAgeMinutes > 0 && it.minutes > state.maxAgeMinutes) return false;
      if (!ignoreVolume && state.minVolume > 0 && (it.volume === null || it.volume < state.minVolume)) return false;
      return true;
    });
  }

  function applyFiltersAndRender() {
    const list = filterList(state.opportunities);
    const f = state.sortField;
    const dir = state.sortAsc ? 1 : -1;
    list.sort((a, b) => {
      const va = a[f], vb = b[f];
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      const na = va === null || va === undefined ? -Infinity : va;
      const nb = vb === null || vb === undefined ? -Infinity : vb;
      return dir * (na - nb);
    });
    renderTable(list);
    updateStats(list);
  }

  function getQualityLabel(q) {
    return ({ 1: 'Normal', 2: 'Good', 3: 'Outstanding', 4: 'Excellent', 5: 'Masterpiece' })[q] || 'Normal';
  }

  function sideTag(city, type, side) {
    const verb = side === 'buy'
      ? (type === 'order' ? 'Buy Order' : 'Mua ngay')
      : (city === Strategies.BLACK_MARKET ? 'Bán BM' : (type === 'order' ? 'Sell Order' : 'Bán ngay'));
    const danger = city === 'Caerleon' || city === Strategies.BLACK_MARKET;
    const place = state.mode === 'stationary' ? '' : `${city} · `;
    return `<span class="route-tag${danger ? ' danger' : ''}">${esc(place + verb)}</span>`;
  }

  function renderTable(items) {
    dom.filteredItemsCount.textContent = items.length;
    if (!state.index) { clearTable(); return; }

    if (items.length === 0) {
      dom.marketTableBody.innerHTML = emptyRow('🔍', 'Không Tìm Thấy Món Đồ Nào Thỏa Mãn Bộ Lọc',
        'Thử giảm "Lợi Nhuận Tối Thiểu", tăng "Độ Cũ Dữ Liệu", đổi chiến thuật hoặc nhấn "🧹 Đặt Lại Bộ Lọc".');
      return;
    }

    const shown = items.slice(0, ROW_LIMIT);
    const rows = shown.map(item => {
      const roiClass = item.roi >= 30 ? 'roi-epic' : (item.roi >= 15 ? 'roi-good' : (item.roi >= 5 ? 'roi-normal' : 'roi-low'));
      const freshness = Calculator.freshnessOf(item.minutes);
      const volumeCell = item.volume === null
        ? '<span class="volume-pending">…</span>'
        : `<span class="volume-val${item.volume < 5 ? ' low' : ''}">${item.volume}</span>`;
      const perDayCell = item.profitPerDay === null
        ? '<span class="volume-pending">…</span>'
        : `<div class="profit-val">+${Calculator.formatSilver(item.profitPerDay, true)}</div><div class="price-hint">~${item.qtyPerDay} món/ngày</div>`;
      const feeHint = item.buySetupFee ? `Setup: ${Calculator.formatSilver(item.buySetupFee)}` : 'Không phí';
      const isLoot = item.buyType === 'owned';
      const buyCell = isLoot
        ? `<div class="loot-owned">🎒 Có sẵn</div>${item.instantAlt
            ? `<div class="price-hint">Bán ngay tốt nhất: ${Calculator.formatSilver(item.instantAlt.net)} (${esc(item.instantAlt.city)})</div>`
            : '<div class="price-hint">Bán ngay là tốt nhất</div>'}`
        : `<div class="price-val" style="color: var(--text-gold);">${Calculator.formatSilver(item.buyPrice)}</div>
            ${sideTag(item.buyCity, item.buyType, 'buy')}
            <div class="price-hint">${feeHint}</div>`;
      const costCell = isLoot
        ? `<div class="price-val">${Calculator.formatSilver(item.totalFees)}</div><div class="price-hint">Setup ${Calculator.formatSilver(item.sellSetupFee)} + thuế</div>`
        : `<div class="price-val">${Calculator.formatSilver(item.unitCost)}</div><div class="price-hint">Vốn / cái</div>`;
      const roiCell = isLoot ? '<span class="price-hint">—</span>' : `<span class="roi-badge ${roiClass}">+${item.roi}%</span>`;

      return `
        <tr data-key="${esc(item.key)}">
          <td>
            <div class="item-cell">
              <div class="item-icon-box">
                <img src="${AlbionAPI.getItemImageUrl(item.id, item.quality)}" alt="${esc(item.name)}" loading="lazy" onerror="this.style.visibility='hidden'">
              </div>
              <div class="item-info">
                <div class="item-name">${esc(item.name)}</div>
                <div class="item-en-name">${esc(item.enName)}</div>
                <div class="item-badges">
                  <span class="badge-tier">T${item.tier}</span>
                  ${item.enchant > 0 ? `<span class="badge-enchant">.${item.enchant}</span>` : ''}
                  <span class="badge-quality">${getQualityLabel(item.quality)}</span>
                </div>
              </div>
            </div>
          </td>
          <td>${buyCell}</td>
          <td>
            <div class="price-val" style="color: var(--text-primary);">${Calculator.formatSilver(item.sellPrice)}</div>
            ${sideTag(item.sellCity, item.sellType, 'sell')}
            <div class="price-hint">Thuế: ${Calculator.formatSilver(item.salesTax)}</div>
          </td>
          <td>${costCell}</td>
          <td>
            <div class="profit-val">+${Calculator.formatSilver(item.unitNetProfit)}</div>
            <div class="price-hint">Đã trừ toàn bộ phí</div>
          </td>
          <td>${roiCell}</td>
          <td>${volumeCell}</td>
          <td>${perDayCell}</td>
          <td>
            <span class="freshness-badge freshness-${freshness}">
              <span class="freshness-dot"></span>
              ${Calculator.ageText(item.minutes)}
            </span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="action-calc-btn" title="Tính số lượng & xem kế hoạch">🧮 Tính Vốn</button>
          </td>
        </tr>`;
    }).join('');

    const more = items.length > ROW_LIMIT
      ? `<tr><td colspan="10" class="results-note">Đang hiện ${ROW_LIMIT}/${items.length} món đầu. Lọc hoặc sắp xếp để xem phần còn lại.</td></tr>`
      : '';
    dom.marketTableBody.innerHTML = rows + more;
  }

  function updateStats(items) {
    dom.statOpportunities.textContent = items.length;
    dom.statOpportunitiesSub.textContent = state.city === 'ALL' ? 'Mọi thành phố' : `Tại ${state.city}`;
    if (items.length > 0) {
      let maxProfit = 0, sumRoi = 0;
      for (const it of items) {
        if (it.unitNetProfit > maxProfit) maxProfit = it.unitNetProfit;
        sumRoi += it.roi;
      }
      dom.statMaxProfit.textContent = `+${Calculator.formatSilver(maxProfit)} Silver`;
      dom.statAvgRoi.textContent = `+${(sumRoi / items.length).toFixed(1)}%`;
    } else {
      dom.statMaxProfit.textContent = '0 Silver';
      dom.statAvgRoi.textContent = '0%';
    }
  }

  // ---------- Modal ----------

  function openModal(item) {
    state.modalItem = item;
    state.modalQty = item.volume ? Math.max(1, Math.floor(item.volume * Calculator.MARKET_SHARE)) : 1;
    dom.calcQtyInput.value = state.modalQty;

    dom.modalImg.src = AlbionAPI.getItemImageUrl(item.id, item.quality);
    dom.modalItemName.textContent = item.name;
    dom.modalItemEn.textContent = `${item.enName} (T${item.tier}${item.enchant > 0 ? '.' + item.enchant : ''} - ${getQualityLabel(item.quality)})`;

    const isBM = item.sellCity === Strategies.BLACK_MARKET;
    const isLoot = item.buyType === 'owned';
    dom.modalBuyTitle.textContent = isLoot ? 'ĐỒ CÓ SẴN (LOOT)' : (item.buyType === 'order' ? `ĐẶT BUY ORDER – ${item.buyCity}` : `MUA NGAY – ${item.buyCity}`);
    dom.modalBuyPriceLabel.textContent = isLoot ? 'Giá vốn:' : (item.buyType === 'order' ? 'Giá Buy Order đề xuất:' : 'Giá mua ngay (Sell Order rẻ nhất):');
    dom.modalSellTitle.textContent = isBM ? 'BÁN CHO BLACK MARKET – Caerleon'
      : (item.sellType === 'order' ? `ĐẶT SELL ORDER – ${item.sellCity}` : `BÁN NGAY – ${item.sellCity}`);
    dom.modalSellPriceLabel.textContent = isBM ? 'Giá Black Market đang mua:'
      : (item.sellType === 'order' ? 'Giá Sell Order đề xuất:' : 'Giá Buy Order cao nhất:');

    dom.modalGuideSteps.innerHTML = buildGuide(item);
    updateModalCalculations();
    dom.calcModal.classList.add('is-active');
  }

  function buildGuide(item) {
    const name = `<strong>${esc(item.enName)}</strong> (${getQualityLabel(item.quality)})`;
    const buy = Calculator.formatSilver(item.buyPrice);
    const sell = Calculator.formatSilver(item.sellPrice);
    const steps = [];
    if (item.buyType === 'owned') {
      if (item.sellCity === Strategies.BLACK_MARKET) {
        steps.push(`Mang ${name} tới <strong>Black Market</strong> ở Caerleon, bán ngay với giá <strong>${sell}</strong>.`);
      } else if (item.sellType === 'order') {
        steps.push(`Ở Market <strong>${esc(item.sellCity)}</strong>, đặt <strong>Sell Order</strong> ${name} giá <strong>${sell}</strong>, rồi chờ khớp.`);
      } else {
        steps.push(`Ở Market <strong>${esc(item.sellCity)}</strong>, <strong>bán ngay</strong> ${name} vào Buy Order giá <strong>${sell}</strong>.`);
      }
      if (item.instantAlt) {
        steps.push(`Không muốn chờ? Bán ngay ở <strong>${esc(item.instantAlt.city)}</strong> giá ${Calculator.formatSilver(item.instantAlt.price)} (thực nhận ${Calculator.formatSilver(item.instantAlt.net)}/cái).`);
      }
      steps.push('Nhận bạc về hòm thư.');
      return steps.map(s => `<li>${s}</li>`).join('');
    }
    if (item.buyType === 'order') {
      steps.push(`Đến Market <strong>${esc(item.buyCity)}</strong>, tìm ${name}, đặt <strong>Buy Order</strong> giá <strong>${buy}</strong>. Chờ có người bán vào lệnh.`);
    } else {
      steps.push(`Đến Market <strong>${esc(item.buyCity)}</strong>, tìm ${name}, <strong>mua ngay</strong> ở giá <strong>${buy}</strong> (kiểm tra lại giá trước khi mua).`);
    }
    if (item.sellCity === Strategies.BLACK_MARKET) {
      if (item.buyCity !== 'Caerleon') steps.push('Chở hàng về <strong>Caerleon</strong> — đường đi qua vùng đỏ, nên đi mount nhanh, tránh giờ đông.');
      steps.push(`Vào <strong>Black Market</strong> ở Caerleon, bán ngay với giá <strong>${sell}</strong> (giá BM đổi liên tục, xem lại trước khi bán).`);
    } else if (item.sellCity !== item.buyCity) {
      steps.push(`Chở hàng sang <strong>${esc(item.sellCity)}</strong>${item.sellCity === 'Caerleon' || item.buyCity === 'Caerleon' ? ' (qua vùng đỏ, cẩn thận bị gank)' : ''}.`);
      steps.push(item.sellType === 'order'
        ? `Đặt <strong>Sell Order</strong> giá <strong>${sell}</strong>.`
        : `<strong>Bán ngay</strong> vào Buy Order giá <strong>${sell}</strong>.`);
    } else {
      steps.push(`Nhận đồ, đặt <strong>Sell Order</strong> giá <strong>${sell}</strong>. Nếu có người hạ giá thấp hơn thì cân nhắc chỉnh lệnh.`);
    }
    steps.push('Nhận bạc về hòm thư.');
    return steps.map(s => `<li>${s}</li>`).join('');
  }

  function updateModalCalculations() {
    const it = state.modalItem;
    if (!it) return;
    const qty = state.modalQty;
    const calc = it.buyType === 'owned' ? lootCalc(it, qty) : Calculator.computeTrade({
      buyPrice: it.buyPrice, buyType: it.buyType,
      sellPrice: it.sellPrice, sellType: it.sellType,
      hasPremium: state.hasPremium, quantity: qty
    });
    if (!calc) return;

    const s = v => `${Calculator.formatSilver(v)} Silver`;
    dom.modalSummaryProfit.textContent = `+${s(calc.totalProfit)}`;
    const volNote = it.volume !== null && it.volume !== undefined ? ` · thị trường bán ~${it.volume} món/ngày` : '';
    dom.modalSummaryRoi.textContent = `Tỷ Suất Lợi Nhuận: +${calc.roi}% ROI (${qty} món)${volNote}`;

    dom.modalBuyPrice.textContent = s(calc.buyPrice * qty);
    dom.modalBuySetup.textContent = s(calc.buySetupFee * qty);
    dom.modalTotalBuy.textContent = s(calc.totalInvestment);

    dom.modalSellPrice.textContent = s(calc.sellPrice * qty);
    dom.modalSellSetup.textContent = s(calc.sellSetupFee * qty);
    dom.modalTaxLabel.textContent = `Thuế Market (${(calc.taxRate * 100).toFixed(1)}%):`;
    dom.modalSellTax.textContent = s(calc.salesTax * qty);
    dom.modalTotalRevenue.textContent = s(calc.totalRevenue);
  }

  function lootCalc(it, qty) {
    const s = Strategies.netSale(it.sellPrice, it.sellType, state.hasPremium);
    return {
      buyPrice: 0, buySetupFee: 0, totalInvestment: 0,
      sellPrice: it.sellPrice, sellSetupFee: s.setup, salesTax: s.tax, taxRate: s.taxRate,
      totalRevenue: s.net * qty, totalProfit: s.net * qty, roi: 0
    };
  }

  // ---------- Auto scan + browser notifications ----------

  function alertKey(o) {
    return `${o.key}|${o.buyCity}|${o.sellCity}|${o.buyType}|${o.sellType}`;
  }

  async function setAutoScan(on) {
    clearInterval(state.autoScanTimer);
    state.autoScanTimer = null;
    state.autoScan = on;
    dom.autoScanToggle.checked = on;
    if (!on) return;

    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* ignore */ }
    }
    // Opportunities already on screen don't trigger alerts.
    filterList(state.opportunities).forEach(o => state.seenAlerts.add(alertKey(o)));
    state.autoScanTimer = setInterval(autoScanTick, state.autoScanMinutes * 60000);
    dom.scanStatusText.textContent = `🔔 Đang bật tự quét mỗi ${state.autoScanMinutes} phút. Để tab này mở.`;
  }

  async function autoScanTick() {
    if (state.isScanning) return;
    await startScan(true);
    notifyNew();
  }

  function notifyNew() {
    const fresh = filterList(state.opportunities)
      .filter(o => !state.seenAlerts.has(alertKey(o)))
      .sort((a, b) => b.unitNetProfit - a.unitNetProfit);
    fresh.forEach(o => state.seenAlerts.add(alertKey(o)));
    if (fresh.length === 0) return;

    const top = fresh.slice(0, 3).map(o => {
      const route = o.buyType === 'owned' ? o.sellCity : (o.buyCity === o.sellCity ? o.buyCity : `${o.buyCity} → ${o.sellCity}`);
      return `${o.enName}: +${Calculator.formatSilver(o.unitNetProfit, true)} (${route})`;
    }).join('\n');
    const title = `Albion: ${fresh.length} cơ hội mới`;
    document.title = `(${fresh.length}) Albion Market Flip`;
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body: top, tag: 'albion-flip' }); } catch (e) { /* ignore */ }
    }
    dom.scanStatusText.textContent = `🔔 ${title}. ${top.split('\n')[0]}`;
  }

  function closeModal() {
    dom.calcModal.classList.remove('is-active');
    state.modalItem = null;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
