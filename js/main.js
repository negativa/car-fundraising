const FUNDRAISING_CONFIG = {
  // Ціль збору в доларах США.
  goalAmount: 20000,

  // Таблиця має бути доступна для перегляду.
  googleSheetId: '1IvyMANxV3IXFEdv3bua50zqwJBO9sxZhCFDkaNRUJJc',

  // Вкладка з донатами: Дата | Сума, $ | платіжна система | Країна
  supportersSheetName: 'Supporters',
  supportersSheetGid: '',
  supportersCsvUrl: '',

  // Вкладка з текстами: Опис
  contentSheetName: 'Опис',
  contentSheetGid: '',
  contentCsvUrl: '',
};

const DEFAULT_CONTENT = {
  eyebrow: '🚐 Збір на новий автомобіль',
  heroTitle: 'Надійний транспорт для великої сімʼї та служіння',
  mainTitle: 'Надійний транспорт для великої сімʼї',
  heroParagraph: 'Старий мікроавтобус багато років возив дітей, команду, допомогу та людей. Тепер через критичну корозію й постійні поломки він став ризиком у дорозі. Ми збираємо на безпечний автомобіль для служіння в Підгайному, навколишніх селах і Кухарях.',
  oldPhotoCaption: 'Старий Chrysler Grand Voyager 2007р',
  targetPhotoCaption: 'Новий Chrysler Pacifica 2020р',
  useTitle: 'Для чого потрібен новий автомобіль',
  useDesc: 'Надійний транспорт потрібен не для зручності, а для того, щоб служіння могло продовжуватися без зривів і ризику на дорозі.',
  useItems: [
    'Підвіз дітей на біблійні уроки та інші зустрічі.',
    'Поїздки команди служіння в Підгайне та навколишні села.',
    'Відвідування людей, доставка допомоги та участь у подіях.',
    'Безпечніші та спокійніші поїздки без постійних ремонтів.',
  ],
  dangerTitle: 'Чому старий вже небезпечний',
  dangerDesc: 'Стан авто вже не дозволяє покладатися на нього для регулярних поїздок.',
  dangerItems: [
    'Критична корозія арок, порогів і нижньої частини кузова.',
    'Періодичні поломки та вимушені ремонти в дорозі.',
    'Ризик, що авто не витримає навантаження під час служіння.',
    'Ремонт уже не вирішує проблему комплексно.',
  ],
};

const GALLERY_PHOTOS = [
  { src: 'assets/service-side.jpg', caption: 'Стан кузова та арок' },
  { src: 'assets/breakdown-bridge.jpg', caption: 'Зупинка в дорозі' },
  { src: 'assets/road-tow.jpg', caption: 'Ще один виїзд' },
  { src: 'assets/rust-wheelarch.jpg', caption: 'Корозія арки' },
  { src: 'assets/rust-close-1.jpg', caption: 'Пороги та низ кузова' },
  { src: 'assets/rust-close-2.jpg', caption: 'Сильна корозія' },
];

function cloneContent() {
  return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
}

