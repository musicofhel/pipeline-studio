import { NextResponse } from 'next/server'

const PIPELINE_API_URL = process.env.PIPELINE_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${PIPELINE_API_URL}/metrics`)
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Metrics proxy error' },
      { status: 502 }
    )
  }
}
