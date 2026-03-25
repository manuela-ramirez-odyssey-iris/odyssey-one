// Search bar focus/blur behavior (idle ↔ focused states)
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('focus', () => {
  searchBar.classList.add('focused');
});

searchInput.addEventListener('blur', () => {
  searchBar.classList.remove('focused');
});

// Clear search input
const clearBtn = document.getElementById('searchClear');
clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchState();
  searchInput.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDropdown();
    searchInput.value = '';
    clearSearchState();
  }
});

// ========================================
// Navbar search bar (original, fully functional)
// ========================================
const navSearchBar = document.getElementById('navSearchBar');
const navSearchInput = document.getElementById('navSearchInput');
const navSearchClear = document.getElementById('navSearchClear');
const navCategoryBtn = document.getElementById('navSearchCategory');
const navCategoryText = document.getElementById('navCategoryText');
const navDropdown = document.getElementById('navSearchDropdown');
const navSearchPanel = document.getElementById('navSearchPanel');
const navSearchChips = document.getElementById('navSearchChips');
const navFilterIcon = document.getElementById('navFilterIcon');
const navBookmarkBtn = document.getElementById('navSearchBookmarkBtn');
const navSavedBackBtn = document.getElementById('navSearchSavedBackBtn');
const navChipsView = document.getElementById('navSearchPanelChipsView');
const navSavedView = document.getElementById('navSearchPanelSavedView');
const navSavedList = document.getElementById('navSearchPanelSavedList');
const navAppliedQuery = document.getElementById('navSearchAppliedQuery');
const navAppliedQueryText = document.getElementById('navSearchAppliedQueryText');
const navAppliedQueryRemove = document.getElementById('navSearchAppliedQueryRemove');

let navActiveChipKey = null;
let navDebounceTimer = null;
let navPanelsCollapsedBySearch = false;
let navAppliedSavedQuery = null;

// Focus/blur
navSearchInput.addEventListener('focus', () => navSearchBar.classList.add('focused'));
navSearchInput.addEventListener('blur', () => navSearchBar.classList.remove('focused'));

// Clear
navSearchClear.addEventListener('click', () => {
  navSearchInput.value = '';
  navClearSearchState();
  navSearchInput.focus();
});

function navClearSearchState() {
  navClosePanel();
  navActiveChipKey = null;
  navAppliedSavedQuery = null;
  navAppliedQuery.style.display = 'none';
  navAppliedQueryText.textContent = '';
  navUpdateFilterIcon();
  if (navPanelsCollapsedBySearch) {
    monitorPanelsContainer.classList.remove('collapsed');
    collapseText.textContent = 'Collapse metrics';
    collapseChevron.classList.remove('flipped');
    navPanelsCollapsedBySearch = false;
  }
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  rows.forEach(row => row.style.display = '');
  updateItemCount();
}

// Category dropdown
function navPositionDropdown() {
  const rect = navCategoryBtn.getBoundingClientRect();
  navDropdown.style.top = rect.bottom + 'px';
  navDropdown.style.left = rect.left + 'px';
}

function navOpenDropdown() {
  navPositionDropdown();
  navDropdown.classList.add('open');
  navSearchBar.classList.add('focused');
}

function navCloseDropdown() {
  navDropdown.classList.remove('open');
}

navCategoryBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  navDropdown.classList.contains('open') ? navCloseDropdown() : navOpenDropdown();
});

navDropdown.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const item = e.target.closest('.search-dropdown-item');
  if (!item) return;
  navDropdown.querySelectorAll('.search-dropdown-item').forEach(i => i.classList.remove('active'));
  item.classList.add('active');
  navCategoryText.textContent = item.dataset.value;
  navCloseDropdown();
  navSearchInput.focus();
});

document.addEventListener('mousedown', (e) => {
  if (!navCategoryBtn.contains(e.target) && !navDropdown.contains(e.target)) {
    navCloseDropdown();
  }
});

window.addEventListener('resize', () => {
  if (navDropdown.classList.contains('open')) navPositionDropdown();
  if (navSearchPanel.classList.contains('open')) navPositionPanel();
});

// Search panel positioning
function navPositionPanel() {
  const rect = navSearchBar.getBoundingClientRect();
  navSearchPanel.style.left = rect.left + 'px';
  navSearchPanel.style.top = rect.bottom + 'px';
  navSearchPanel.style.width = rect.width + 'px';
}

function navOpenPanel() {
  navPositionPanel();
  navSearchPanel.classList.add('open');
  if (navSavedView) navSavedView.style.display = 'none';
  if (navChipsView) navChipsView.style.display = '';
}

function navClosePanel() {
  navSearchPanel.classList.remove('open');
  navActiveChipKey = null;
  navUpdateFilterIcon();
}

// Chips rendering
function navRenderChips(chips) {
  navSearchChips.innerHTML = '';
  chips.forEach(attr => {
    const chip = document.createElement('button');
    chip.className = 'search-chip';
    chip.textContent = attr.label;
    chip.dataset.key = attr.key;
    if (navActiveChipKey === attr.key) chip.classList.add('active');
    chip.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navActiveChipKey = (navActiveChipKey === attr.key) ? null : attr.key;
      navRenderChips(chips);
      navFilterTable(navSearchInput.value);
      navUpdateFilterIcon();
    });
    navSearchChips.appendChild(chip);
  });
}

