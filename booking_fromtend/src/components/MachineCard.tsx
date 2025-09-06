import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Machine } from '@/types';

interface MachineCardProps {
  machine: Machine;
}

export default function MachineCard({ machine }: MachineCardProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-status-available-bg dark:bg-status-available-dark-bg',
          text: 'text-status-available-text dark:text-status-available-dark-text',
          border: 'border-status-available-border dark:border-status-available-dark-border',
        };
      case 'maintenance':
        return {
          bg: 'bg-status-maintenance-bg dark:bg-status-maintenance-dark-bg',
          text: 'text-status-maintenance-text dark:text-status-maintenance-dark-text',
          border: 'border-status-maintenance-border dark:border-status-maintenance-dark-border',
        };
      case 'limited':
        return {
          bg: 'bg-status-limited-bg dark:bg-status-limited-dark-bg',
          text: 'text-status-limited-text dark:text-status-limited-dark-text',
          border: 'border-status-limited-border dark:border-status-limited-dark-border',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-800 dark:text-gray-200',
          border: 'border-gray-300 dark:border-gray-600',
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '可使用';
      case 'maintenance':
        return '維護中';
      case 'limited':
        return '限制中';
      default:
        return status;
    }
  };

  const statusStyles = getStatusStyles(machine.status);

  return (
    <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-dark-border transition-all duration-200 hover:shadow-lg dark:hover:shadow-xl relative">
      {/* 狀態徽章在右上角 */}
      <span
        className={`absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
      >
        {getStatusText(machine.status)}
      </span>
      
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2 pr-16">{machine.name}</h3>
        <p className="text-gray-600 dark:text-dark-text-secondary mb-4 whitespace-pre-line">{machine.description}</p>
        <div className="flex justify-end">
          <Link
            href={`/machine/${machine.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary dark:bg-dark-accent hover:bg-primary-dark dark:hover:bg-dark-accent-dark transition-colors duration-200"
          >
            查看時段
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
} 