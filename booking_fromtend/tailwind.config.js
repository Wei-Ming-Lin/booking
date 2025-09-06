/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // 啟用 class 基礎的深色模式
  theme: {
    extend: {
      fontFamily: {
        'sans': [
          'Inter', 
          'SF Pro Display', 
          'Helvetica Neue', 
          'Arial', 
          'PingFang TC', 
          'Noto Sans TC', 
          'Microsoft JhengHei', 
          'sans-serif'
        ],
        'display': [
          'SF Pro Display',
          'Inter',
          'PingFang TC',
          'Noto Sans TC',
          'Microsoft JhengHei',
          'sans-serif'
        ],
        'mono': [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Roboto Mono',
          'monospace'
        ]
      },
      animation: {
        'liquid-flow': 'liquid-flow 8s ease-in-out infinite',
        'liquid-wave': 'liquid-wave 6s ease-in-out infinite',
        'glass-shimmer': 'glass-shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'twinkle-slow': 'twinkle 4s ease-in-out infinite',
        'twinkle-medium': 'twinkle 2.5s ease-in-out infinite',
        'twinkle-fast': 'twinkle 1.8s ease-in-out infinite',
      },
      keyframes: {
        'liquid-flow': {
          '0%, 100%': { transform: 'translateX(-10px) translateY(-5px) scale(1)', opacity: '0.3' },
          '50%': { transform: 'translateX(10px) translateY(5px) scale(1.1)', opacity: '0.5' },
        },
        'liquid-wave': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0.2' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)', opacity: '0.4' },
          '66%': { transform: 'translateY(4px) rotate(-1deg)', opacity: '0.3' },
        },
        'glass-shimmer': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { transform: 'translateX(0%)', opacity: '0.6' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(5px) rotate(-0.5deg)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0px)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '25%': { opacity: '0.8', transform: 'scale(1.2)' },
          '50%': { opacity: '1', transform: 'scale(1.5)' },
          '75%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
        'liquid': '20px',
        'heavy': '40px',
      },
      colors: {
        // 蘋果液態玻璃色彩系統
        'liquid': {
          'glass': {
            'light': 'rgba(255, 255, 255, 0.1)',
            'medium': 'rgba(255, 255, 255, 0.15)',
            'heavy': 'rgba(255, 255, 255, 0.25)',
            'dark-light': 'rgba(255, 255, 255, 0.05)',
            'dark-medium': 'rgba(255, 255, 255, 0.08)',
            'dark-heavy': 'rgba(255, 255, 255, 0.12)',
          },
          'surface': {
            'primary': 'rgba(255, 255, 255, 0.8)',
            'secondary': 'rgba(255, 255, 255, 0.6)',
            'tertiary': 'rgba(255, 255, 255, 0.4)',
            'dark-primary': 'rgba(15, 23, 42, 0.8)',
            'dark-secondary': 'rgba(30, 41, 59, 0.7)',
            'dark-tertiary': 'rgba(51, 65, 85, 0.6)',
          },
          'accent': {
            'blue': 'rgba(59, 130, 246, 0.1)',
            'purple': 'rgba(147, 51, 234, 0.1)',
            'pink': 'rgba(236, 72, 153, 0.1)',
            'amber': 'rgba(251, 191, 36, 0.1)',
            'emerald': 'rgba(16, 185, 129, 0.1)',
          }
        },
        primary: '#663399', // 北商紫色
        'primary-dark': '#4d2673',
        'primary-light': '#8A4FBF',
        secondary: '#AF52DE', // iOS 紫色
        'secondary-dark': '#8E44AD',
        'secondary-light': '#C77DFF',
        accent: '#FF9500', // iOS 橙色
        'accent-dark': '#E6750E',
        'accent-light': '#FFB84D',
        success: '#34C759', // iOS 綠色
        warning: '#FF9500', // iOS 橙色
        danger: '#FF3B30', // iOS 紅色
        'muted': '#F2F2F7', // iOS 背景色
        'surface': '#FFFFFF', // 表面色
        'text': {
          primary: '#1D1D1F', // 主要文字
          secondary: '#86868B', // 次要文字
          tertiary: '#C7C7CC', // 第三文字
        },
        // 深色模式專用顏色 (蘋果風格)
        'dark': {
          'bg': {
            'primary': '#000000',    // 純黑背景
            'secondary': '#1C1C1E',  // 深灰背景
            'tertiary': '#2C2C2E',   // 中灰背景
            'elevated': '#3A3A3C',   // 提升背景
          },
          'text': {
            'primary': '#FFFFFF',    // 純白文字
            'secondary': '#EBEBF5',  // 次要白文字
            'tertiary': '#EBEBF5',   // 第三文字
            'accent': '#007AFF',     // 藍色強調文字
            'accent-hover': '#0056b3', // 藍色強調文字懸停
          },
          'border': '#38383A',       // 深色邊框
          'accent': '#007AFF',       // 藍色強調色
          'accent-dark': '#0056b3',  // 深藍色
        },
        'status': {
          'available': {
            'bg': '#E8F5E8',    // 淺綠背景
            'text': '#1B5E20',   // 深綠文字
            'border': '#4CAF50',  // 綠色邊框
            'dark-bg': '#0D3818',    // 深色模式背景
            'dark-text': '#81C784',  // 深色模式文字
            'dark-border': '#4CAF50', // 深色模式邊框
          },
          'maintenance': {
            'bg': '#FFF3E0',    // 淺橙背景
            'text': '#E65100',   // 深橙文字
            'border': '#FF9500',  // 橙色邊框
            'dark-bg': '#3D1A00',    // 深色模式背景
            'dark-text': '#FFB74D',  // 深色模式文字
            'dark-border': '#FF9500', // 深色模式邊框
          },
          'limited': {
            'bg': '#FFEBEE',    // 淺紅背景
            'text': '#C62828',   // 深紅文字
            'border': '#FF3B30',  // 紅色邊框
            'dark-bg': '#380E0E',    // 深色模式背景
            'dark-text': '#EF5350',  // 深色模式文字
            'dark-border': '#FF3B30', // 深色模式邊框
          }
        }
      },
      boxShadow: {
        'liquid': '0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'liquid-hover': '0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'liquid-dark': '0 8px 32px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'liquid-dark-hover': '0 12px 40px rgba(0, 0, 0, 0.4), 0 6px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass': '0 4px 16px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.05)',
        'float': '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'liquid': '20px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      zIndex: {
        'liquid-bg': '-10',
        'liquid-content': '10',
        'liquid-overlay': '20',
      }
    },
  },
  plugins: [],
} 