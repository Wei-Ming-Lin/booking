import Link from 'next/link';
import { Machine } from '@/types';

interface MachineCardProps {
  machine: Machine;
}

export default function MachineCard({ machine }: MachineCardProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    limited: 'bg-red-100 text-red-800',
  };

  const getStatusColor = (status: string) => {
    return statusColors[status] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{machine.name}</h3>
        <p className="text-gray-600 mb-4 whitespace-pre-line">{machine.description}</p>
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(machine.status)}`}
          >
            {getStatusText(machine.status)}
          </span>
          <Link
            href={`/machine/${machine.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-600"
          >
            查看時段
          </Link>
        </div>
      </div>
    </div>
  );
} 