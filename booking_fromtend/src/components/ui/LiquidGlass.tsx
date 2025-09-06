'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LiquidGlassProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'medium' | 'heavy' | 'surface';
  effect?: 'static' | 'hover' | 'float' | 'pulse';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'liquid';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'liquid';
  animated?: boolean;
  shimmer?: boolean;
}

export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(({
  children,
  className,
  variant = 'medium',
  effect = 'static',
  borderRadius = 'liquid',
  shadow = 'liquid',
  animated = true,
  shimmer = false,
  ...props
}, ref) => {
  // 基礎玻璃效果類別
  const glassVariants = {
    light: 'bg-liquid-glass-light dark:bg-liquid-glass-dark-light backdrop-blur-md',
    medium: 'bg-liquid-glass-medium dark:bg-liquid-glass-dark-medium backdrop-blur-liquid',
    heavy: 'bg-liquid-glass-heavy dark:bg-liquid-glass-dark-heavy backdrop-blur-heavy',
    surface: 'bg-liquid-surface-secondary dark:bg-liquid-surface-dark-secondary backdrop-blur-xl',
  };

  // 互動效果類別
  const effectVariants = {
    static: '',
    hover: 'hover:bg-liquid-glass-heavy dark:hover:bg-liquid-glass-dark-heavy hover:shadow-liquid-hover dark:hover:shadow-liquid-dark-hover hover:scale-[1.02] transition-all duration-300 ease-out',
    float: 'animate-float hover:animate-pulse-soft',
    pulse: 'animate-pulse-soft hover:animate-liquid-flow',
  };

  // 邊框圓角類別
  const radiusVariants = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    liquid: 'rounded-liquid',
  };

  // 陰影類別
  const shadowVariants = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    liquid: 'shadow-liquid dark:shadow-liquid-dark',
  };

  return (
    <div
      ref={ref}
      className={cn(
        // 基礎樣式
        'relative border border-white/20 dark:border-white/10',
        // 玻璃效果
        glassVariants[variant],
        // 互動效果
        effectVariants[effect],
        // 邊框圓角
        radiusVariants[borderRadius],
        // 陰影
        shadowVariants[shadow],
        // 動畫
        animated && 'transition-all duration-300 ease-out',
        // 自定義類別
        className
      )}
      {...props}
    >
      {/* 背景動畫 - 僅深色模式星光點點 */}
      {animated && (
        <>
          {/* 深色模式 - 星光點點背景 */}
          <div className="absolute inset-0 -z-10 rounded-inherit opacity-40 overflow-hidden hidden dark:block">
            {/* 大星星 */}
            <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full animate-twinkle-slow shadow-lg shadow-blue-400/50" />
            <div className="absolute top-[25%] right-[20%] w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full animate-twinkle-medium shadow-lg shadow-purple-400/50" />
            <div className="absolute bottom-[30%] left-[25%] w-1 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-twinkle-fast shadow-lg shadow-emerald-400/50" />
            <div className="absolute bottom-[15%] right-[30%] w-0.5 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full animate-twinkle-slow shadow-lg shadow-amber-400/50" />
            <div className="absolute top-[60%] left-[70%] w-1 h-1 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full animate-twinkle-medium shadow-lg shadow-pink-400/50" />
            
            {/* 小星星 */}
            <div className="absolute top-[40%] left-[40%] w-0.5 h-0.5 bg-white/60 rounded-full animate-twinkle-fast" />
            <div className="absolute top-[70%] right-[15%] w-0.5 h-0.5 bg-white/50 rounded-full animate-twinkle-slow" />
            <div className="absolute bottom-[50%] left-[60%] w-0.5 h-0.5 bg-white/40 rounded-full animate-twinkle-medium" />
            <div className="absolute top-[20%] left-[80%] w-0.5 h-0.5 bg-white/60 rounded-full animate-twinkle-fast" />
            <div className="absolute bottom-[80%] right-[50%] w-0.5 h-0.5 bg-white/50 rounded-full animate-twinkle-slow" />
            
            {/* 微小星星 */}
            <div className="absolute top-[35%] right-[40%] w-px h-px bg-white/30 rounded-full animate-twinkle-medium" />
            <div className="absolute bottom-[25%] left-[50%] w-px h-px bg-white/40 rounded-full animate-twinkle-fast" />
            <div className="absolute top-[80%] left-[30%] w-px h-px bg-white/30 rounded-full animate-twinkle-slow" />
            <div className="absolute bottom-[60%] right-[70%] w-px h-px bg-white/35 rounded-full animate-twinkle-medium" />
            <div className="absolute top-[50%] right-[80%] w-px h-px bg-white/30 rounded-full animate-twinkle-fast" />
          </div>
        </>
      )}

      {/* 閃光效果 */}
      {shimmer && (
        <div className="absolute inset-0 -z-5 rounded-inherit overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-glass-shimmer" />
        </div>
      )}

      {/* 內容 */}
      <div className="relative z-liquid-content">
        {children}
      </div>
    </div>
  );
});