function navFilterTable(query) {
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  const q = query.toLowerCase().trim();
  if (!q) { rows.forEach(r => r.style.display = ''); updateItemCount(); return; }
  rows.forEach(row => {
    let match = false;
    if (navActiveChipKey) {
      const attr = searchAttributes.find(a => a.key === navActiveChipKey);
      if (attr) match = (row.getAttribute(attr.dataAttr) || '').toLowerCase().includes(q);
    } else {
      const cells = row.querySelectorAll('td');
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].textContent.toLowerCase().includes(q)) { match = true; break; }
      }
    }
    row.style.display = match ? '' : 'none';
  });
  updateItemCount();
}

function navUpdateFilterIcon() {
  if (navActiveChipKey) {
    navFilterIcon.classList.remove('disabled');
    navFilterIcon.disabled = false;
  } else {
    navFilterIcon.classList.add('disabled');
    navFilterIcon.disabled = true;
  }
}
navUpdateFilterIcon();

// Filter icon opens filter panel
navFilterIcon.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!navActiveChipKey) return;
  if (appLayout.classList.contains('filters-open')) {
    closeFiltersPanel();
  } else {
    openFiltersPanel();
  }
});

// Input handler
navSearchInput.addEventListener('input', () => {
  clearTimeout(navDebounceTimer);
  navDebounceTimer = setTimeout(() => {
    const query = navSearchInput.value.trim();
    if (!query) { navClearSearchState(); return; }
    if (!monitorPanelsContainer.classList.contains('collapsed')) {
      monitorPanelsContainer.classList.add('collapsed');
      collapseText.textContent = 'Expand metrics';
      collapseChevron.classList.add('flipped');
      navPanelsCollapsedBySearch = true;
    }
    navCloseDropdown();
    const chips = getChipsForQuery(query);
    navRenderChips(chips);
    navOpenPanel();
    navFilterTable(query);
  }, 150);
});

// Close panel on outside click
document.addEventListener('mousedown', (e) => {
  const filtersEl = document.getElementById('filtersPanel');
  if (navSearchPanel.classList.contains('open') &&
      !navSearchPanel.contains(e.target) &&
      !navSearchBar.contains(e.target) &&
      !(filtersEl && filtersEl.contains(e.target))) {
    navClosePanel();
  }
});

// Bookmark / saved searches
function navShowChipsView() {
  if (navChipsView) navChipsView.style.display = '';
  if (navSavedView) navSavedView.style.display = 'none';
}

function navShowSavedView() {
  if (navChipsView) navChipsView.style.display = 'none';
  if (navSavedView) navSavedView.style.display = '';
  navRenderSavedList();
}

function navRenderSavedList() {
  navSavedList.innerHTML = '';
  savedQueries.forEach(sq => {
    const item = document.createElement('button');
    item.className = 'search-saved-list-item';
    item.innerHTML =
      '<span class="search-saved-list-name">' + sq.name + '</span>' +
      '<span class="search-saved-list-query">' + sq.query + '</span>';
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navApplySavedQuery(sq);
    });
    navSavedList.appendChild(item);
  });
}

function navApplySavedQuery(sq) {
  navAppliedSavedQuery = sq;
  navAppliedQueryText.textContent = sq.name;
  navAppliedQuery.style.display = '';
  navClosePanel();
  navFilterTable(navSearchInput.value);
}

navBookmarkBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  (navSavedView.style.display !== 'none') ? navShowChipsView() : navShowSavedView();
});

navSavedBackBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  navShowChipsView();
});

navAppliedQueryRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  navAppliedSavedQuery = null;
  navAppliedQuery.style.display = 'none';
  navAppliedQueryText.textContent = '';
  if (navSearchInput.value.trim()) {
    navFilterTable(navSearchInput.value);
  } else {
    navClearSearchState();
  }
  navSearchInput.focus();
});

// Keep closeDropdown stub for table search references
function closeDropdown() { /* no-op stub for table search */ }

// ========================================
// Select-all checkbox
// ========================================
function initCheckboxes() {
  const selectAll = document.querySelector('.select-all');
  const rowCheckboxes = document.querySelectorAll('.row-checkbox:not(.select-all)');
  if (!selectAll) return;

  selectAll.addEventListener('change', () => {
    rowCheckboxes.forEach(cb => cb.checked = selectAll.checked);
  });

  rowCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      selectAll.checked = [...rowCheckboxes].every(c => c.checked);
      selectAll.indeterminate = !selectAll.checked && [...rowCheckboxes].some(c => c.checked);
    });
  });
}
initCheckboxes();

function updateItemCount() {
  const counter = document.querySelector('.table-item-count');
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  if (counter) {
    const visibleRows = [...rows].filter(r => r.style.display !== 'none');
    counter.textContent = visibleRows.length + ' items';
  }
}
updateItemCount();

// ========================================
// Sidebar active state
// ========================================
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
sidebarBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sidebarBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ========================================
// Monitor Panel Selection
// ========================================
const panelMap = {
  'exceptions': 'viewExceptions',
  'monitoring': 'viewMonitoring',
  'pgipgr': 'viewPgipgr'
};

const monitorPanels = document.querySelectorAll('.monitor-panel');
const panelViews = document.querySelectorAll('.panel-view');

monitorPanels.forEach(panel => {
  panel.addEventListener('click', () => {
    // Update selected panel
    monitorPanels.forEach(p => p.classList.remove('selected'));
    panel.classList.add('selected');

    // Show corresponding view
    const panelKey = panel.dataset.panel;
    panelViews.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(panelMap[panelKey]);
    if (targetView) targetView.classList.add('active');
  });
});

