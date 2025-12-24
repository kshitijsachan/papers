import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SyncStatus {
  synced: boolean;
  last_backup: boolean;
}

async function fetchSyncStatus(): Promise<SyncStatus> {
  const res = await fetch(`${API_BASE}/sync-status`);
  if (!res.ok) throw new Error('Failed to fetch sync status');
  return res.json();
}

export function SyncIndicator() {
  const { data, isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 10000, // Check every 10 seconds
    staleTime: 5000,
  });

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <div
        className={`w-2 h-2 rounded-full ${
          data.synced
            ? 'bg-green-400'
            : 'bg-amber-400 animate-pulse'
        }`}
      />
      <span>{data.synced ? 'Synced' : 'Pending'}</span>
    </div>
  );
}
