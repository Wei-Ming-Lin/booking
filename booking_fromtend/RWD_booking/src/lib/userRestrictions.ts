import type { MachineRestriction } from '@/types';

// 從用戶 email 中提取入學年份（民國年）
export const extractYearFromEmail = (email: string): number | null => {
  if (!email) return null;
  
  // 匹配 email 開頭的數字（通常是3位數民國年份）
  // 支援兩種格式：11oxxxxx@ntub.edu.tw 或 e11oxxxxx@ntub.edu.tw
  const match = email.match(/^[a-zA-Z]?(\d{3})/);
  if (match) {
    const year = parseInt(match[1]);
    // 民國97年 = 西元2007年，民國189年 = 西元2100年
    if (year >= 97 && year <= 189) {
      return year;
    }
  }
  
  return null;
};

// 檢查限制是否在當前時間生效
export const isRestrictionActiveNow = (restriction: MachineRestriction): boolean => {
  if (!restriction.start_time || !restriction.end_time) {
    return restriction.is_active; // 如果沒有時間限制，只看 is_active 狀態
  }

  const now = new Date();
  const startTime = new Date(restriction.start_time);
  const endTime = new Date(restriction.end_time);

  // 檢查當前時間是否在限制的有效時間範圍內
  return restriction.is_active && now >= startTime && now <= endTime;
};

// 檢查用戶是否受到年份限制
export const checkYearRestriction = (
  userEmail: string, 
  restriction: MachineRestriction
): { isRestricted: boolean; reason?: string } => {
  try {
    const rule = typeof restriction.restriction_rule === 'string' 
      ? JSON.parse(restriction.restriction_rule) 
      : restriction.restriction_rule;

    if (rule.restriction_type !== 'year_limit') {
      return { isRestricted: false };
    }

    // 檢查時間限制是否在當前時間生效
    if (!isRestrictionActiveNow(restriction)) {
      return { isRestricted: false }; // 時間未生效，不受限制
    }

    const userYear = extractYearFromEmail(userEmail);
    if (userYear === null) {
      // 無法解析年份，視為不受限制（或者您可以改為受限制）
      return { isRestricted: false };
    }

    const { operator, target_year } = rule;
    let isRestricted = false;

    switch (operator) {
      case 'gt': // 大於
        isRestricted = userYear > target_year;
        break;
      case 'gte': // 大於等於
        isRestricted = userYear >= target_year;
        break;
      case 'lt': // 小於
        isRestricted = userYear < target_year;
        break;
      case 'lte': // 小於等於
        isRestricted = userYear <= target_year;
        break;
      case 'eq': // 等於
        isRestricted = userYear === target_year;
        break;
      default:
        return { isRestricted: false };
    }

    return {
      isRestricted,
      reason: isRestricted ? rule.description || `您的入學年份 (民國${userYear}年) 受到此機器的使用限制` : undefined
    };

  } catch (error) {
    console.error('Error checking year restriction:', error);
    return { isRestricted: false };
  }
};

// 檢查用戶是否受到使用次數限制
export const checkUsageRestriction = (
  userEmail: string,
  restriction: MachineRestriction
): { isRestricted: boolean; reason?: string } => {
  try {
    const rule = typeof restriction.restriction_rule === 'string' 
      ? JSON.parse(restriction.restriction_rule) 
      : restriction.restriction_rule;

    if (rule.restriction_type !== 'rolling_window_limit') {
      return { isRestricted: false };
    }

    // 檢查時間限制是否在當前時間生效
    if (!isRestrictionActiveNow(restriction)) {
      return { isRestricted: false }; // 時間未生效，不受限制
    }

    // 使用次數限制需要查詢後端API來確認用戶的使用狀況
    // 這裡返回基本資訊，實際限制檢查需要在預約時進行
    return {
      isRestricted: false, // 首頁不阻擋，讓用戶進入詳細頁面查看
      reason: `此機器有使用次數限制：${rule.description || `${rule.window_size}個時段內最多${rule.max_bookings}次`}`
    };

  } catch (error) {
    console.error('Error checking usage restriction:', error);
    return { isRestricted: false };
  }
};

// 檢查用戶是否受到任何限制
export const checkUserRestrictions = (
  userEmail: string,
  restrictions: MachineRestriction[],
  machineRestrictionStatus?: 'none' | 'limited' | 'blocked'
): {
  hasRestrictions: boolean;
  blockedRestrictions: MachineRestriction[];
  warningRestrictions: MachineRestriction[];
  reasons: string[];
} => {
  if (!restrictions || restrictions.length === 0 || !userEmail) {
    return {
      hasRestrictions: false,
      blockedRestrictions: [],
      warningRestrictions: [],
      reasons: []
    };
  }

  // 如果機器限制狀態為 'none'（無限制），則不應用任何限制規則
  if (machineRestrictionStatus === 'none') {
    return {
      hasRestrictions: false,
      blockedRestrictions: [],
      warningRestrictions: [],
      reasons: []
    };
  }

  // 如果機器限制狀態為 'blocked'（完全封鎖），直接返回封鎖
  if (machineRestrictionStatus === 'blocked') {
    return {
      hasRestrictions: true,
      blockedRestrictions: restrictions, // 所有限制都視為封鎖
      warningRestrictions: [],
      reasons: ['此機器目前暫停使用']
    };
  }

  // 只有當機器限制狀態為 'limited'（部分限制）時，才檢查具體的限制規則
  if (machineRestrictionStatus !== 'limited') {
    return {
      hasRestrictions: false,
      blockedRestrictions: [],
      warningRestrictions: [],
      reasons: []
    };
  }

  const activeRestrictions = restrictions.filter(r => r.is_active);
  const blockedRestrictions: MachineRestriction[] = [];
  const warningRestrictions: MachineRestriction[] = [];
  const reasons: string[] = [];

  for (const restriction of activeRestrictions) {
    if (restriction.restriction_type === 'year_limit') {
      const result = checkYearRestriction(userEmail, restriction);
      if (result.isRestricted) {
        blockedRestrictions.push(restriction);
        if (result.reason) reasons.push(result.reason);
      }
    } else if (restriction.restriction_type === 'usage_limit') {
      const result = checkUsageRestriction(userEmail, restriction);
      if (result.reason) {
        warningRestrictions.push(restriction);
        reasons.push(result.reason);
      }
    }
  }

  return {
    hasRestrictions: blockedRestrictions.length > 0 || warningRestrictions.length > 0,
    blockedRestrictions,
    warningRestrictions,
    reasons
  };
}; 