// ========================================
// Collapse/Expand Monitor Panels
// ========================================
const collapseBtn = document.getElementById('collapseBtn');
const collapseText = collapseBtn.querySelector('.collapse-text');
const collapseChevron = collapseBtn.querySelector('.collapse-chevron');
const monitorPanelsContainer = document.getElementById('monitorPanels');

collapseBtn.addEventListener('click', () => {
  const isCollapsed = monitorPanelsContainer.classList.contains('collapsed');
  if (isCollapsed) {
    monitorPanelsContainer.classList.remove('collapsed');
    collapseText.textContent = 'Collapse metrics';
    collapseChevron.classList.remove('flipped');
  } else {
    monitorPanelsContainer.classList.add('collapsed');
    collapseText.textContent = 'Expand metrics';
    collapseChevron.classList.add('flipped');
  }
});

// ========================================
// Shipment Tabs
// ========================================
const shipmentTabs = document.querySelectorAll('.shipment-tab');
shipmentTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    shipmentTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// ========================================
// Global Search System
// ========================================
const searchPanel = document.getElementById('searchPanel');
const searchChips = document.getElementById('searchChips');

const searchAttributes = [
  { key: 'buy-shipment', label: 'Buy Shipment #', type: 'number-text', dataAttr: 'data-buy-shipment' },
  { key: 'sell-shipment', label: 'Sell Shipment #', type: 'number-text', dataAttr: 'data-sell-shipment' },
  { key: 'order', label: 'Order #', type: 'text', dataAttr: 'data-order' },
  { key: 'pro', label: 'Pro#/Booking #', type: 'number-text', dataAttr: 'data-pro' },
  { key: 'equipment', label: 'Equipment #', type: 'number-text', dataAttr: 'data-equipment' },
  { key: 'seal', label: 'Seal Number', type: 'number-text', dataAttr: 'data-seal' },
  { key: 'load', label: 'Load #', type: 'number-text', dataAttr: 'data-load' },
  { key: 'customer-id', label: 'Customer ID', type: 'text', dataAttr: 'data-customer-id' },
  { key: 'customer-name', label: 'Customer Name', type: 'text', dataAttr: 'data-customer-name' },
  { key: 'consignor', label: 'Consignor', type: 'text', dataAttr: 'data-consignor' },
  { key: 'consignee', label: 'Consignee', type: 'text', dataAttr: 'data-consignee' },
  { key: 'origin', label: 'Origin', type: 'text', dataAttr: 'data-origin' },
  { key: 'destination', label: 'Destination', type: 'text', dataAttr: 'data-destination' },
  { key: 'mode', label: 'Mode', type: 'dropdown', dataAttr: 'data-mode', values: ['FTL', 'LTL', 'INTERMODAL'] },
  { key: 'scac', label: 'SCAC', type: 'dropdown', dataAttr: 'data-scac', values: ['CTNS', 'JBHT', 'SNLU', 'USFC', 'ODFL'] },
  { key: 'tender-status', label: 'Tender Status', type: 'dropdown', dataAttr: 'data-tender-status', values: ['Done', 'Pending', 'Rejected'] },
  { key: 'shipment-status', label: 'Shipment Status', type: 'dropdown', dataAttr: 'data-shipment-status', values: ['Tender', 'In Transit', 'Delivered', 'Booked'] },
  { key: 'equipment-code', label: 'Equipment Code', type: 'dropdown', dataAttr: 'data-equipment-code', values: ['FLT', 'LTH', 'VAN', 'REEFER'] },
];

let activeChipKey = null;
let searchDebounceTimer = null;
let panelsCollapsedBySearch = false;

function openSearchPanel() {
  searchPanel.classList.add('open');
  // Always reset to chips view when opening
  const savedView = document.getElementById('searchPanelSavedView');
  if (savedView) savedView.style.display = 'none';
}

function closeSearchPanel() {
  searchPanel.classList.remove('open');
  activeChipKey = null;
  if (filterIconBtn) updateFilterIconState();
}

function clearSearchState() {
  closeFiltersPanel();
  closeSearchPanel();
  activeChipKey = null;
  // Clear applied saved query
  appliedSavedQuery = null;
  const appliedEl = document.getElementById('searchAppliedQuery');
  if (appliedEl) appliedEl.style.display = 'none';
  if (typeof updateBookmarkIcon === 'function') updateBookmarkIcon();
  // Update filter icon state after clearing chip
  if (filterIconBtn) updateFilterIconState();
  // Expand panels if we collapsed them
  if (panelsCollapsedBySearch) {
    monitorPanelsContainer.classList.remove('collapsed');
    collapseText.textContent = 'Collapse metrics';
    collapseChevron.classList.remove('flipped');
    panelsCollapsedBySearch = false;
  }
  // Show all rows
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  rows.forEach(row => row.style.display = '');
  updateItemCount();
}

function collapseMonitorPanels() {
  if (!monitorPanelsContainer.classList.contains('collapsed')) {
    monitorPanelsContainer.classList.add('collapsed');
    collapseText.textContent = 'Expand metrics';
    collapseChevron.classList.add('flipped');
    panelsCollapsedBySearch = true;
  }
}

