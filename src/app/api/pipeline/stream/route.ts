import { NextRequest } from 'next/server'

const PIPELINE_API_URL = process.env.PIPELINE_API_URL ?? 'http://localhost:8000'
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY ?? ''

/**
 * SSE streaming BFF endpoint for pipeline execution.
 *
 * Proxies a POST to the backend's /api/v1/query/stream endpoint and
 * forwards SSE progress events to the client. Each event has the format:
 *
 *   data: {"stage":"safety","status":"running","progress":0.3}\n\n
 *
 * If the backend doesn't support streaming (404 or unsupported), falls
 * back to a synthetic stream that sends stage events from the normal
 * query response's metadata.stages_completed array.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (PIPELINE_API_KEY) headers['Authorization'] = `Bearer ${PIPELINE_API_KEY}`

  // Try the streaming endpoint first
  try {
    const streamRes = await fetch(`${PIPELINE_API_URL}/api/v1/query/stream`, {
      method: 'POST',
      headers: { ...headers, Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    })

    // If backend supports streaming, proxy the SSE response directly
    if (streamRes.ok && streamRes.body) {
      const readable = new ReadableStream({
        async start(controller) {
          const reader = streamRes.body!.getReader()
          const encoder = new TextEncoder()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                // Send completion event
                controller.enqueue(
                  encoder.encode(`data: {"stage":"_complete","status":"completed","progress":1}\n\n`)
                )
                controller.close()
                break
              }
              controller.enqueue(value)
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Stream read error'
            controller.enqueue(
              encoder.encode(`data: {"stage":"_error","status":"error","error":${JSON.stringify(errorMsg)}}\n\n`)
            )
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // Backend doesn't support streaming (404/405) — fall back to synthetic stream
    return syntheticStream(body, headers)
  } catch {
    // Network error reaching backend — fall back to synthetic stream
    return syntheticStream(body, headers)
  }
}

/**
 * Fallback: runs the regular /api/v1/query endpoint and synthesizes
 * SSE events from the response metadata. This gives the client a
 * consistent SSE interface even when the backend only supports
 * request/response.
 */
async function syntheticStream(
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<Response> {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(
          encoder.encode(`data: {"stage":"_start","status":"running","progress":0}\n\n`)
        )

        const res = await fetch(`${PIPELINE_API_URL}/api/v1/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const text = await res.text()
          controller.enqueue(
            encoder.encode(
              `data: {"stage":"_error","status":"error","error":${JSON.stringify(`Backend error (${res.status}): ${text}`)}}\n\n`
            )
          )
          controller.close()
          return
        }

        const data = await res.json()
        const stages: string[] = data.metadata?.stages_completed ?? []
        const totalStages = stages.length || 1

        // Emit synthetic progress events for each completed stage
        for (let i = 0; i < stages.length; i++) {
          const progress = (i + 1) / totalStages
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                stage: stages[i],
                status: 'completed',
                progress,
                metadata: i === stages.length - 1 ? data.metadata : undefined,
              })}\n\n`
            )
          )
        }

        // Send the final result as the completion event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              stage: '_complete',
              status: 'completed',
              progress: 1,
              result: {
                answer: data.answer,
                trace_id: data.trace_id,
                sources: data.sources,
                metadata: data.metadata,
              },
            })}\n\n`
          )
        )

        controller.close()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Synthetic stream error'
        controller.enqueue(
          encoder.encode(`data: {"stage":"_error","status":"error","error":${JSON.stringify(errorMsg)}}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
