import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  Open: { label: 'เปิด (Open)', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  Approved: { label: 'อนุมัติ (Approved)', className: 'bg-green-100 text-green-800 border-green-300' },
  Completed: { label: 'เสร็จสิ้น (Completed)', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  Expired:   { label: 'หมดอายุ (Expired)',   className: 'bg-red-100 text-red-700 border-red-300' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-yellow-100 text-yellow-800' };
  return (
    <Badge variant="outline" className={`font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