function getChipsForQuery(query) {
  const hasDigits = /\d/.test(query);
  const hasLetters = /[a-zA-Z]/.test(query);
  const queryLower = query.toLowerCase();

  const chips = [];

  searchAttributes.forEach(attr => {
    if (attr.type === 'dropdown') {
      // Show dropdown chips if query matches any of the values
      if (attr.values && attr.values.some(v => v.toLowerCase().includes(queryLower))) {
        chips.push(attr);
      }
    } else if (attr.type === 'number-text') {
      if (hasDigits) chips.push(attr);
    } else if (attr.type === 'text') {
      if (hasLetters) chips.push(attr);
    }
  });

  return chips;
}

function renderChips(chips) {
  searchChips.innerHTML = '';
  chips.forEach(attr => {
    const chip = document.createElement('button');
    chip.className = 'search-chip';
    chip.textContent = attr.label;
    chip.dataset.key = attr.key;
    if (activeChipKey === attr.key) {
      chip.classList.add('active');
    }
    chip.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent blur on search input
      e.stopPropagation();
      if (activeChipKey === attr.key) {
        activeChipKey = null;
      } else {
        activeChipKey = attr.key;
      }
      renderChips(chips);
      filterTable(searchInput.value);
      updateFilterIconState();
      // Re-render filters if panel is open
      if (appLayout.classList.contains('filters-open')) {
        if (activeChipKey) {
          openFiltersPanel();
        }
        // closeFiltersPanel is handled by updateFilterIconState when chip deselected
      }
    });
    searchChips.appendChild(chip);
  });
}

// Parse a saved query string like "mode:FTL customer-name:G2O" into [{key, value}]
function parseSavedQueryFilters(queryStr) {
  const filters = [];
  // Match key:value or key:"quoted value"
  const regex = /(\w[\w-]*):(["']([^"']*?)["']|(\S+))/g;
  let m;
  while ((m = regex.exec(queryStr)) !== null) {
    const key = m[1];
    const value = m[3] !== undefined ? m[3] : m[4];
    // Map key to a searchAttributes entry (key matches directly, or status→shipment-status)
    const attr = searchAttributes.find(a => a.key === key)
              || searchAttributes.find(a => a.key === 'shipment-' + key);
    if (attr) {
      filters.push({ dataAttr: attr.dataAttr, value: value.toLowerCase() });
    }
  }
  return filters;
}

function filterTable(query) {
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  const queryLower = query.toLowerCase().trim();
  const hasSavedQuery = appliedSavedQuery !== null;
  const savedFilters = hasSavedQuery ? parseSavedQueryFilters(appliedSavedQuery.query) : [];

  // Nothing to filter — show all
  if (!queryLower && !hasSavedQuery) {
    rows.forEach(row => row.style.display = '');
    updateItemCount();
    return;
  }

  rows.forEach(row => {
    // 1. Check saved query filters (all must match)
    let savedMatch = true;
    if (hasSavedQuery) {
      for (const sf of savedFilters) {
        const rowVal = (row.getAttribute(sf.dataAttr) || '').toLowerCase();
        if (!rowVal.includes(sf.value)) {
          savedMatch = false;
          break;
        }
      }
    }

    // 2. Check free-text search input
    let textMatch = true;
    if (queryLower) {
      textMatch = false;
      if (activeChipKey) {
        const attr = searchAttributes.find(a => a.key === activeChipKey);
        if (attr) {
          const value = (row.getAttribute(attr.dataAttr) || '').toLowerCase();
          textMatch = value.includes(queryLower);
        }
      } else {
        const cells = row.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
          if (cells[i].textContent.toLowerCase().includes(queryLower)) {
            textMatch = true;
            break;
          }
        }
      }
    }

    row.style.display = (savedMatch && textMatch) ? '' : 'none';
  });

  updateItemCount();
}

// Listen for input in the search bar
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const query = searchInput.value.trim();

    if (!query) {
      clearSearchState();
      return;
    }

    // Collapse monitor panels
    collapseMonitorPanels();

    // Close the category dropdown if open
    closeDropdown();

    // Determine and render chips
    const chips = getChipsForQuery(query);
    renderChips(chips);

    // Position and show search panel
    openSearchPanel();

    // Filter the table
    filterTable(query);
  }, 150);
});



// ========================================
// Filters Panel
// ========================================

// Date filters — always shown when filters panel is open
const dateFilterGroup = {
  title: 'Schedule & Dates',
  fields: [
    { label: 'Pickup Date', dataAttr: 'data-pickup', type: 'date' },
    { label: 'Delivery Date', dataAttr: 'data-delivery', type: 'date' },
    { label: 'Earliest Pickup Date', dataAttr: 'data-earliest-pickup', type: 'date' },
    { label: 'Latest Pickup Date', dataAttr: 'data-latest-pickup', type: 'date' },
    { label: 'Earliest Delivery Date', dataAttr: 'data-earliest-delivery', type: 'date' },
    { label: 'Latest Delivery Date', dataAttr: 'data-latest-delivery', type: 'date' },
  ]
};

const filtersPanel = document.getElementById('filtersPanel');
const filtersBody = document.getElementById('filtersBody');
const filtersCloseBtn = document.getElementById('filtersCloseBtn');
const filtersClearBtn = document.getElementById('filtersClearBtn');
const filtersApplyBtn = document.getElementById('filtersApplyBtn');
const appLayout = document.querySelector('.app-layout');
const filterIconBtn = document.getElementById('tableFilterIcon');

function getRelevantFilterGroups() {
  return [dateFilterGroup];
}

