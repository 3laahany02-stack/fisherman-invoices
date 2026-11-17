/**
 * دفتر حركة النقدية (مصروفي)
 * وارد • منصرف • بيان • رصيد الكاش
 */

const STORAGE_KEY = 'masroufi_cash_book_clean_v1';

// Default empty transactions (Start from Zero)
function getDefaultTransactions() {
  return [];
}

class CashBookApp {
  constructor() {
    this.transactions = [];
    this.activeType = 'out'; // 'out' (منصرف) or 'in' (وارد)
    this.filterPeriod = 'all'; // 'all', 'this_month', 'today'
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.loadData();
    this.setupTheme();
    this.bindEvents();
    this.render();
  }

  loadData() {
    try {
      // Clear old demo keys if user had previous demo data
      localStorage.removeItem('masroufi_cash_book_v2');
      localStorage.removeItem('masroufi_state_v1');

      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.transactions = JSON.parse(data);
      } else {
        this.transactions = [];
        this.saveData();
      }
    } catch (e) {
      console.error(e);
      this.transactions = [];
    }
  }
        this.transactions = JSON.parse(data);
      } else {
        this.transactions = getDefaultTransactions();
        this.saveData();
      }
    } catch (e) {
      console.error(e);
      this.transactions = getDefaultTransactions();
    }
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transactions));
    } catch (e) {
      console.error(e);
    }
  }

  setupTheme() {
    const saved = localStorage.getItem('masroufi_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeIcon(saved);
  }

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('masroufi_theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    const btn = document.getElementById('btn-toggle-theme');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  bindEvents() {
    // Theme
    document.getElementById('btn-toggle-theme').addEventListener('click', () => this.toggleTheme());

    // Type Selector Buttons (وارد / منصرف)
    const btnIn = document.getElementById('btn-type-in');
    const btnOut = document.getElementById('btn-type-out');

    btnIn.addEventListener('click', () => {
      this.activeType = 'in';
      btnIn.classList.add('active');
      btnOut.classList.remove('active');
      document.getElementById('entry-submit-btn').textContent = '+ تسجيل وارد';
      document.getElementById('entry-submit-btn').className = 'btn-submit btn-in';
    });

    btnOut.addEventListener('click', () => {
      this.activeType = 'out';
      btnOut.classList.add('active');
      btnIn.classList.remove('active');
      document.getElementById('entry-submit-btn').textContent = '- تسجيل منصرف';
      document.getElementById('entry-submit-btn').className = 'btn-submit btn-out';
    });

    // Form Submit
    document.getElementById('form-cash-entry').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddEntry();
    });

    // Set today date as default
    const dateInput = document.getElementById('input-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterPeriod = btn.dataset.period;
        this.render();
      });
    });

    // Search Input
    document.getElementById('input-search').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.render();
    });

    // Export Excel
    document.getElementById('btn-export-excel').addEventListener('click', () => this.exportExcel());

    // Reset Data
    document.getElementById('btn-reset-data').addEventListener('click', () => this.resetData());
  }

  handleAddEntry() {
    const amountInput = document.getElementById('input-amount');
    const noteInput = document.getElementById('input-note');
    const dateInput = document.getElementById('input-date');

    const amount = parseFloat(amountInput.value);
    const note = noteInput.value.trim();
    const date = dateInput.value || new Date().toISOString().split('T')[0];

    if (!amount || amount <= 0) {
      alert('يرجى كتابة مبلغ صحيح أكبر من الصفر');
      amountInput.focus();
      return;
    }

    if (!note) {
      alert('يرجى كتابة البيان (تفاصيل المصروف أو الإيراد)');
      noteInput.focus();
      return;
    }

    const entry = {
      id: Date.now().toString(),
      date,
      note,
      type: this.activeType,
      amount
    };

    this.transactions.push(entry);
    this.saveData();

    // Reset inputs
    amountInput.value = '';
    noteInput.value = '';
    amountInput.focus();

    this.render();
  }

  deleteEntry(id) {
    if (!confirm('هل تريد حذف هذه الحركة؟')) return;
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveData();
    this.render();
  }

  resetData() {
    if (!confirm('هل تريد تصفير دفتر النقدية بالكامل والبدء من الصفر؟')) return;
    this.transactions = [];
    this.saveData();
    this.render();
  }

  // Calculate Running Balances
  getProcessedTransactions() {
    // Sort chronologically ascending to calculate running balance accurately
    const sorted = [...this.transactions].sort((a, b) => {
      if (a.date === b.date) {
        return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
      }
      return a.date.localeCompare(b.date);
    });

    let currentBalance = 0;
    const withBalance = sorted.map((t, index) => {
      if (t.type === 'in') {
        currentBalance += t.amount;
      } else {
        currentBalance -= t.amount;
      }
      return {
        ...t,
        index: index + 1,
        runningBalance: currentBalance
      };
    });

    return withBalance;
  }

  // Filter transactions for display
  getFilteredTransactions(processed) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    return processed.filter(t => {
      const tDate = new Date(t.date);

      // Period filter
      if (this.filterPeriod === 'today') {
        if (t.date !== todayStr) return false;
      } else if (this.filterPeriod === 'this_month') {
        if (tDate.getFullYear() !== curYear || tDate.getMonth() !== curMonth) return false;
      }

      // Search query
      if (this.searchQuery) {
        const q = this.searchQuery;
        if (!t.note.toLowerCase().includes(q) && !t.date.includes(q) && !String(t.amount).includes(q)) {
          return false;
        }
      }

      return true;
    });
  }

  render() {
    const allProcessed = this.getProcessedTransactions();

    // Overall Totals
    const totalIn = allProcessed.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = allProcessed.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
    const currentBalance = totalIn - totalOut;

    // Update Header Cards
    const balEl = document.getElementById('stat-current-balance');
    const inEl = document.getElementById('stat-total-in');
    const outEl = document.getElementById('stat-total-out');

    if (balEl) {
      balEl.textContent = `${currentBalance.toLocaleString()} ج.م`;
      balEl.className = 'balance-val ' + (currentBalance >= 0 ? 'text-in' : 'text-out');
    }
    if (inEl) inEl.textContent = `${totalIn.toLocaleString()} ج.م`;
    if (outEl) outEl.textContent = `${totalOut.toLocaleString()} ج.م`;

    // Filtered entries for table (displayed in reverse order: newest first)
    const filtered = this.getFilteredTransactions(allProcessed);
    const displayList = [...filtered].reverse();

    const tbody = document.getElementById('table-body');
    const countBadge = document.getElementById('tx-count-badge');
    if (countBadge) countBadge.textContent = `${filtered.length} حركة`;

    if (displayList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 45px 20px; color: var(--text-muted);">
            <div style="font-size: 28px; margin-bottom: 8px;">💵</div>
            <div style="font-weight: 800; font-size: 15px; color: var(--text-main); margin-bottom: 4px;">دفتر النقدية فارغ حالياً (الرصيد: 0.00 ج.م)</div>
            <div style="font-size: 12px;">اكتب المبلغ والبيان بالأعلى واختر وارد أو منصرف لتسجيل أول حركة.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = displayList.map(t => {
      const isIn = t.type === 'in';
      return `
        <tr>
          <td style="text-align:center; color: var(--text-muted); font-size:12px;">${t.index}</td>
          <td style="white-space:nowrap; font-weight:600; font-size:13px;">${t.date}</td>
          <td style="font-weight:700; color: var(--text-main); font-size:14px;">${t.note}</td>
          <td style="text-align:left; font-weight:800; color: var(--color-in); font-size:14px;">
            ${isIn ? `+ ${t.amount.toLocaleString()} ج.م` : '-'}
          </td>
          <td style="text-align:left; font-weight:800; color: var(--color-out); font-size:14px;">
            ${!isIn ? `- ${t.amount.toLocaleString()} ج.م` : '-'}
          </td>
          <td style="text-align:left; font-weight:900; font-size:14px; direction:ltr; text-align:right;" class="${t.runningBalance >= 0 ? 'text-in' : 'text-out'}">
            ${t.runningBalance.toLocaleString()} ج.م
          </td>
          <td style="text-align:center;">
            <button class="btn-del" onclick="cashApp.deleteEntry('${t.id}')" title="حذف">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Export clean Cash Ledger to Excel
  exportExcel() {
    if (!window.XLSX) {
      alert('مكتبة الإكسيل غير متوفرة');
      return;
    }

    const processed = this.getProcessedTransactions();
    const rows = processed.map(t => ({
      'م': t.index,
      'التاريخ': t.date,
      'البيان': t.note,
      'وارد (ج.م)': t.type === 'in' ? t.amount : '',
      'منصرف (ج.م)': t.type === 'out' ? t.amount : '',
      'رصيد الخزينة اللحظي (ج.م)': t.runningBalance
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'دفتر حركة النقدية');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `دفتر_حركة_النقدية_وارد_ومنصرف_${today}.xlsx`);
  }
}

// Global Cash App Instance
let cashApp;
window.addEventListener('DOMContentLoaded', () => {
  cashApp = new CashBookApp();
});
