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
import type { Machine, MachineRestriction } from '@/types';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        label: '可使用',
        bgColor: 'bg-status-available-bg',
        textColor: 'text-status-available-text',
        borderColor: 'border-status-available-border'
      };
    case 'maintenance':
      return {
        label: '維護模式',
        bgColor: 'bg-status-maintenance-bg',
        textColor: 'text-status-maintenance-text',
        borderColor: 'border-status-maintenance-border'
      };
    case 'limited':
      return {
        label: '限流中',
        bgColor: 'bg-status-limited-bg',
        textColor: 'text-status-limited-text',
        borderColor: 'border-status-limited-border'
      };
    default:
      return {
        label: '未知狀態',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300'
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
    <main className="min-h-screen pt-20 pb-10 bg-muted">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-text-primary group relative inline-block">
              可用機器
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            </h1>
          </div>

          {/* 系統通知區域 */}
          <SystemNotifications />

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-text-secondary">載入中...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-lg">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">錯誤</h3>
                  <div className="mt-2 text-sm text-destructive/80">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {machines.map((machine) => {
                const statusConfig = getStatusConfig(machine.status);
                                  const restrictionInfo = getRestrictionInfo(machine.restrictions || [], userEmail, machine.restriction_status);
                
                return (
                  <div
                    key={machine.id}
                    className={`relative bg-surface rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                      restrictionInfo.isBlocked ? 'opacity-60' : ''
                    }`}
                  >
                    {/* 修改：根據限制狀態決定是否可點擊 */}
                    {restrictionInfo.isBlocked ? (
                      <div className="block relative z-10 cursor-not-allowed">
                        <div className="absolute top-4 right-4 z-10">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* 被封鎖的覆蓋層 */}
                        <div className="absolute inset-0 bg-red-500 bg-opacity-10 flex items-center justify-center z-20">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                            <XCircleIcon className="w-8 h-8 text-red-600 mx-auto" />
                            <div className="text-sm text-red-800 font-medium mt-1">無法使用</div>
                          </div>
                        </div>

                        <div className="p-6">
                          <h2 className="text-xl font-semibold text-text-primary mb-2">
                            {machine.name}
                          </h2>
                          <p className="text-text-secondary mb-4 line-clamp-2 whitespace-pre-line">
                            {machine.description}
                          </p>

                          {/* 限制資訊 - 封鎖狀態 */}
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <XCircleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-red-800">
                                <div className="font-medium mb-1">無法使用</div>
                                <div className="text-red-700">{restrictionInfo.summary}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-gray-300 text-gray-600 cursor-not-allowed">
                            <span>無法預約</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link 
                        href={`/machine/${machine.id}`}
                        className="block relative z-10"
                      >
                        <div className="absolute top-4 right-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="p-6">
                          <h2 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-primary transition-colors duration-200">
                            {machine.name}
                          </h2>
                          <p className="text-text-secondary mb-4 line-clamp-2 whitespace-pre-line">
                            {machine.description}
                          </p>

                          {/* 限制資訊 - 警告狀態 */}
                          {restrictionInfo.hasWarnings && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-amber-800">
                                  <div className="font-medium mb-1">使用限制</div>
                                  <div className="text-amber-700">{restrictionInfo.summary}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-primary text-white hover:bg-primary-dark focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                            <span>查看時段</span>
                            <svg
                              className="ml-2 w-4 h-4 transform transition-transform duration-200 group-hover:translate-x-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* 背景動畫效果 */}
                    <div
                      className="absolute inset-0 bg-primary opacity-0 hover:opacity-5 transition-opacity duration-200 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 