function renderFilterGroups(groups) {
  filtersBody.innerHTML = '';

  // Info icon SVG (reusable)
  const infoSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#9DA3B0" stroke-width="1"/><path d="M8 7v4M8 5.5v.01" stroke="#9DA3B0" stroke-width="1.2" stroke-linecap="round"/></svg>';

  groups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'filter-group';

    let html = '<div class="filter-group-title">' + group.title + '</div>';

    group.fields.forEach(field => {
      html += '<div class="filter-field">';
      html += '<div class="filter-label">' + field.label + ' <span class="filter-info-icon">' + infoSvg + '</span></div>';

      if (field.type === 'date') {
        html += '<input type="date" class="filter-date-native" data-filter-attr="' + field.dataAttr + '">';
      } else if (field.type === 'select' && field.options) {
        html += '<select class="filter-select" data-filter-attr="' + field.dataAttr + '">';
        html += '<option value="">Select an option</option>';
        field.options.forEach(opt => {
          html += '<option value="' + opt + '">' + opt + '</option>';
        });
        html += '</select>';
      } else {
        html += '<input type="text" class="filter-select" data-filter-attr="' + field.dataAttr + '" placeholder="Type to filter...">';
      }

      html += '</div>';
    });

    groupEl.innerHTML = html;
    filtersBody.appendChild(groupEl);
  });
}

function openFiltersPanel() {
  openFiltersPanelToTab('all');
}

function openFiltersPanelToTab(tabKey) {
  const groups = getRelevantFilterGroups();
  renderFilterGroups(groups);
  appLayout.classList.add('filters-open');
  updateApplyBtnCount();
  // Switch to the requested tab
  filtersTabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabKey);
  });
  const isAll = tabKey === 'all';
  filtersBody.style.display = isAll ? '' : 'none';
  filtersSavedBody.style.display = isAll ? 'none' : '';
  filtersFooterAll.style.display = isAll ? '' : 'none';
  if (typeof updateBookmarkIcon === 'function') updateBookmarkIcon();
}

function closeFiltersPanel() {
  appLayout.classList.remove('filters-open');
  if (typeof updateBookmarkIcon === 'function') updateBookmarkIcon();
}

function updateApplyBtnCount() {
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  const visibleCount = [...rows].filter(r => r.style.display !== 'none').length;
  filtersApplyBtn.textContent = 'Show ' + visibleCount + ' results';
}

function collectDateFilters() {
  const dateInputs = filtersBody.querySelectorAll('.filter-date-native');
  const dateFilters = [];

  dateInputs.forEach(input => {
    const val = input.value; // YYYY-MM-DD format from native input
    if (val) {
      dateFilters.push({ attr: input.dataset.filterAttr, value: val });
    }
  });
  return dateFilters;
}

function matchesDateFilter(rowDateStr, filter) {
  if (!rowDateStr) return false;
  // Row dates stored as "MM/DD/YYYY" or "MM/DD/YYYY HH:MM TZ" — parse to YYYY-MM-DD
  const parts = rowDateStr.trim().split(/[\s/]/);
  const rowMonth = parts[0] || '';
  const rowDay = parts[1] || '';
  const rowYear = parts[2] || '';
  const rowISO = rowYear + '-' + rowMonth + '-' + rowDay;
  return rowISO === filter.value;
}

function applyFilters() {
  const rows = document.querySelectorAll('.shipment-table tbody tr');
  const dateFilters = collectDateFilters();

  if (dateFilters.length === 0) {
    // No filters active — respect existing search filtering
    if (searchInput.value.trim()) {
      filterTable(searchInput.value);
    } else {
      rows.forEach(r => r.style.display = '');
    }
  } else {
    rows.forEach(row => {
      let match = true;

      dateFilters.forEach(df => {
        const rowVal = row.getAttribute(df.attr) || '';
        if (!matchesDateFilter(rowVal, df)) {
          match = false;
        }
      });

      row.style.display = match ? '' : 'none';
    });
  }

  updateItemCount();
  updateApplyBtnCount();
}

function updateFilterIconState() {
  filterIconBtn.classList.remove('disabled');
  filterIconBtn.disabled = false;
}

updateFilterIconState();

filterIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (appLayout.classList.contains('filters-open')) {
    closeFiltersPanel();
  } else {
    openFiltersPanelToTab('all');
  }
});

filtersCloseBtn.addEventListener('click', closeFiltersPanel);

filtersClearBtn.addEventListener('click', () => {
  const inputs = filtersBody.querySelectorAll('.filter-date-native');
  inputs.forEach(input => { input.value = ''; });
  applyFilters();
});

filtersApplyBtn.addEventListener('click', () => {
  applyFilters();
});

// Live filtering as user changes filter values
filtersBody.addEventListener('input', () => {
  applyFilters();
});
filtersBody.addEventListener('change', () => {
  applyFilters();
});

// ========================================
// Filters tab switching (All / Saved)
// ========================================
const filtersTabs = document.querySelectorAll('.filters-tab');
const filtersSavedBody = document.getElementById('filtersSavedBody');
const filtersFooterAll = document.getElementById('filtersFooterAll');

const savedQueries = [
  { name: 'Late LTL Deliveries — West Coast', query: 'mode:LTL status:"In Transit" destination:CA delivery:<2026-01-15' },
  { name: 'Pending Tenders — JBHT', query: 'scac:JBHT tender-status:Pending' },
  { name: 'FTL Shipments — G2O Tech', query: 'mode:FTL customer-name:G2O' },
  { name: 'Rejected Tenders — January', query: 'tender-status:Rejected pickup:01/*/2026' },
  { name: 'Intermodal — Hazardous Cargo', query: 'mode:INTERMODAL hazardous:Y' },
  { name: 'Open Orders — USALCO', query: 'customer-name:USALCO status:Tender' },
  { name: 'Delivered — Dallas Origin', query: 'origin:Dallas status:Delivered' },
];

