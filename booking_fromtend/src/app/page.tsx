'use client';

import Link from 'next/link';
import { BellIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { useMachineStore } from '@/store/machineStore';
import SystemNotifications from '@/components/SystemNotifications';
import { checkUserRestrictions, extractYearFromEmail } from '@/lib/userRestrictions';
import { LiquidGlass, LiquidCard, LiquidButton } from '@/components/ui/LiquidGlass';
import type { Machine, MachineRestriction } from '@/types';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        label: '可使用',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        textColor: 'text-emerald-800 dark:text-emerald-300',
        borderColor: 'border-emerald-500 dark:border-emerald-400'
      };
    case 'maintenance':
      return {
        label: '維護模式',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-800 dark:text-amber-300',
        borderColor: 'border-amber-500 dark:border-amber-400'
      };
    case 'limited':
      return {
        label: '限流中',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-800 dark:text-red-300',
        borderColor: 'border-red-500 dark:border-red-400'
      };
    default:
      return {
        label: '未知狀態',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        textColor: 'text-gray-600 dark:text-gray-300',
        borderColor: 'border-gray-300 dark:border-gray-500'
      };
  }
};

// 修改：根據限制檢查結果生成顯示內容
const getRestrictionInfo = (
  restrictions: MachineRestriction[], 
  userEmail: string,
  machineRestrictionStatus?: 'none' | 'limited' | 'blocked'
): {
  summary: string | null;
  isBlocked: boolean;
  hasWarnings: boolean;
  reasons: string[];
} => {
  if (!restrictions || restrictions.length === 0) {
    return { summary: null, isBlocked: false, hasWarnings: false, reasons: [] };
  }

  const restrictionCheck = checkUserRestrictions(userEmail, restrictions, machineRestrictionStatus);
  
  if (!restrictionCheck.hasRestrictions) {
    return { summary: null, isBlocked: false, hasWarnings: false, reasons: [] };
  }

  const isBlocked = restrictionCheck.blockedRestrictions.length > 0;
  const hasWarnings = restrictionCheck.warningRestrictions.length > 0;

  let summary = '';
  if (isBlocked) {
    summary = restrictionCheck.reasons[0] || '您無法使用此機器';
  } else if (hasWarnings) {
    summary = restrictionCheck.reasons[0] || '此機器有使用限制';
  }

  return {
    summary,
    isBlocked,
    hasWarnings,
    reasons: restrictionCheck.reasons
  };
};