document.addEventListener('alpine:init', () => {
  Alpine.data('fundraisingPage', () => ({
    raised: 0,
    goal: FUNDRAISING_CONFIG.goalAmount,
    updated: '—',
    supporters: 0,
    sheetStatus: 'Завантаження даних...',
    donations: [],
    content: cloneContent(),
    galleryPhotos: GALLERY_PHOTOS,
    activePayment: 'mono',
    toastMessage: 'Скопійовано',
    toastVisible: false,
    imageModalOpen: false,
    activeImage: { src: '', caption: '' },
    circumference: 2 * Math.PI * 52,

    init() {
      this.loadSupporters();
      this.loadContent();
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

    get visibleDonations() {
      return [...this.donations].reverse();
    },

    fmtCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value) || 0);
    },

    fmtDonationAmount(donation) {
      const amount = Number(donation.amount) || 0;
      const currency = String(donation.currency || 'USD').toUpperCase();
      if (currency === 'EUR') return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
      if (currency === 'UAH') return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(amount);
      return this.fmtCurrency(amount);
    },

    shortDate(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
      if (!match) return raw || '—';
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3].slice(-2);
      return `${day}.${month}.${year}`;
    },

    showToast(text = 'Скопійовано') {
      this.toastMessage = text;
      this.toastVisible = true;
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => { this.toastVisible = false; }, 1800);
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

    buildSheetUrl({ directUrl = '', sheetName = '', gid = '' } = {}) {
      if (directUrl) return directUrl;
      if (!FUNDRAISING_CONFIG.googleSheetId) return '';
      const id = FUNDRAISING_CONFIG.googleSheetId;
      if (gid) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}`;
      if (sheetName) return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      return '';
    },

    parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];

        if (ch === '"') {
          if (inQuotes && next === '"') {
            cell += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          row.push(cell.trim());
          cell = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          if (ch === '\r' && next === '\n') i += 1;
          row.push(cell.trim());
          if (row.some(value => value !== '')) rows.push(row);
          row = [];
          cell = '';
        } else {
          cell += ch;
        }
      }

      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      return rows;
    },

    normalizeHeader(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[ʼ'’`]/g, '')
        .trim();
    },

    findColumn(headers, variants) {
      const normalized = headers.map(header => this.normalizeHeader(header));
      return normalized.findIndex(header => variants.some(variant => header.includes(variant)));
    },

    parseAmountWithCurrency(raw) {
      if (raw == null) return { amount: Number.NaN, currency: 'USD' };
      const original = String(raw);
      let currency = 'USD';
      if (/€|eur/i.test(original)) currency = 'EUR';
      if (/₴|uah|грн/i.test(original)) currency = 'UAH';

      let value = original
        .replace(/\u00A0/g, ' ')
        .replace(/usd|eur|uah|дол|долар|грн|\$|€|₴/gi, '')
        .replace(/[^\d,.-]/g, '')
        .trim();

      if (!value) return { amount: Number.NaN, currency };

      const hasComma = value.includes(',');
      const hasDot = value.includes('.');

      if (hasComma && hasDot) {
        value = value.replace(/,/g, '');
      } else if (hasComma) {
        const parts = value.split(',');
        const last = parts[parts.length - 1];
        if (last.length <= 2) value = parts.slice(0, -1).join('').replace(/,/g, '') + '.' + last;
        else value = value.replace(/,/g, '');
      }

      return { amount: Number(value), currency };
    },

    async fetchCsv(url) {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Не вдалося завантажити CSV: ${response.status}`);
      return response.text();
    },

    async loadSupporters() {
      const csvUrl = this.buildSheetUrl({
        directUrl: FUNDRAISING_CONFIG.supportersCsvUrl,
        sheetName: FUNDRAISING_CONFIG.supportersSheetName,
        gid: FUNDRAISING_CONFIG.supportersSheetGid,
      });

      if (!csvUrl) {
        this.sheetStatus = 'Google Таблицю ще не підключено';
        return;
      }

      try {
        const csv = await this.fetchCsv(csvUrl);
        const rows = this.parseCsv(csv);
        if (rows.length < 2) throw new Error('У вкладці Supporters немає рядків з донатами');

        const headers = rows[0];
        const dateIndex = this.findColumn(headers, ['дата', 'date']);
        const amountIndex = this.findColumn(headers, ['сума', 'amount']);
        const paymentIndex = this.findColumn(headers, ['платіж', 'платеж', 'payment', 'system', 'система']);
        const countryIndex = this.findColumn(headers, ['країна', 'краина', 'country', 'from']);
        const currencyIndex = this.findColumn(headers, ['валюта', 'currency']);

        const safeDateIndex = dateIndex >= 0 ? dateIndex : 0;
        const safeAmountIndex = amountIndex >= 0 ? amountIndex : 1;

        const donations = [];
        let total = 0;
        let lastDate = '';

        rows.slice(1).forEach((cols, index) => {
          const date = cols[safeDateIndex] || '';
          const amountInfo = this.parseAmountWithCurrency(cols[safeAmountIndex]);
          if (!Number.isFinite(amountInfo.amount)) return;

          const explicitCurrency = currencyIndex >= 0 ? String(cols[currencyIndex] || '').trim().toUpperCase() : '';
          const currency = explicitCurrency || amountInfo.currency || 'USD';
          const payment = paymentIndex >= 0 ? cols[paymentIndex] || '' : '';
          const country = countryIndex >= 0 ? cols[countryIndex] || '' : '';

          donations.push({
            id: `${index}-${date}-${amountInfo.amount}-${payment}-${country}`,
            date,
            amount: amountInfo.amount,
            currency,
            payment,
            country,
          });

          // Збір ведеться в доларах. Якщо суми в таблиці без валюти — вони рахуються як USD.
          total += amountInfo.amount;
          if (date) lastDate = date;
        });

        this.donations = donations;
        this.raised = total;
        this.goal = FUNDRAISING_CONFIG.goalAmount;
        this.updated = lastDate || '—';
        this.supporters = donations.length;
        this.sheetStatus = 'Дані оновлено з Google Таблиці';
      } catch (error) {
        console.error(error);
        this.donations = [];
        this.raised = 0;
        this.updated = '—';
        this.supporters = 0;
        this.sheetStatus = 'Не вдалося зчитати вкладку Supporters';
      }
    },

    async loadContent() {
      const csvUrl = this.buildSheetUrl({
        directUrl: FUNDRAISING_CONFIG.contentCsvUrl,
        sheetName: FUNDRAISING_CONFIG.contentSheetName,
        gid: FUNDRAISING_CONFIG.contentSheetGid,
      });

      if (!csvUrl) return;

      try {
        const csv = await this.fetchCsv(csvUrl);
        const rows = this.parseCsv(csv);
        this.applyContentRows(rows);
      } catch (error) {
        console.warn('Не вдалося зчитати вкладку Опис:', error);
      }
    },

    applyContentRows(rows) {
      const next = cloneContent();
      next.useItems = [];
      next.dangerItems = [];
      let leftTitleSet = false;
      let rightTitleSet = false;
      let leftDescSet = false;
      let rightDescSet = false;

      const setDirect = (key, value) => {
        const k = this.normalizeHeader(key);
        if (!value) return true;
        const map = {
          herotitle: 'heroTitle',
          maintitle: 'mainTitle',
          heroparagraph: 'heroParagraph',
          paragraph: 'heroParagraph',
          eyebrow: 'eyebrow',
          oldphotocaption: 'oldPhotoCaption',
          targetphotocaption: 'targetPhotoCaption',
          usetitle: 'useTitle',
          usedesc: 'useDesc',
          dangertitle: 'dangerTitle',
          dangerdesc: 'dangerDesc',
        };
        if (map[k]) {
          next[map[k]] = value;
          return true;
        }
        return false;
      };

      const processPair = (rawKey, rawValue, side) => {
        const key = this.normalizeHeader(rawKey);
        const value = String(rawValue || '').trim();
        if (!key || !value) return;
        if (setDirect(rawKey, value)) return;

        const isLeft = side === 'left';
        if (['header', 'заголовок', 'головнийзаголовок'].includes(key)) {
          next.heroTitle = value;
          next.mainTitle = value;
          return;
        }
        if (['paragraph', 'параграф', 'текст', 'опис'].includes(key)) {
          next.heroParagraph = value;
          return;
        }
        if (['title', 'назва'].includes(key)) {
          if (isLeft) {
            if (!leftTitleSet) next.useTitle = value;
            leftTitleSet = true;
          } else {
            if (!rightTitleSet) next.dangerTitle = value;
            rightTitleSet = true;
          }
          return;
        }
        if (['desc', 'description', 'описблоку'].includes(key)) {
          if (isLeft) {
            if (!leftDescSet) next.useDesc = value;
            leftDescSet = true;
          } else {
            if (!rightDescSet) next.dangerDesc = value;
            rightDescSet = true;
          }
          return;
        }
        if (['item', 'пункт'].includes(key)) {
          if (isLeft) next.useItems.push(value);
          else next.dangerItems.push(value);
        }
      };

      rows.forEach(cols => {
        processPair(cols[0], cols[1], 'left');
        processPair(cols[2], cols[3], 'right');
      });

      if (next.useItems.length === 0) next.useItems = [...DEFAULT_CONTENT.useItems];
      if (next.dangerItems.length === 0) next.dangerItems = [...DEFAULT_CONTENT.dangerItems];
      this.content = next;
    },
  }));
});
