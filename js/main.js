const FUNDRAISING_CONFIG = {
  // Сума збору в доларах США. Змініть ціль тут.
  goalAmount: 20000,

  // Google Таблиця має бути доступна для перегляду й мати два стовпці: дата, сума.
  // Приклад:
  // дата,сума
  // 22.05.2026,100
  // 23.05.2026,250.50
  googleSheetId: '1IvyMANxV3IXFEdv3bua50zqwJBO9sxZhCFDkaNRUJJc',
  googleSheetGid: '0',

  // Можна вставити пряме CSV-посилання замість googleSheetId.
  googleSheetCsvUrl: '',
};

document.addEventListener('alpine:init', () => {
  Alpine.data('fundraisingPage', () => ({
    raised: 0,
    goal: FUNDRAISING_CONFIG.goalAmount,
    updated: '—',
    supporters: 0,
    sheetStatus: 'Завантаження даних...',
    activePayment: 'mono',
    toastMessage: 'Скопійовано',
    toastVisible: false,
    imageModalOpen: false,
    activeImage: {
      src: '',
      caption: '',
    },
    circumference: 2 * Math.PI * 52,

    init() {
      this.loadSheetData();
    },

    get percent() {
      const safeGoal = Number(this.goal) > 0 ? Number(this.goal) : 1;
      return Math.max(0, Math.min(100, (Number(this.raised) / safeGoal) * 100));
    },

    get percentRounded() {
      return Math.round(this.percent);
    },

    get progressOffset() {
      return this.circumference - (this.circumference * this.percent / 100);
    },

    get statusText() {
      if (this.percent >= 100) return 'Ціль досягнута';
      if (this.percent >= 75) return 'Майже біля цілі';
      if (this.percent >= 35) return 'Збір активно триває';
      return 'Триває збір';
    },

    fmtCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value) || 0);
    },

    showToast(text = 'Скопійовано') {
      this.toastMessage = text;
      this.toastVisible = true;
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        this.toastVisible = false;
      }, 1800);
    },

    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.showToast('Скопійовано');
      } catch (error) {
        this.showToast('Не вдалося скопіювати');
      }
    },

    openImage(src, caption = '') {
      this.activeImage = { src, caption };
      this.imageModalOpen = true;
      document.body.classList.add('modal-lock');
    },

    closeImage() {
      this.imageModalOpen = false;
      document.body.classList.remove('modal-lock');
    },

    buildCsvUrl() {
      if (FUNDRAISING_CONFIG.googleSheetCsvUrl) return FUNDRAISING_CONFIG.googleSheetCsvUrl;
      if (!FUNDRAISING_CONFIG.googleSheetId) return '';
      return `https://docs.google.com/spreadsheets/d/${FUNDRAISING_CONFIG.googleSheetId}/export?format=csv&gid=${FUNDRAISING_CONFIG.googleSheetGid}`;
    },

    parseCsvLine(line) {
      const out = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          out.push(current);
          current = '';
        } else {
          current += ch;
        }
      }

      out.push(current);
      return out.map(value => value.trim());
    },

    parseAmount(raw) {
      if (raw == null) return Number.NaN;

      let value = String(raw)
        .replace(/\u00A0/g, ' ')
        .replace(/usd|дол|долар|\$/gi, '')
        .replace(/[^\d,.-]/g, '')
        .trim();

      if (!value) return Number.NaN;

      const hasComma = value.includes(',');
      const hasDot = value.includes('.');

      if (hasComma && hasDot) {
        value = value.replace(/,/g, '');
      } else if (hasComma) {
        const commaParts = value.split(',');
        const last = commaParts[commaParts.length - 1];
        if (last.length <= 2) {
          value = commaParts.slice(0, -1).join('').replace(/,/g, '') + '.' + last;
        } else {
          value = value.replace(/,/g, '');
        }
      }

      return Number(value);
    },

    async loadSheetData() {
      const csvUrl = this.buildCsvUrl();

      if (!csvUrl) {
        this.raised = 0;
        this.goal = FUNDRAISING_CONFIG.goalAmount;
        this.updated = '—';
        this.supporters = 0;
        this.sheetStatus = 'Google Таблицю ще не підключено';
        return;
      }

      try {
        const response = await fetch(csvUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('Не вдалося завантажити CSV');

        const csv = await response.text();
        const rows = csv.split(/\r?\n/).map(row => row.trim()).filter(Boolean);
        const dataRows = rows.slice(1);

        let total = 0;
        let count = 0;
        let lastDate = '';

        dataRows.forEach(row => {
          const cols = this.parseCsvLine(row);
          if (cols.length < 2) return;

          const date = cols[0];
          const amount = this.parseAmount(cols[1]);
          if (!Number.isFinite(amount)) return;

          total += amount;
          count += 1;
          if (date) lastDate = date;
        });

        this.raised = total;
        this.goal = FUNDRAISING_CONFIG.goalAmount;
        this.updated = lastDate || '—';
        this.supporters = count;
        this.sheetStatus = 'Дані оновлено з Google Таблиці';
      } catch (error) {
        console.error(error);
        this.raised = 0;
        this.goal = FUNDRAISING_CONFIG.goalAmount;
        this.updated = '—';
        this.supporters = 0;
        this.sheetStatus = 'Не вдалося зчитати Google Таблицю';
      }
    },
  }));
});