export default function HomePage() {
  const { data: session } = useSession();
  const setRole = useUserStore((state) => state.setRole);
  const setMachines = useMachineStore((state) => state.setMachines);
  const machines = useMachineStore((state) => state.machines);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMachines() {
      try {
        const userEmail = session?.user?.email;
        // 使用新的 API 來獲取機器及其限制資訊
        const machineList = await api.machines.getAllWithRestrictions(userEmail);
        setMachines(machineList);
      } catch (error) {
        console.error('Failed to fetch machines:', error);
        setError('無法載入機器列表');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMachines();
  }, [setMachines, session?.user?.email]);

  useEffect(() => {
    async function fetchUserRole() {
      if (session?.user?.email && session?.user?.name) {
        try {
          const userData = await api.users.createOrGet({
            email: session.user.email,
            name: session.user.name,
          });
          setRole(userData.role as 'user' | 'manager' | 'admin');
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        }
      }
    }

    fetchUserRole();
  }, [session, setRole]);

  // 新增：顯示用戶年份資訊（除錯用）
  const userEmail = session?.user?.email || '';
  const userYear = extractYearFromEmail(userEmail);

  return (
    <main className="min-h-screen pt-5 pb-10 relative">
      {/* 全新的星光點點背景 - 僅深色模式，優化性能 */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden dark:block">
        {/* 減少星光數量以提升性能 */}
        <div className="absolute top-[15%] left-[20%] w-1 h-1 bg-blue-400 rounded-full animate-twinkle-slow shadow-sm shadow-blue-400/40" />
        <div className="absolute top-[25%] right-[15%] w-0.5 h-0.5 bg-purple-400 rounded-full animate-twinkle-medium shadow-sm shadow-purple-400/40" />
        <div className="absolute top-[60%] right-[25%] w-1 h-1 bg-emerald-400 rounded-full animate-twinkle-slow shadow-sm shadow-emerald-400/40" />
        <div className="absolute bottom-[20%] left-[30%] w-0.5 h-0.5 bg-amber-400 rounded-full animate-twinkle-medium shadow-sm shadow-amber-400/40" />
        
        {/* 精簡的中等星光 */}
        <div className="absolute top-[35%] left-[40%] w-px h-px bg-white/60 rounded-full animate-twinkle-medium" />
        <div className="absolute top-[50%] right-[40%] w-px h-px bg-white/50 rounded-full animate-twinkle-slow" />
        <div className="absolute bottom-[45%] left-[60%] w-px h-px bg-white/70 rounded-full animate-twinkle-fast" />
      </div>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col space-y-4">
          {/* 標題區域 */}
          <div className="p-6 text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-gray-900 dark:text-white mb-3">
              <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent font-extrabold">
                機器預約系統
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-sans">
              選擇您需要的 GPU 設備開始預約
            </p>
          </div>

          {isLoading && (
            <LiquidCard className="text-center py-12 animate-pulse-soft">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary dark:border-primary border-r-transparent mb-4" />
              <p className="text-lg font-medium text-text-primary dark:text-white">載入中...</p>
              <p className="text-sm text-text-secondary dark:text-gray-300 mt-2">正在獲取可用設備</p>
            </LiquidCard>
          )}

          {error && (
            <LiquidCard className="border-danger/30 bg-liquid-accent-pink animate-fade-in-up">
              <div className="flex items-center gap-3">
                <XCircleIcon className="w-6 h-6 text-danger flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary dark:text-white">載入失敗</h3>
                  <p className="text-text-secondary dark:text-gray-300 mt-1">{error}</p>
                </div>
              </div>
            </LiquidCard>
          )}

          {!isLoading && !error && (
            <>
              {/* 系統通知區域 - 25%寬度，一行最多4個 */}
              <div className="w-full">
                <SystemNotifications />
              </div>
              
              {/* 機器卡片區域 - 靠左對齊 */}
              <div className="w-full">
                <div className="flex flex-wrap gap-6 justify-start">
              {machines.map((machine, index) => {
                const statusConfig = getStatusConfig(machine.status);
                const restrictionInfo = getRestrictionInfo(machine.restrictions || [], userEmail, machine.restriction_status);
                
                return (
                  <div 
                    key={machine.id}
                    className="animate-fade-in-up w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <LiquidCard
                      className={`
                        relative overflow-hidden transition-all duration-500 ease-out h-full
                        hover:scale-105 hover:shadow-float
                        ${restrictionInfo.isBlocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      effect={restrictionInfo.isBlocked ? 'static' : 'hover'}
                    >
                      {/* 狀態標籤 - 移到標題同一行 */}
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-2xl font-display font-bold text-text-primary dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {machine.name}
                        </h2>
                        <LiquidGlass 
                          variant="light"
                          borderRadius="lg"
                          className={`px-3 py-1 text-sm font-bold ${statusConfig.textColor} ${statusConfig.bgColor} border-2 ${statusConfig.borderColor} shadow-md`}
                        >
                          {statusConfig.label}
                        </LiquidGlass>
                      </div>

                      {/* 被封鎖的覆蓋層 */}
                      {restrictionInfo.isBlocked && (
                        <div className="absolute inset-0 bg-danger/5 dark:bg-danger/10 flex items-center justify-center z-20">
                          <LiquidGlass 
                            variant="medium"
                            borderRadius="lg"
                            className="p-3 border-danger/30"
                          >
                            <XCircleIcon className="w-8 h-8 text-danger mx-auto mb-2" />
                            <div className="text-sm text-danger font-medium">無法使用</div>
                          </LiquidGlass>
                        </div>
                      )}

                      {/* 內容區域 */}
                      <div className="relative z-10">
                        <p className="text-text-secondary dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed font-sans">
                          {machine.description}
                        </p>

                        {/* 限制資訊 */}
                        {restrictionInfo.isBlocked && (
                          <LiquidGlass 
                            variant="light"
                            borderRadius="md"
                            className="mb-4 p-3 border-danger/20 bg-liquid-accent-pink"
                          >
                            <div className="flex items-start space-x-2">
                              <XCircleIcon className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-text-primary dark:text-white mb-1">無法使用</div>
                                <div className="text-text-secondary dark:text-gray-300">{restrictionInfo.summary}</div>
                              </div>
                            </div>
                          </LiquidGlass>
                        )}

                        {restrictionInfo.hasWarnings && !restrictionInfo.isBlocked && (
                          <LiquidGlass 
                            variant="light"
                            borderRadius="md"
                            className="mb-4 p-3 border-warning/20 bg-liquid-accent-amber"
                          >
                            <div className="flex items-start space-x-2">
                              <ExclamationTriangleIcon className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-text-primary dark:text-white mb-1">使用限制</div>
                                <div className="text-text-secondary dark:text-gray-300">{restrictionInfo.summary}</div>
                              </div>
                            </div>
                          </LiquidGlass>
                        )}
                        
                        {/* 行動按鈕 */}
                        {restrictionInfo.isBlocked ? (
                          <LiquidButton
                            variant="secondary"
                            size="md"
                            disabled
                            className="w-full opacity-50 cursor-not-allowed"
                            aria-label={`無法預約 ${machine.name}`}
                          >
                            無法預約
                          </LiquidButton>
                        ) : (
                          <Link href={`/machine/${machine.id}`} className="block">
                            <LiquidButton
                              variant="primary"
                              size="md"
                              className="w-full flex items-center justify-center gap-2"
                              aria-label={`查看 ${machine.name} 的可用時段`}
                            >
                              <span>查看時段 </span>
                            </LiquidButton>
                          </Link>
                        )}
                      </div>
                    </LiquidCard>
                  </div>
                );
              })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
} 