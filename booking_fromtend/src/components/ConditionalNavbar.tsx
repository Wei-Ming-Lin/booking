'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // 定義不需要顯示導航欄的頁面路徑
  const hideNavbarPaths = ['/login'];
  
  // 檢查當前路徑是否需要隱藏導航欄
  const shouldHideNavbar = hideNavbarPaths.includes(pathname);
  
  if (shouldHideNavbar) {
    return null;
  }
  
  return (
    <>
      <Navbar />
      <div className="pt-16" />
    </>
  );
}
