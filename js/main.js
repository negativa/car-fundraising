
function fundraiserPage() {
  return {
    sheetId: '1IvyMANxV3IXFEdv3bua50zqwJBO9sxZhCFDkaNRUJJc',
    loading: true,
    error: '',
    lang: localStorage.getItem('fundraiser_lang') || 'ua',
    theme: localStorage.getItem('fundraiser_theme') || 'light',
    textsByLang: { ua: {}, en: {} },
    contentByLang: {
      ua: { need: { title: '', desc: '', items: [] }, risk: { title: '', desc: '', items: [] } },
      en: { need: { title: '', desc: '', items: [] }, risk: { title: '', desc: '', items: [] } }
    },
    donations: [],
    goal: 35000,

    uiText: {
      ua: {
        dateLabel: 'Дата',
        amountLabel: 'Сума, $',
        sourceLabel: 'Звідки пожертва',
        progressLabel: 'зібрано',
        raisedLabel: 'зібрано',
        goalLabel: 'ціль',
        donorsLabel: 'благодійників',
        donateButton: 'Підтримати збір',
        shareButton: 'Поділитися',
        donationsTitle: 'Останні пожертви',
        loading: 'Завантажуємо дані...',
        copied: 'Посилання скопійовано',
        themeToggle: 'Перемкнути тему',
        heroKicker: 'Збір на транспорт',
        familyKicker: 'Наша сімʼя',
        familyTitle: 'Наша сімʼя',
        thanks: 'Дякуємо за вашу підтримку та молитви!',
        paymentTitle: 'Реквізити для підтримки',
        paymentSubtitle: 'Оберіть зручний спосіб переказу. Деталі можна змінювати у вкладці Texts.',
        monoTitle: 'mono банка',
        monoDetails: 'Посилання на банку або номер картки можна додати у полі monodetails_ua.',
        paypalTitle: 'PayPal',
        paypalDetails: 'PayPal-посилання або email можна додати у полі paypaldetails_ua.',
        sepaTitle: 'Єврова карта / SEPA',
        sepaDetails: 'IBAN, отримувач та призначення платежу можна додати у полі sepadetails_ua.',
        swiftTitle: 'Доларова карта / SWIFT',
        swiftDetails: 'SWIFT-реквізити для доларового переказу можна додати у полі swiftdetails_ua.'
      },
      en: {
        dateLabel: 'Date',
        amountLabel: 'Amount, $',
        sourceLabel: 'Donation source',
        progressLabel: 'funded',
        raisedLabel: 'raised',
        goalLabel: 'goal',
        donorsLabel: 'donors',
        donateButton: 'Donate now',
        shareButton: 'Share',
        donationsTitle: 'Latest donations',
        loading: 'Loading data...',
        copied: 'Link copied',
        themeToggle: 'Toggle theme',
        heroKicker: 'Transport fundraiser',
        familyKicker: 'Our family',
        familyTitle: 'Our family',
        thanks: 'Thank you for your support and prayers!',
        paymentTitle: 'Donation details',
        paymentSubtitle: 'Choose a convenient transfer method. You can edit the details in the Texts sheet.',
        monoTitle: 'mono jar',
        monoDetails: 'Add the mono jar link or card number in monodetails_en.',
        paypalTitle: 'PayPal',
        paypalDetails: 'Add a PayPal link or email in paypaldetails_en.',
        sepaTitle: 'Euro card / SEPA',
        sepaDetails: 'Add IBAN, recipient and payment purpose in sepadetails_en.',
        swiftTitle: 'Dollar card / SWIFT',
        swiftDetails: 'Add SWIFT details for USD transfers in swiftdetails_en.'
      }
    },

    async init() {
      await this.loadAll();
      setInterval(() => this.loadAll(false), 60000);
    },

    setLang(nextLang) {
      this.lang = nextLang === 'en' ? 'en' : 'ua';
      localStorage.setItem('fundraiser_lang', this.lang);
      document.documentElement.lang = this.lang === 'en' ? 'en' : 'uk';
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fundraiser_theme', this.theme);
    },

    ui(key) {
      return this.text(key, this.uiText[this.lang]?.[key] || this.uiText.ua[key] || '');
    },

    text(key, fallback = '') {
      return this.textsByLang[this.lang]?.[key] || this.textsByLang.ua?.[key] || fallback;
    },

    get content() {
      const current = this.contentByLang[this.lang] || this.contentByLang.ua;
      return {
        need: {
          title: current.need.title || this.contentByLang.ua.need.title,
          desc: current.need.desc || this.contentByLang.ua.need.desc,
          items: current.need.items.length ? current.need.items : this.contentByLang.ua.need.items
        },
        risk: {
          title: current.risk.title || this.contentByLang.ua.risk.title,
          desc: current.risk.desc || this.contentByLang.ua.risk.desc,
          items: current.risk.items.length ? current.risk.items : this.contentByLang.ua.risk.items
        }
      };
    },

    get totalRaised() {
      return this.donations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    },

    get donorCount() {
      return this.donations.length;
    },

    get progress() {
      return this.goal ? Math.min(100, Math.round((this.totalRaised / this.goal) * 100)) : 0;
    },

    get recentDonations() {
      return [...this.donations]
        .sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date))
        .slice(0, 8)
        .map(item => ({
          ...item,
          source: item[`source_${this.lang}`] || item.source_ua || item.source_en || item.source || ''
        }));
    },

    async loadAll(showLoading = true) {
      if (showLoading) this.loading = true;
      this.error = '';

      try {
        const textsData = await this.fetchSheet('Texts', { withHeaderRow: false });
        const donationsData = await this.fetchSheet('Donations', { withHeaderRow: true });

        const parsedTexts = this.parseContent(textsData.rows || []);
        this.textsByLang = parsedTexts.textsByLang;
        this.contentByLang = parsedTexts.contentByLang;
        this.goal = parsedTexts.goal || this.goal;

        this.donations = this.parseDonations(donationsData.rows || [], donationsData.headers || []);
      } catch (e) {
        console.error(e);
        this.error = this.lang === 'en'
          ? 'Could not load data from Google Sheets. Check sharing access and tab names “Texts” and “Donations”.'
          : 'Не вдалося завантажити дані з Google Таблиці. Перевірте доступ до таблиці та назви вкладок “Texts” і “Donations”.';
      } finally {
        this.loading = false;
      }
    },

    fetchSheet(sheetName, { withHeaderRow = false } = {}) {
      return new Promise((resolve, reject) => {
        const cb = '__sheet_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const script = document.createElement('script');
        const params = [
          'tqx=' + encodeURIComponent('out:json;responseHandler:' + cb),
          'sheet=' + encodeURIComponent(sheetName),
          'tq=' + encodeURIComponent('select *'),
          '_=' + Date.now()
        ];
        if (!withHeaderRow) params.push('headers=0');

        const timeout = setTimeout(() => cleanup(() => reject(new Error('timeout'))), 12000);
        const cleanup = (done) => {
          clearTimeout(timeout);
          try { delete window[cb]; } catch (e) { window[cb] = undefined; }
          script.remove();
          done && done();
        };

        window[cb] = (json) => {
          cleanup(() => {
            if (!json || json.status === 'error') {
              return reject(new Error(json?.errors?.[0]?.detailed_message || 'sheet error'));
            }

            const cellToText = (cell) => {
              if (!cell) return '';
              if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
              if (cell.v === undefined || cell.v === null) return '';
              return String(cell.v).trim();
            };

            const rows = (json.table?.rows || []).map(row => (row.c || []).map(cellToText));
            const headers = withHeaderRow
              ? (json.table?.cols || []).map(col => String(col?.label || '').trim())
              : [];

            resolve({ headers, rows });
          });
        };

        script.onerror = () => cleanup(() => reject(new Error('network')));
        script.src = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?${params.join('&')}`;
        document.head.appendChild(script);
      });
    },

    parseContent(rows) {
      const result = {
        textsByLang: { ua: {}, en: {} },
        contentByLang: {
          ua: { need: { title: '', desc: '', items: [] }, risk: { title: '', desc: '', items: [] } },
          en: { need: { title: '', desc: '', items: [] }, risk: { title: '', desc: '', items: [] } }
        },
        goal: 0
      };

      const normalize = (key) => String(key || '').trim();
      const splitKey = (rawKey) => {
        const key = normalize(rawKey);
        const match = key.match(/^(.*)_(ua|en)$/i);
        if (match) return { base: match[1].toLowerCase(), lang: match[2].toLowerCase() };
        return { base: key.toLowerCase(), lang: 'ua' };
      };

      const applyEntry = (rawKey, value) => {
        const v = String(value || '').trim();
        if (!rawKey || !v) return;

        const { base, lang } = splitKey(rawKey);
        const targetLang = lang === 'en' ? 'en' : 'ua';

        if (['goal', 'target', 'ціль', 'цільова сума'].includes(base)) {
          result.goal = this.parseAmount(v);
          return;
        }

        if (base === 'header') result.textsByLang[targetLang].header = v;
        else if (base === 'paragraph') result.textsByLang[targetLang].paragraph = v;
        else if (base === 'title1') result.contentByLang[targetLang].need.title = v;
        else if (base === 'desc1') result.contentByLang[targetLang].need.desc = v;
        else if (base === 'item1') result.contentByLang[targetLang].need.items.push(v);
        else if (base === 'title2') result.contentByLang[targetLang].risk.title = v;
        else if (base === 'desc2') result.contentByLang[targetLang].risk.desc = v;
        else if (base === 'item2') result.contentByLang[targetLang].risk.items.push(v);
        else result.textsByLang[targetLang][base] = v;
      };

      rows.forEach((row) => {
        applyEntry(row[0], row[1]);
        applyEntry(row[2], row[3]);
      });

      return result;
    },

    parseDonations(rows, headers) {
      const normalizedHeaders = (headers || []).map(h => String(h || '').trim().toLowerCase());

      const findHeaderIndex = (variants, fallback) => {
        const idx = normalizedHeaders.findIndex((header) => variants.some(v => header === v || header.includes(v)));
        return idx >= 0 ? idx : fallback;
      };

      const dateIndex = findHeaderIndex(['date', 'дата'], 0);
      const amountIndex = findHeaderIndex(['amount', 'сума'], 1);
      const systemIndex = findHeaderIndex(['payment system', 'payment', 'платіжна система', 'платіж'], 2);
      const countryUaIndex = findHeaderIndex(['country_ua', 'країна', 'country ua'], 3);
      const countryEnIndex = findHeaderIndex(['country_en', 'country en'], 4);

      return (rows || [])
        .map((row) => ({
          date: String(row[dateIndex] || '').trim(),
          amount: this.parseAmount(row[amountIndex]),
          system: String(row[systemIndex] || '').trim(),
          source_ua: String(row[countryUaIndex] || '').trim(),
          source_en: String(row[countryEnIndex] || row[countryUaIndex] || '').trim()
        }))
        .filter(item => item.date && item.amount > 0)
        .sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date));
    },

    parseAmount(value) {
      return Number(String(value || '').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
    },

    dateValue(value) {
      const m = String(value || '').match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
      return m ? new Date(Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : 0;
    },

    formatMoney(value) {
      return '$' + Math.round(Number(value) || 0).toLocaleString('en-US');
    },

    formatNumber(value) {
      return '$' + Math.round(Number(value) || 0).toLocaleString('en-US');
    },

    async sharePage() {
      const data = {
        title: this.text('header', 'Збір на транспорт'),
        text: this.text('paragraph', 'Підтримайте збір.'),
        url: location.href
      };

      if (navigator.share) {
        await navigator.share(data).catch(() => {});
      } else {
        await navigator.clipboard?.writeText(location.href);
        alert(this.ui('copied'));
      }
    }
  };
}
