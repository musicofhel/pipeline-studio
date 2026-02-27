'use client'

import React from 'react'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

const PIPELINE_STORAGE_KEY = 'pipeline-studio-pipeline'

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Pipeline Studio error boundary caught:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleResetPipeline = () => {
    try {
      localStorage.removeItem(PIPELINE_STORAGE_KEY)
    } catch {
      // Ignore localStorage errors
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-zinc-950 p-8">
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-8 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
                <AlertTriangle size={28} className="text-red-400" />
              </div>

              <h2 className="mb-2 text-xl font-semibold text-zinc-100">
                Something went wrong
              </h2>

              <p className="mb-6 text-sm text-zinc-400">
                An unexpected error occurred in the pipeline editor. You can try
                reloading the page or resetting the pipeline to its default state.
              </p>

              {this.state.error && (
                <div className="mb-6 w-full rounded-md bg-zinc-800 p-3">
                  <p className="break-all font-mono text-xs text-zinc-400">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex w-full gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <RotateCcw size={16} />
                  Reload
                </button>

                <button
                  onClick={this.handleResetPipeline}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 ring-1 ring-red-500/20 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <Trash2 size={16} />
                  Reset Pipeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