function renderSavedQueries() {
  const copySvg = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" stroke-width="1.3"/></svg>';

  filtersSavedBody.innerHTML = '';
  savedQueries.forEach(sq => {
    const item = document.createElement('div');
    item.className = 'saved-query-item';
    item.style.cursor = 'pointer';
    item.innerHTML =
      '<div class="saved-query-content">' +
        '<div class="saved-query-name">' + sq.name + '</div>' +
        '<div class="saved-query-text">' + sq.query + '</div>' +
      '</div>' +
      '<button class="saved-query-copy" aria-label="Copy to clipboard">' + copySvg + '</button>';

    // Click item to apply saved query as chip in search bar
    item.addEventListener('click', (e) => {
      if (e.target.closest('.saved-query-copy')) return; // let copy handle itself
      applySavedQuery(sq);
    });

    const copyBtn = item.querySelector('.saved-query-copy');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(sq.query).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = copySvg;
        }, 1500);
      });
    });

    filtersSavedBody.appendChild(item);
  });
}

renderSavedQueries();

filtersTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filtersTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const isAll = tab.dataset.tab === 'all';
    filtersBody.style.display = isAll ? '' : 'none';
    filtersSavedBody.style.display = isAll ? 'none' : '';
    filtersFooterAll.style.display = isAll ? '' : 'none';
    if (typeof updateBookmarkIcon === 'function') updateBookmarkIcon();
  });
});

// ========================================
// Search Panel — Bookmark / Saved Searches
// ========================================
const searchBookmarkBtn = document.getElementById('searchBookmarkBtn');
const searchPanelSavedView = document.getElementById('searchPanelSavedView');
const searchPanelSavedList = document.getElementById('searchPanelSavedList');
const searchSavedBackBtn = document.getElementById('searchSavedBackBtn');
const searchAppliedQuery = document.getElementById('searchAppliedQuery');
const searchAppliedQueryText = document.getElementById('searchAppliedQueryText');
const searchAppliedQueryRemove = document.getElementById('searchAppliedQueryRemove');

let appliedSavedQuery = null;

function showSearchPanelChips() {
  searchPanelSavedView.style.display = 'none';
}

function showSearchPanelSaved() {
  searchPanelSavedView.style.display = '';
  renderSearchPanelSavedList();
}

function renderSearchPanelSavedList() {
  searchPanelSavedList.innerHTML = '';
  savedQueries.forEach(sq => {
    const item = document.createElement('button');
    item.className = 'search-saved-list-item';
    item.innerHTML =
      '<span class="search-saved-list-name">' + sq.name + '</span>' +
      '<span class="search-saved-list-query">' + sq.query + '</span>';

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      applySavedQuery(sq);
    });

    searchPanelSavedList.appendChild(item);
  });
}

function updateBookmarkIcon() {
  // Filled when filters panel is open on the Saved tab
  const savedTabActive = appLayout.classList.contains('filters-open') &&
    [...filtersTabs].some(t => t.dataset.tab === 'saved' && t.classList.contains('active'));
  searchBookmarkBtn.classList.toggle('active', savedTabActive);
}

function applySavedQuery(sq) {
  appliedSavedQuery = sq;

  // Show the chip inside the search bar
  searchAppliedQueryText.textContent = sq.name;
  searchAppliedQuery.style.display = '';

  // Close panels (closeFiltersPanel calls updateBookmarkIcon)
  closeSearchPanel();
  closeFiltersPanel();

  // Filter the table using the current input + saved query context
  filterTable(searchInput.value);
}

function removeSavedQuery() {
  appliedSavedQuery = null;
  searchAppliedQuery.style.display = 'none';
  searchAppliedQueryText.textContent = '';

  // Re-filter with just the input text
  if (searchInput.value.trim()) {
    filterTable(searchInput.value);
  } else {
    clearSearchState();
  }
}

searchBookmarkBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (appLayout.classList.contains('filters-open')) {
    closeFiltersPanel();
  } else {
    openFiltersPanelToTab('saved');
  }
});

searchSavedBackBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  showSearchPanelChips();
});

searchAppliedQueryRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  removeSavedQuery();
  searchInput.focus();
});

// ========================================
// Bottom Bar — Row Selection & Expand
// ========================================
const bottomBar = document.getElementById('bottomBar');
const bottomBarContent = document.getElementById('bottomBarContent');
const bottomBarSelectText = document.getElementById('bottomBarSelectText');
const bottomTabs = document.querySelectorAll('.bottom-tab');

const bottomTabMap = {
  'order': 'bottomTabOrder',
  'product': 'bottomTabProduct',
  'routing': 'bottomTabRouting',
  'tender': 'bottomTabTender',
  'cost': 'bottomTabCost',
  'instructions': 'bottomTabInstructions',
  'history': 'bottomTabHistory',
  'documents': 'bottomTabDocuments',
  'notes': 'bottomTabNotes',
  'stops': 'bottomTabStops',
};

let selectedRow = null;

