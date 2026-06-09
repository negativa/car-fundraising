/**
 * Configuration file for fundraiser page
 */

const CONFIG = {
  // Google Sheets ID for data
  SHEET_ID: '1IvyMANxV3IXFEdv3bua50zqwJBO9sxZhCFDkaNRUJJc',

  // Fundraiser goal amount in dollars
  GOAL: 20000,

  // Recent donations limit (how many to show)
  RECENT_DONATIONS_LIMIT: 8,

  // Data refresh interval in milliseconds (60000 = 1 minute)
  REFRESH_INTERVAL: 60000,

  // Sheet fetch timeout in milliseconds
  SHEET_FETCH_TIMEOUT: 12000,

  // Local storage keys
  STORAGE_KEYS: {
    LANG: 'fundraiser_lang',
    THEME: 'fundraiser_theme'
  },

  // Default language
  DEFAULT_LANG: 'ua',

  // Default theme
  DEFAULT_THEME: 'light',

  // Supported languages
  SUPPORTED_LANGS: ['ua', 'en'],

  // Gallery images
  GALLERY_IMAGES: [
    'assets/old-minivan/old-minivan-01.jpg',
    'assets/old-minivan/old-minivan-02.jpg',
    'assets/old-minivan/old-minivan-03.jpg',
    'assets/old-minivan/old-minivan-04.jpg',
    'assets/old-minivan/old-minivan-05.jpg',
    'assets/old-minivan/old-minivan-06.jpg',
    'assets/old-minivan/old-minivan-07.jpg',
    'assets/old-minivan/old-minivan-08.jpg',
    'assets/old-minivan/old-minivan-09.jpg',
    'assets/old-minivan/old-minivan-10.jpg',
    'assets/old-minivan/old-minivan-11.jpg',
    'assets/old-minivan/old-minivan-12.jpg',
    'assets/old-minivan/old-minivan-13.jpg',
    'assets/old-minivan/old-minivan-14.jpg',
    'assets/old-minivan/old-minivan-15.jpg',
    'assets/old-minivan/old-minivan-16.jpg',
    'assets/old-minivan/old-minivan-17.jpg'
  ]
};
