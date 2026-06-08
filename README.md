# Car fundraising landing page

Сторінка на Alpine.js з даними з Google Sheets.

## Джерело даних

Google Sheet ID вже прописаний в `main.js`:
`1IvyMANxV3IXFEdv3bua50zqwJBO9sxZhCFDkaNRUJJc`

Сторінка читає:

- тексти тільки з вкладки `Texts`;
- пожертви тільки з вкладки `Donations`.

## Структура вкладки Donations

Перший рядок має бути:

`Date | Amount | Payment System | Country`

На сайті для останніх пожертв показуються тільки:

`Дата | Сума | Звідки пожертва`

Тобто джерело пожертви береться з колонки `Country`.

## Важливо

Таблиця має бути доступна для перегляду за посиланням:
`Share → Anyone with the link → Viewer`.

Дані оновлюються автоматично раз на 60 секунд.
