import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { api } from '@/lib/api';

export function Home() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => api.getHealth(signal),
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your feed</h1>
        <p className="text-muted-foreground">Short videos from people you follow.</p>
      </div>

      <div className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <h2 className="font-semibold">API status</h2>
        {isPending && <p className="mt-2 text-sm text-muted-foreground">Checking…</p>}
        {isError && (
          <p className="mt-2 text-sm text-destructive">
            Failed to reach the API: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        )}
        {data && (
          <p className="mt-2 text-sm">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {data.status}
            </span>
            {' · '}uptime {Math.round(data.uptimeSeconds)}s · {data.service}
          </p>
        )}
      </div>
    </motion.section>
  );
}