LiquidGlass.displayName = 'LiquidGlass';

// 專門的卡片組件
export const LiquidCard = forwardRef<HTMLDivElement, LiquidGlassProps>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <LiquidGlass
      ref={ref}
      variant="surface"
      effect="hover"
      shadow="liquid"
      shimmer
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </LiquidGlass>
  );
});

LiquidCard.displayName = 'LiquidCard';

// 浮動按鈕組件
export const LiquidButton = forwardRef<HTMLButtonElement, {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  ...props
}, ref) => {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/25',
    secondary: 'bg-liquid-glass-medium dark:bg-liquid-glass-dark-medium text-text-primary dark:text-dark-text-primary backdrop-blur-liquid',
    accent: 'bg-gradient-to-r from-accent to-accent-light text-white shadow-lg shadow-accent/25',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // 基礎樣式
        'relative rounded-liquid font-medium transition-all duration-300 ease-out',
        'border border-white/20 dark:border-white/10',
        'hover:scale-105 hover:shadow-liquid-hover active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        // 尺寸
        sizeStyles[size],
        // 變體
        variantStyles[variant],
        // 自定義類別
        className
      )}
      {...props}
    >
      {/* 液態流動背景 */}
      <div className="absolute inset-0 -z-10 rounded-inherit">
        <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-md animate-liquid-flow" />
        <div className="absolute bottom-0 left-0 w-6 h-6 bg-white/5 rounded-full blur-sm animate-liquid-wave" />
      </div>

      {/* 閃光效果 */}
      <div className="absolute inset-0 rounded-inherit overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-glass-shimmer opacity-0 hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* 內容 */}
      <span className="relative z-liquid-content font-display">
        {children}
      </span>
    </button>
  );
});

LiquidButton.displayName = 'LiquidButton';

// 通知面板組件
export const LiquidNotification = forwardRef<HTMLDivElement, {
  children: ReactNode;
  className?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  closable?: boolean;
  onClose?: () => void;
}>(({
  children,
  className,
  type = 'info',
  closable = false,
  onClose,
  ...props
}, ref) => {
  const typeStyles = {
    info: 'border-primary/30 bg-liquid-accent-blue',
    success: 'border-success/30 bg-liquid-accent-emerald',
    warning: 'border-warning/30 bg-liquid-accent-amber',
    error: 'border-danger/30 bg-liquid-accent-pink',
  };

  return (
    <LiquidGlass
      ref={ref}
      variant="light"
      effect="pulse"
      borderRadius="lg"
      className={cn(
        'p-4 animate-fade-in-up',
        typeStyles[type],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 font-sans text-sm text-text-primary dark:text-dark-text-primary">
          {children}
        </div>
        {closable && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </LiquidGlass>
  );
});

LiquidNotification.displayName = 'LiquidNotification';
