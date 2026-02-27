'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Circle, RefreshCw, Activity, Loader2 } from 'lucide-react'
import { useBackendStatus } from '@/lib/hooks/use-backend-status'

function statusDotClass(status: string): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'fill-green-500 text-green-500'
    case 'degraded':
    case 'warning':
      return 'fill-yellow-500 text-yellow-500'
    default:
      return 'fill-red-500 text-red-500'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'Healthy'
    case 'degraded':
    case 'warning':
      return 'Degraded'
    default:
      return 'Unhealthy'
  }
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface HealthDashboardProps {
  children?: React.ReactNode
}

export function HealthDashboard({ children }: HealthDashboardProps) {
  const { connected, version, services, lastChecked, error, refresh } = useBackendStatus()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    // Brief delay so the spinner is visible even on fast responses
    setTimeout(() => setRefreshing(false), 400)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-zinc-400"
          >
            <Activity size={14} />
            Health
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Activity size={18} className="text-zinc-400" />
            Backend Health Dashboard
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Service status and connectivity details for the pipeline backend.
          </DialogDescription>
        </DialogHeader>

        {/* API Connection Status */}
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle
                size={10}
                className={connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}
              />
              <span className="text-sm font-medium">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {version && (
                <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                  v{version}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-7 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {refreshing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Refresh
              </Button>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
          {lastChecked && (
            <p className="mt-1 text-[10px] text-zinc-500">
              Last checked: {formatTimestamp(lastChecked)}
            </p>
          )}
        </div>

        {/* Services Grid */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Services
          </h3>
          {!services || Object.keys(services).length === 0 ? (
            <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-4 text-center text-sm text-zinc-500">
              {connected ? 'No service data available' : 'Connect to backend to view services'}
            </div>
          ) : (
            <div className="grid gap-2">
              {Object.entries(services).map(([name, svc]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Circle size={8} className={statusDotClass(svc.status)} />
                    <span className="text-sm text-zinc-200">{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs ${
                        svc.status === 'healthy' || svc.status === 'ok'
                          ? 'text-green-400'
                          : svc.status === 'degraded' || svc.status === 'warning'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {statusLabel(svc.status)}
                    </span>
                    {svc.latency_ms != null && (
                      <span className="min-w-[48px] text-right text-xs text-zinc-500">
                        {Math.round(svc.latency_ms)}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
