/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#a60083', // 主色
        'primary-dark': '#800065', // 深色變體
        'primary-light': '#cc00a1', // 淺色變體
        secondary: '#9F7FBA', // 蘭色
        'secondary-dark': '#8668A4',
        'secondary-light': '#B79ACB',
        'muted': '#F5F3F7', // 背景色
        'surface': '#FFFFFF', // 表面色
        'text': {
          primary: '#2D2A2E', // 主要文字
          secondary: '#666366', // 次要文字
        },
        'status': {
          'available': {
            'bg': '#ECFDF5',    // 淺綠背景
            'text': '#047857',   // 深綠文字
            'border': '#6EE7B7'  // 中綠邊框
          },
          'maintenance': {
            'bg': '#FEF3C7',    // 淺黃背景
            'text': '#92400E',   // 深黃文字
            'border': '#FCD34D'  // 中黃邊框
          },
          'limited': {
            'bg': '#FEE2E2',    // 淺紅背景
            'text': '#B91C1C',   // 深紅文字
            'border': '#FCA5A5'  // 中紅邊框
          }
        }
      },
    },
  },
  plugins: [],
} 