function selectShipmentRow(row) {
  // Deselect previous row
  if (selectedRow && selectedRow !== row) {
    selectedRow.classList.remove('selected');
    const prevCb = selectedRow.querySelector('.row-checkbox');
    if (prevCb) prevCb.checked = false;
  }

  selectedRow = row;
  row.classList.add('selected');

  // Collapse metrics
  if (!monitorPanelsContainer.classList.contains('collapsed')) {
    monitorPanelsContainer.classList.add('collapsed');
    collapseText.textContent = 'Expand metrics';
    collapseChevron.classList.add('flipped');
  }

  // Update header with shipment ID
  const shipmentId = row.getAttribute('data-buy-shipment') || '';
  bottomBarSelectText.textContent = shipmentId;

  // Expand and auto-select Order tab
  bottomBar.classList.add('expanded');
  activateBottomTab('order');

  // Auto-scroll selected row above the bottom bar
  setTimeout(() => {
    const mainContent = document.querySelector('.main-content');
    const rowRect = row.getBoundingClientRect();
    const mainRect = mainContent.getBoundingClientRect();
    const targetY = mainContent.scrollTop + (rowRect.top - mainRect.top) - 120;
    mainContent.scrollTo({ top: targetY, behavior: 'smooth' });
  }, 350);
}

function activateBottomTab(tabKey) {
  bottomTabs.forEach(t => {
    if (t.dataset.tab === tabKey) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  const views = bottomBarContent.querySelectorAll('.bottom-tab-view');
  views.forEach(v => v.classList.remove('active'));
  const targetId = bottomTabMap[tabKey];
  if (targetId) {
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');
  }
}

// Checkbox triggers row selection & bottom bar expand
function initRowSelection() {
  const rowCheckboxes = document.querySelectorAll('.row-checkbox:not(.select-all)');
  rowCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const row = cb.closest('tr');
      if (cb.checked) {
        selectShipmentRow(row);
      } else {
        // If unchecking the selected row, collapse
        if (selectedRow === row) {
          row.classList.remove('selected');
          selectedRow = null;
          bottomBar.classList.remove('expanded');
          bottomBarSelectText.textContent = 'Select a Shipment';
          bottomTabs.forEach(t => t.classList.remove('active'));
        }
      }
    });
  });
}
initRowSelection();

// Bottom tab switching
bottomTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (!bottomBar.classList.contains('expanded')) return;
    activateBottomTab(tab.dataset.tab);
  });
});

// ========================================
// Bottom bar — Fullscreen toggle & Close
// ========================================
const bottomBarFullscreenBtn = document.getElementById('bottomBarFullscreen');
const bottomBarCloseBtn = document.getElementById('bottomBarClose');

bottomBarFullscreenBtn.addEventListener('click', () => {
  if (!bottomBar.classList.contains('expanded')) return;
  bottomBar.classList.toggle('fullscreen');
});

bottomBarCloseBtn.addEventListener('click', () => {
  bottomBar.classList.remove('expanded', 'fullscreen');
  if (selectedRow) {
    selectedRow.classList.remove('selected');
    const cb = selectedRow.querySelector('.row-checkbox');
    if (cb) cb.checked = false;
    selectedRow = null;
  }
  bottomBarSelectText.textContent = 'Select a Shipment';
  bottomTabs.forEach(t => t.classList.remove('active'));
});

// ========================================
// Product tab — expand/collapse order lines
// ========================================
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.product-expand-btn');
  if (!btn) return;
  const group = btn.dataset.group;
  const children = document.querySelectorAll('.product-row.child[data-order-group="' + group + '"]');
  const isExpanded = btn.classList.contains('expanded');

  children.forEach(row => row.classList.toggle('hidden', isExpanded));
  btn.classList.toggle('expanded', !isExpanded);
  btn.textContent = isExpanded ? '+' : '\u2212';
});

// Instruction group toggle (event delegation)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.instruction-toggle');
  if (!btn) return;
  const group = btn.dataset.instructionGroup;
  const list = document.querySelector('.instruction-list[data-instruction-group="' + group + '"]');
  if (!list) return;
  const isExpanded = btn.classList.contains('expanded');
  list.classList.toggle('collapsed', isExpanded);
  btn.classList.toggle('expanded', !isExpanded);
  btn.innerHTML = isExpanded ? '+' : '&minus;';
});

// ========================================
// Cost Allocation — sub-tab switching
// ========================================
document.querySelectorAll('.cost-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cost-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.cost-tab-view').forEach(v => v.classList.remove('active'));
    const target = tab.dataset.costTab === 'planned'
      ? document.getElementById('costPlanned')
      : document.getElementById('costCompleted');
    if (target) target.classList.add('active');
  });
});

// ========================================
// Routing guide — selectable rows
// ========================================
document.querySelectorAll('.routing-row').forEach(row => {
  row.addEventListener('click', () => {
    document.querySelectorAll('.routing-row').forEach(r => r.classList.remove('selected'));
    document.querySelectorAll('.routing-radio').forEach(r => r.checked = false);
    row.classList.add('selected');
    const radio = row.querySelector('.routing-radio');
    if (radio) radio.checked = true;
  });
});

// ========================================
// Documents tab — upload modal & delete
// ========================================
const docsModalOverlay = document.getElementById('docsModalOverlay');
const docsUploadBtn = document.getElementById('docsUploadBtn');
const docsModalClose = document.getElementById('docsModalClose');
const docUploadCancel = document.getElementById('docUploadCancel');
const docUploadSubmit = document.getElementById('docUploadSubmit');

