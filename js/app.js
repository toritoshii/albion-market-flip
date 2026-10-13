/**
 * Albion Market Flip - Application Logic
 */

(function () {
  'use strict';

  // App State
  const state = {
    server: 'east',
    city: 'Lymhurst',
    category: 'hot',
    hasPremium: true,
    isScanning: false,
    
    // Filters
    search: '',
    tier: 'all',
    enchant: 'all',
    maxBudget: 0,
    minProfit: 1000,
    maxAgeMinutes: 1440, // 24 hours

    // Sorting
    sortField: 'unitNetProfit',
    sortAsc: false,

    // Raw Data & Processed Data
    allScannedData: [],
    processedItems: [],

    // Modal Item
    modalItem: null,
    modalQty: 1
  };

  function getItemsForScan() {
    const all = window.ALBION_ITEMS || [];
    if (state.category === 'all') {
      return all;
    }
    if (state.category === 'hot') {
      // Pick high liquidity items
      return all.filter(it => {
        if (it.category === 'accessories') return true;
        if (it.category === 'mounts') return true;
        if (it.category === 'consumables') return true;
        if (it.category === 'weapons' && it.tier <= 6) return true;
        if (it.category === 'armor' && it.tier <= 6) return true;
        return false;
      });
    }
    return all.filter(it => it.category === state.category);
  }

  // DOM Elements
  const dom = {
    premiumToggle: document.getElementById('premium-toggle'),
    premiumCard: document.getElementById('premium-card'),
    premiumStatusTitle: document.getElementById('premium-status-title'),
    premiumStatusDesc: document.getElementById('premium-status-desc'),
    serverSelect: document.getElementById('server-select'),
    currentServerBadge: document.getElementById('current-server-badge'),

    citiesContainer: document.getElementById('cities-container'),
    categoryPresets: document.getElementById('category-presets'),
    
    searchInput: document.getElementById('search-input'),
    tierSelect: document.getElementById('tier-select'),
    enchantSelect: document.getElementById('enchant-select'),
    budgetSelect: document.getElementById('budget-select'),
    minProfitSelect: document.getElementById('min-profit-select'),
    maxAgeSelect: document.getElementById('max-age-select'),

    scanBtn: document.getElementById('scan-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    resetBtn: document.getElementById('reset-btn'),
    scanStatusText: document.getElementById('scan-status-text'),

    progressContainer: document.getElementById('progress-container'),
    progressBar: document.getElementById('progress-bar'),
    progressLabel: document.getElementById('progress-label'),
    progressPercent: document.getElementById('progress-percent'),

    marketTableBody: document.getElementById('market-table-body'),
    marketResultsTable: document.getElementById('market-results-table'),
    filteredItemsCount: document.getElementById('filtered-items-count'),

    statOpportunities: document.getElementById('stat-opportunities'),
    statOpportunitiesSub: document.getElementById('stat-opportunities-sub'),
    statMaxProfit: document.getElementById('stat-max-profit'),
    statAvgRoi: document.getElementById('stat-avg-roi'),
    statCurrentCity: document.getElementById('stat-current-city'),

    // Modal Elements
    calcModal: document.getElementById('calc-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalImg: document.getElementById('modal-img'),
    modalItemName: document.getElementById('modal-item-name'),
    modalItemEn: document.getElementById('modal-item-en'),
    calcQtyInput: document.getElementById('calc-qty-input'),
    qtyMinus: document.getElementById('qty-minus'),
    qtyPlus: document.getElementById('qty-plus'),

    modalSummaryProfit: document.getElementById('modal-summary-profit'),
    modalSummaryRoi: document.getElementById('modal-summary-roi'),
    modalBuyPrice: document.getElementById('modal-buy-price'),
    modalBuySetup: document.getElementById('modal-buy-setup'),
    modalTotalBuy: document.getElementById('modal-total-buy'),
    modalSellPrice: document.getElementById('modal-sell-price'),
    modalSellSetup: document.getElementById('modal-sell-setup'),
    modalTaxLabel: document.getElementById('modal-tax-label'),
    modalSellTax: document.getElementById('modal-sell-tax'),
    modalTotalRevenue: document.getElementById('modal-total-revenue'),

    modalGuideCity: document.getElementById('modal-guide-city'),
    modalGuideItemName: document.getElementById('modal-guide-item-name'),
    modalGuideBuyPrice: document.getElementById('modal-guide-buy-price'),
    modalGuideSellPrice: document.getElementById('modal-guide-sell-price'),
    btnCopyItemName: document.getElementById('btn-copy-item-name')
  };

  // Initialize
  function init() {
    setupEventListeners();
    updatePremiumUI();
    dom.statCurrentCity.textContent = state.city;
  }

  // Event Listeners
  function setupEventListeners() {
    // Premium Switch
    dom.premiumToggle.addEventListener('change', (e) => {
      state.hasPremium = e.target.checked;
      updatePremiumUI();
      recalculateAll();
    });

    // Server Selection
    dom.serverSelect.addEventListener('change', (e) => {
      state.server = e.target.value;
      AlbionAPI.setServer(state.server);
      dom.currentServerBadge.textContent = state.server.toUpperCase();
      state.allScannedData = [];
      clearTable();
      updateStats();
    });

    // City Selection
    dom.citiesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.city-btn');
      if (!btn) return;
      document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.city = btn.dataset.city;
      dom.statCurrentCity.textContent = state.city;
      // Auto trigger scan or refresh if already had data
      startScan(false);
    });

    // Category Quick Filters
    dom.categoryPresets.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.cat;
      startScan(false);
    });

    // Filter Controls
    dom.searchInput.addEventListener('input', (e) => {
      state.search = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });

    dom.tierSelect.addEventListener('change', (e) => {
      state.tier = e.target.value;
      applyFiltersAndRender();
    });

    dom.enchantSelect.addEventListener('change', (e) => {
      state.enchant = e.target.value;
      applyFiltersAndRender();
    });

    dom.budgetSelect.addEventListener('change', (e) => {
      state.maxBudget = parseInt(e.target.value, 10);
      applyFiltersAndRender();
    });

    dom.minProfitSelect.addEventListener('change', (e) => {
      state.minProfit = parseInt(e.target.value, 10);
      applyFiltersAndRender();
    });

    dom.maxAgeSelect.addEventListener('change', (e) => {
      state.maxAgeMinutes = parseInt(e.target.value, 10);
      applyFiltersAndRender();
    });

    // Scan buttons
    dom.scanBtn.addEventListener('click', () => startScan(false));
    dom.refreshBtn.addEventListener('click', () => startScan(true));
    dom.resetBtn.addEventListener('click', resetFilters);

    // Sorting headers
    dom.marketResultsTable.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th || !th.dataset.sort) return;
      const field = th.dataset.sort;
      if (state.sortField === field) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortField = field;
        state.sortAsc = (field === 'name' || field === 'unitCost');
      }
      updateSortHeaderUI();
      applyFiltersAndRender();
    });

    // Row click -> Open Modal
    dom.marketTableBody.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-item-id]');
      if (!row) return;
      const itemId = row.dataset.itemId;
      const quality = parseInt(row.dataset.quality || 1, 10);
      const found = state.processedItems.find(it => it.id === itemId && it.quality === quality);
      if (found) {
        openModal(found);
      }
    });

    // Modal Events
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.calcModal.addEventListener('click', (e) => {
      if (e.target === dom.calcModal) closeModal();
    });

    dom.calcQtyInput.addEventListener('input', (e) => {
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

    // Copy Item Name
    dom.btnCopyItemName.addEventListener('click', () => {
      if (!state.modalItem) return;
      const copyText = state.modalItem.enName || state.modalItem.name;
      navigator.clipboard.writeText(copyText).then(() => {
        const originalText = dom.btnCopyItemName.innerHTML;
        dom.btnCopyItemName.innerHTML = '✅ Đã Copy!';
        setTimeout(() => {
          dom.btnCopyItemName.innerHTML = originalText;
        }, 1500);
      });
    });

    // Keyboard ESC to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.calcModal.classList.contains('is-active')) {
        closeModal();
      }
    });
  }

  // Update Premium visual state
  function updatePremiumUI() {
    if (state.hasPremium) {
      dom.premiumCard.classList.remove('is-inactive');
      dom.premiumCard.classList.add('is-active');
      dom.premiumStatusTitle.innerHTML = '🌟 PREMIUM ACTIVE';
      dom.premiumStatusDesc.innerHTML = 'Thuế Market: <strong class="premium-badge-tax">4.0%</strong> | Setup: <strong>2.5%</strong> (Tổng phí 6.5%)';
    } else {
      dom.premiumCard.classList.remove('is-active');
      dom.premiumCard.classList.add('is-inactive');
      dom.premiumStatusTitle.innerHTML = '❌ KHÔNG PREMIUM';
      dom.premiumStatusDesc.innerHTML = 'Thuế Market: <strong style="color: var(--ruby-light)">8.0%</strong> | Setup: <strong>2.5%</strong> (Tổng phí 10.5%)';
    }
  }

  // Update Sorting Headers in Table
  function updateSortHeaderUI() {
    dom.marketResultsTable.querySelectorAll('th').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === state.sortField) {
        th.classList.add(state.sortAsc ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  // Reset Filters
  function resetFilters() {
    dom.searchInput.value = '';
    state.search = '';
    dom.tierSelect.value = 'all';
    state.tier = 'all';
    dom.enchantSelect.value = 'all';
    state.enchant = 'all';
    dom.budgetSelect.value = '0';
    state.maxBudget = 0;
    dom.minProfitSelect.value = '1000';
    state.minProfit = 1000;
    dom.maxAgeSelect.value = '1440';
    state.maxAgeMinutes = 1440;
    applyFiltersAndRender();
  }

  // Clear Table
  function clearTable() {
    dom.marketTableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-icon">⚖️</div>
            <h3>Sẵn Sàng Quét Thị Trường</h3>
            <p>Hãy chọn thành phố bạn đang đứng, chọn nhóm hàng và nhấn <strong>Bắt Đầu Quét</strong> để tìm các món hời nhất!</p>
          </div>
        </td>
      </tr>
    `;
    dom.filteredItemsCount.textContent = '0';
  }

  // Start Scanning Process
  async function startScan(forceRefresh = false) {
    if (state.isScanning) return;
    state.isScanning = true;

    const itemsToScan = getItemsForScan();
    const itemIds = itemsToScan.map(it => it.id);

    // Show Progress
    dom.progressContainer.classList.add('is-active');
    dom.progressBar.style.width = '0%';
    dom.progressPercent.textContent = '0%';
    dom.progressLabel.innerHTML = `<span>⚡</span> Đang quét <strong>${itemIds.length}</strong> vật phẩm tại <strong>${state.city}</strong>...`;
    dom.scanStatusText.textContent = `Đang kết nối API AODP (${state.server.toUpperCase()})...`;
    dom.scanBtn.disabled = true;
    dom.scanBtn.style.opacity = '0.7';

    try {
      const rawPrices = await AlbionAPI.fetchPrices(
        itemIds,
        state.city,
        [1, 2, 3], // Qualities: Normal, Good, Outstanding
        (loaded, total, percent) => {
          dom.progressBar.style.width = `${percent}%`;
          dom.progressPercent.textContent = `${percent}%`;
          dom.progressLabel.innerHTML = `<span>⚡</span> Đang tải: lô ${loaded}/${total} (${percent}%)`;
        },
        forceRefresh
      );

      state.allScannedData = rawPrices;
      dom.scanStatusText.textContent = `Quét hoàn tất: nhận ${rawPrices.length} bản ghi giá từ ${state.city}.`;

      recalculateAll();
    } catch (err) {
      console.error('Scan error:', err);
      dom.scanStatusText.textContent = 'Lỗi khi quét dữ liệu từ máy chủ. Vui lòng thử lại!';
    } finally {
      state.isScanning = false;
      dom.scanBtn.disabled = false;
      dom.scanBtn.style.opacity = '1';
      setTimeout(() => {
        dom.progressContainer.classList.remove('is-active');
      }, 600);
    }
  }

  // Recalculate metrics when premium toggles or raw data arrives
  function recalculateAll() {
    const itemMap = new Map();
    (window.ALBION_ITEMS || []).forEach(it => itemMap.set(it.id, it));

    const processed = [];

    for (const record of state.allScannedData) {
      // Must have valid sell price min and buy price max
      if (!record.sell_price_min || !record.buy_price_max) continue;
      if (record.sell_price_min <= 0 || record.buy_price_max <= 0) continue;

      const calc = Calculator.calculateFlip(
        record.sell_price_min,
        record.buy_price_max,
        state.hasPremium,
        1
      );

      if (!calc) continue;

      const meta = itemMap.get(record.item_id) || {
        id: record.item_id,
        name: record.item_id,
        enName: record.item_id,
        tier: 4,
        enchant: 0,
        category: 'other'
      };

      // Freshness
      const sellAge = Calculator.getDataAgeInfo(record.sell_price_min_date);
      const buyAge = Calculator.getDataAgeInfo(record.buy_price_max_date);
      // Overall age is the oldest of the two prices
      const effectiveMinutes = Math.max(sellAge.minutes, buyAge.minutes);
      const freshness = effectiveMinutes < 60 ? 'fresh' : (effectiveMinutes < 360 ? 'medium' : (effectiveMinutes < 1440 ? 'stale' : 'expired'));

      processed.push({
        id: record.item_id,
        name: meta.name,
        enName: meta.enName,
        tier: meta.tier,
        enchant: meta.enchant,
        category: meta.category,
        quality: record.quality,
        city: record.city,

        rawSellMin: record.sell_price_min,
        rawBuyMax: record.buy_price_max,
        sellDate: record.sell_price_min_date,
        buyDate: record.buy_price_max_date,
        effectiveMinutes,
        freshness,
        ageText: Calculator.getDataAgeInfo(effectiveMinutes === sellAge.minutes ? record.sell_price_min_date : record.buy_price_max_date).text,

        // Flip Metrics
        buyPrice: calc.buyPrice,
        sellPrice: calc.sellPrice,
        unitCost: calc.unitCost,
        unitNetProfit: calc.unitNetProfit,
        roi: calc.roi,
        buySetupFee: calc.buySetupFee,
        sellSetupFee: calc.sellSetupFee,
        salesTax: calc.salesTax,
        unitNetRevenue: calc.unitNetRevenue,
        hasPremium: state.hasPremium
      });
    }

    state.processedItems = processed;
    applyFiltersAndRender();
  }

  // Filter and Sort Processed Items
  function applyFiltersAndRender() {
    let list = [...state.processedItems];

    // Filter: Search
    if (state.search) {
      const q = state.search;
      list = list.filter(it => 
        it.name.toLowerCase().includes(q) ||
        it.enName.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q)
      );
    }

    // Filter: Tier
    if (state.tier !== 'all') {
      const t = parseInt(state.tier, 10);
      list = list.filter(it => it.tier === t);
    }

    // Filter: Enchant
    if (state.enchant !== 'all') {
      const enc = parseInt(state.enchant, 10);
      list = list.filter(it => it.enchant === enc);
    }

    // Filter: Max Budget
    if (state.maxBudget > 0) {
      list = list.filter(it => it.unitCost <= state.maxBudget);
    }

    // Filter: Min Profit
    if (state.minProfit > 0) {
      list = list.filter(it => it.unitNetProfit >= state.minProfit);
    }

    // Filter: Max Age
    if (state.maxAgeMinutes > 0) {
      list = list.filter(it => it.effectiveMinutes <= state.maxAgeMinutes);
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[state.sortField];
      let valB = b[state.sortField];
      if (typeof valA === 'string') {
        return state.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return state.sortAsc ? (valA - valB) : (valB - valA);
    });

    renderTable(list);
    updateStats(list);
  }

  // Quality Label Helper
  function getQualityLabel(q) {
    switch (q) {
      case 1: return 'Normal';
      case 2: return 'Good';
      case 3: return 'Outstanding';
      case 4: return 'Excellent';
      case 5: return 'Masterpiece';
      default: return 'Normal';
    }
  }

  // Render Table Rows
  function renderTable(items) {
    dom.filteredItemsCount.textContent = items.length;

    if (items.length === 0) {
      dom.marketTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h3>Không Tìm Thấy Món Đồ Nào Thỏa Mãn Bộ Lọc</h3>
              <p>Thử giảm mức "Lợi Nhuận Tối Thiểu", tăng "Độ Cũ Dữ Liệu", hoặc nhấn "🧹 Đặt Lại Bộ Lọc".</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = items.map(item => {
      const imgUrl = AlbionAPI.getItemImageUrl(item.id, item.quality);
      const roiClass = item.roi >= 30 ? 'roi-epic' : (item.roi >= 15 ? 'roi-good' : (item.roi >= 5 ? 'roi-normal' : 'roi-low'));
      const qLabel = getQualityLabel(item.quality);

      return `
        <tr data-item-id="${item.id}" data-quality="${item.quality}">
          <td>
            <div class="item-cell">
              <div class="item-icon-box">
                <img src="${imgUrl}" alt="${item.name}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\'><rect width=\\'40\\' height=\\'40\\' fill=\\'%231e293b\\'/></svg>'">
              </div>
              <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-en-name">${item.enName}</div>
                <div class="item-badges">
                  <span class="badge-tier">T${item.tier}</span>
                  ${item.enchant > 0 ? `<span class="badge-enchant">.${item.enchant}</span>` : ''}
                  <span class="badge-quality">${qLabel}</span>
                </div>
              </div>
            </div>
          </td>
          <td>
            <div class="price-val" style="color: var(--text-gold);">${Calculator.formatSilver(item.buyPrice)}</div>
            <div class="price-hint">Setup: ${Calculator.formatSilver(item.buySetupFee)}</div>
          </td>
          <td>
            <div class="price-val" style="color: var(--text-primary);">${Calculator.formatSilver(item.sellPrice)}</div>
            <div class="price-hint">Thuế: ${Calculator.formatSilver(item.salesTax)}</div>
          </td>
          <td>
            <div class="price-val">${Calculator.formatSilver(item.unitCost)}</div>
            <div class="price-hint">Vốn / cái</div>
          </td>
          <td>
            <div class="profit-val">
              +${Calculator.formatSilver(item.unitNetProfit)}
            </div>
            <div class="price-hint">Đã trừ toàn bộ phí</div>
          </td>
          <td>
            <span class="roi-badge ${roiClass}">+${item.roi}%</span>
          </td>
          <td>
            <span class="freshness-badge freshness-${item.freshness}">
              <span class="freshness-dot"></span>
              ${item.ageText}
            </span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="action-calc-btn" title="Tính số lượng & xem kế hoạch">
              🧮 Tính Vốn
            </button>
          </td>
        </tr>
      `;
    }).join('');

    dom.marketTableBody.innerHTML = rowsHtml;
  }

  // Update Top Metric Cards
  function updateStats(items = state.processedItems) {
    dom.statOpportunities.textContent = items.length;
    dom.statOpportunitiesSub.textContent = `Tại ${state.city}`;

    if (items.length > 0) {
      let maxProfit = 0;
      let sumRoi = 0;
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

  // Open Detail Calculator Modal
  function openModal(item) {
    state.modalItem = item;
    state.modalQty = 1;
    dom.calcQtyInput.value = 1;

    dom.modalImg.src = AlbionAPI.getItemImageUrl(item.id, item.quality);
    dom.modalItemName.textContent = item.name;
    dom.modalItemEn.textContent = `${item.enName} (T${item.tier}${item.enchant > 0 ? '.' + item.enchant : ''} - ${getQualityLabel(item.quality)})`;

    dom.modalGuideCity.textContent = item.city;
    dom.modalGuideItemName.textContent = item.enName;
    dom.modalGuideBuyPrice.textContent = Calculator.formatSilver(item.buyPrice);
    dom.modalGuideSellPrice.textContent = Calculator.formatSilver(item.sellPrice);

    updateModalCalculations();
    dom.calcModal.classList.add('is-active');
  }

  // Update Calculations Inside Modal when Quantity or Item changes
  function updateModalCalculations() {
    if (!state.modalItem) return;
    const it = state.modalItem;
    const qty = state.modalQty;

    const calc = Calculator.calculateFlip(it.rawSellMin, it.rawBuyMax, state.hasPremium, qty);
    if (!calc) return;

    dom.modalSummaryProfit.textContent = `+${Calculator.formatSilver(calc.totalProfit)} Silver`;
    dom.modalSummaryRoi.textContent = `Tỷ Suất Lợi Nhuận: +${calc.roi}% ROI (${qty} món)`;

    dom.modalBuyPrice.textContent = `${Calculator.formatSilver(calc.buyPrice * qty)} Silver`;
    dom.modalBuySetup.textContent = `${Calculator.formatSilver(calc.buySetupFee * qty)} Silver`;
    dom.modalTotalBuy.textContent = `${Calculator.formatSilver(calc.totalInvestment)} Silver`;

    dom.modalSellPrice.textContent = `${Calculator.formatSilver(calc.sellPrice * qty)} Silver`;
    dom.modalSellSetup.textContent = `${Calculator.formatSilver(calc.sellSetupFee * qty)} Silver`;
    dom.modalTaxLabel.textContent = `Thuế Market (${(calc.taxRate * 100).toFixed(1)}%):`;
    dom.modalSellTax.textContent = `${Calculator.formatSilver(calc.salesTax * qty)} Silver`;
    dom.modalTotalRevenue.textContent = `${Calculator.formatSilver(calc.totalRevenue)} Silver`;
  }

  function closeModal() {
    dom.calcModal.classList.remove('is-active');
    state.modalItem = null;
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
