function fundraiserPage() {
      return {
        sheetId: '1IvyMANxV3IXFEdv3bua50zqwJBO9sxZhCFDkaNRUJJc',
        loading: true, error: '',
        texts: {}, content: { need: { items: [] }, risk: { items: [] } }, donations: [], goal: 35000,

        async init() {
          await this.loadAll();
          setInterval(() => this.loadAll(false), 60000);
        },
        text(key, fallback = '') { return this.texts[key] || fallback; },
        get totalRaised() { return this.donations.reduce((s, d) => s + (Number(d.amount) || 0), 0); },
        get donorCount() { return this.donations.length; },
        get progress() { return this.goal ? Math.min(100, Math.round(this.totalRaised / this.goal * 100)) : 0; },
        get recentDonations() { return [...this.donations].sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date)).slice(0, 8); },

        async loadAll(showLoading = true) {
          if (showLoading) this.loading = true;
          this.error = '';
          try {
            // Важливо: тексти беремо з вкладки Texts, а пожертви — тільки з вкладки Donations.
            // Це прибирає ситуацію, коли код випадково шукає донати в іншій вкладці.
            const textRows = await this.fetchSheet('Texts');
            const donationRows = await this.fetchSheet('Donations');

            const parsed = this.parseContent(textRows || []);
            this.texts = parsed.texts;
            this.content = parsed.content;
            this.goal = parsed.goal || this.goal;

            const parsedDonations = this.parseDonations(donationRows || []);
            this.donations = parsedDonations;

            if (!parsedDonations.length) {
              console.warn('Donations sheet was read, but no donation rows were recognized.', donationRows);
            }
          } catch (e) {
            console.error(e);
            this.error = 'Не вдалося завантажити дані з Google Таблиці. Перевірте, що таблиця відкрита для перегляду за посиланням, а вкладки називаються точно “Texts” і “Donations”.';
          } finally {
            this.loading = false;
          }
        },

        // Google Visualization через JSONP. Так працює стабільніше, ніж fetch(), бо Google часто блокує CORS.
        fetchSheet(sheetName = '') {
          return new Promise((resolve, reject) => {
            const cb = '__gsheet_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            const script = document.createElement('script');
            const params = [
              'tqx=' + encodeURIComponent('out:json;responseHandler:' + cb),
              'tq=' + encodeURIComponent('select *'),
              // headers=0 — перший рядок також повертається як дані.
              // Це потрібно, щоб код сам побачив заголовки Date / Amount / Payment System / Country.
              'headers=0',
              '_=' + Date.now()
            ];
            if (sheetName) params.push('sheet=' + encodeURIComponent(sheetName));
            const timeout = setTimeout(() => cleanup(() => reject(new Error('timeout'))), 12000);
            const cleanup = (done) => {
              clearTimeout(timeout);
              try { delete window[cb]; } catch (e) { window[cb] = undefined; }
              script.remove();
              done && done();
            };
            window[cb] = (json) => {
              cleanup(() => {
                if (!json || json.status === 'error') return reject(new Error(json?.errors?.[0]?.detailed_message || 'sheet error'));
                const cellToText = (c) => {
                  if (!c) return '';
                  if (c.f !== undefined && c.f !== null) return String(c.f).trim();
                  const v = c.v;
                  if (v === undefined || v === null) return '';
                  return String(v).trim();
                };
                const rows = (json.table?.rows || []).map(r => (r.c || []).map(cellToText));
                resolve(rows);
              });
            };
            script.onerror = () => cleanup(() => reject(new Error('network')));
            script.src = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?${params.join('&')}`;
            document.head.appendChild(script);
          });
        },

        parseContent(rows) {
          const result = {
            texts: {},
            content: { need: { title: '', desc: '', items: [] }, risk: { title: '', desc: '', items: [] } },
            goal: 0
          };
          const setText = (key, val) => {
            if (!key || !val) return;
            const k = String(key).trim().toLowerCase();
            const v = String(val).trim();
            if (!v) return;
            if (k === 'goal' || k === 'target' || k === 'ціль' || k === 'цільова сума') result.goal = this.parseAmount(v);
            else if (k === 'header') result.texts.header = v;
            else if (k === 'paragraph') result.texts.paragraph = v;
            else if (k === 'title1') result.content.need.title = v;
            else if (k === 'desc1') result.content.need.desc = v;
            else if (k === 'item1') result.content.need.items.push(v);
            else if (k === 'title2') result.content.risk.title = v;
            else if (k === 'desc2') result.content.risk.desc = v;
            else if (k === 'item2') result.content.risk.items.push(v);
            else result.texts[k] = v;
          };

          rows.forEach(r => {
            // Таблиця має пари ключ/значення: A→B і C→D.
            setText(r[0], r[1]);
            setText(r[2], r[3]);
          });
          return result;
        },

        parseDonations(rows) {
          const clean = (rows || []).filter(r => r.some(v => String(v || '').trim() !== ''));
          if (!clean.length) return [];

          // Вкладка Donations має колонки: Date / Amount / Payment System / Country.
          // Шукаємо рядок заголовків саме у цій вкладці.
          let hi = clean.findIndex(r => {
            const t = r.map(x => String(x || '').trim().toLowerCase()).join(' | ');
            return t.includes('date') && t.includes('amount');
          });

          let dateI = 0, amountI = 1, systemI = 2, sourceI = 3;
          if (hi >= 0) {
            const header = clean[hi].map(x => String(x || '').trim().toLowerCase());
            const find = (names, fallback) => {
              const i = header.findIndex(h => names.some(n => h.includes(n)));
              return i >= 0 ? i : fallback;
            };
            dateI = find(['date', 'дата'], 0);
            amountI = find(['amount', 'сума'], 1);
            systemI = find(['payment', 'system', 'платіж'], 2);
            sourceI = find(['country', 'країна', 'звідки', 'source'], 3);
          } else {
            // Якщо Google раптом не повернув рядок заголовків — вважаємо, що порядок колонок стандартний.
            hi = -1;
          }

          const dataRows = clean.slice(hi + 1);
          return dataRows.map(r => ({
            date: String(r[dateI] || '').trim(),
            amount: this.parseAmount(r[amountI]),
            system: String(r[systemI] || '').trim(),
            source: String(r[sourceI] || '').trim()
          }))
            .filter(d => d.date && d.amount > 0)
            .sort((a, b) => this.dateValue(b.date) - this.dateValue(a.date));
        },

        parseAmount(v) { return Number(String(v).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0; },
        dateValue(s) { const m = String(s).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/); return m ? new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]).getTime() : 0; },
        formatMoney(v) { return '$' + Math.round(Number(v) || 0).toLocaleString('en-US'); },
        formatNumber(v) { return '$' + Math.round(Number(v) || 0).toLocaleString('en-US'); },
        async sharePage() {
          const data = { title: this.text('header', 'Збір на транспорт'), text: this.text('paragraph', 'Підтримайте збір.'), url: location.href };
          if (navigator.share) await navigator.share(data).catch(() => { });
          else { await navigator.clipboard?.writeText(location.href); alert('Посилання скопійовано'); }
        }
      }
    }