function openDocsModal() {
  // Auto-expand to fullscreen before showing modal
  if (bottomBar.classList.contains('expanded') && !bottomBar.classList.contains('fullscreen')) {
    bottomBar.classList.add('fullscreen');
    setTimeout(() => { docsModalOverlay.classList.add('open'); }, 350);
  } else {
    docsModalOverlay.classList.add('open');
  }
}
function closeDocsModal() {
  docsModalOverlay.classList.remove('open');
  document.getElementById('docTypeSelect').value = 'BoL';
  document.getElementById('docFileInput').value = '';
  document.getElementById('docDescInput').value = '';
}

docsUploadBtn.addEventListener('click', openDocsModal);
docsModalClose.addEventListener('click', closeDocsModal);
docUploadCancel.addEventListener('click', closeDocsModal);
docsModalOverlay.addEventListener('click', (e) => {
  if (e.target === docsModalOverlay) closeDocsModal();
});

docUploadSubmit.addEventListener('click', () => {
  const type = document.getElementById('docTypeSelect').value;
  const fileInput = document.getElementById('docFileInput');
  const desc = document.getElementById('docDescInput').value.trim();
  const fileName = fileInput.files.length ? fileInput.files[0].name : '';
  if (!fileName) return;

  const badgeClass = type.toLowerCase().replace(' ', '');
  const tbody = document.querySelector('#docsTable tbody');
  const tr = document.createElement('tr');
  tr.innerHTML =
    '<td><span class="doc-type-badge ' + badgeClass + '">' + type + '</span></td>' +
    '<td>' + (desc || fileName) + '</td>' +
    '<td><a class="doc-file-link" href="#" target="_blank">' + fileName + '</a></td>' +
    '<td class="col-doc-actions"><button class="doc-delete-btn" aria-label="Delete document"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.33 4V2.67a.67.67 0 01.67-.67h4a.67.67 0 01.67.67V4M6.67 7.33v4M9.33 7.33v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3.33 4l.67 9.33a1.33 1.33 0 001.33 1.34h5.34a1.33 1.33 0 001.33-1.34L12.67 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></td>';
  tbody.appendChild(tr);
  closeDocsModal();
});

// Delete documents (event delegation)
document.addEventListener('click', (e) => {
  const delBtn = e.target.closest('.doc-delete-btn');
  if (!delBtn) return;
  const row = delBtn.closest('tr');
  if (row) row.remove();
});

// ========================================
// Notes tab — add, edit, delete
// ========================================
const notesList = document.getElementById('notesList');
const notesTextarea = document.getElementById('notesTextarea');
const notesAddBtn = document.getElementById('notesAddBtn');
let noteIdCounter = 100;

function formatNoteDate() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return mm + '/' + dd + '/' + yyyy + ' ' + hh + ':' + min + ' CST';
}

function createNoteHTML(id, text) {
  return '<div class="note-header">' +
    '<div class="notes-avatar">AC</div>' +
    '<div class="note-meta">' +
      '<span class="note-author">Amy Cook</span>' +
      '<span class="note-date">' + formatNoteDate() + '</span>' +
    '</div>' +
    '<div class="note-actions">' +
      '<button class="note-action-btn note-edit-btn" aria-label="Edit note"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button class="note-action-btn note-delete-btn" aria-label="Delete note"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.33 4V2.67a.67.67 0 01.67-.67h4a.67.67 0 01.67.67V4M6.67 7.33v4M9.33 7.33v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3.33 4l.67 9.33a1.33 1.33 0 001.33 1.34h5.34a1.33 1.33 0 001.33-1.34L12.67 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '</div>' +
  '</div>' +
  '<div class="note-body">' + text + '</div>';
}

// Add note
notesAddBtn.addEventListener('click', () => {
  const text = notesTextarea.value.trim();
  if (!text) return;
  const noteEl = document.createElement('div');
  noteEl.className = 'note-item';
  noteEl.dataset.noteId = 'n' + (noteIdCounter++);
  noteEl.innerHTML = createNoteHTML(noteEl.dataset.noteId, text);
  notesList.insertBefore(noteEl, notesList.firstChild);
  notesTextarea.value = '';
});

// Delete note (event delegation)
document.addEventListener('click', (e) => {
  const delBtn = e.target.closest('.note-delete-btn');
  if (!delBtn) return;
  const noteItem = delBtn.closest('.note-item');
  if (noteItem) noteItem.remove();
});

// Edit note (event delegation)
document.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.note-edit-btn');
  if (!editBtn) return;
  const noteItem = editBtn.closest('.note-item');
  if (!noteItem || noteItem.classList.contains('editing')) return;

  const bodyEl = noteItem.querySelector('.note-body');
  const currentText = bodyEl.textContent;

  noteItem.classList.add('editing');

  const editArea = document.createElement('div');
  editArea.className = 'note-edit-area';
  editArea.innerHTML =
    '<textarea>' + currentText + '</textarea>' +
    '<div class="note-edit-actions">' +
      '<button class="filters-clear-btn note-cancel-edit">Cancel</button>' +
      '<button class="filters-apply-btn note-save-edit">Save</button>' +
    '</div>';
  noteItem.appendChild(editArea);

  const textarea = editArea.querySelector('textarea');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  editArea.querySelector('.note-save-edit').addEventListener('click', () => {
    const newText = textarea.value.trim();
    if (newText) bodyEl.textContent = newText;
    noteItem.classList.remove('editing');
    editArea.remove();
  });

  editArea.querySelector('.note-cancel-edit').addEventListener('click', () => {
    noteItem.classList.remove('editing');
    editArea.remove();
  });
});
