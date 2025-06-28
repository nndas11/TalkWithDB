import { NextRequest, NextResponse } from 'next/server'

const globalAny = global as any
if (!globalAny.__DB_CONNECTIONS__) globalAny.__DB_CONNECTIONS__ = {}
const CONNECTIONS = globalAny.__DB_CONNECTIONS__

export async function POST(request: NextRequest) {
  try {
    const { connectionId } = await request.json()
    if (!connectionId || !CONNECTIONS[connectionId]) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 })
    }
    const entry = CONNECTIONS[connectionId]
    if (entry.type === 'MySQL') {
      await entry.conn.end()
    } else if (entry.type === 'PostgreSQL') {
      await entry.client.end()
    } else if (entry.type === 'MongoDB') {
      await entry.mongo.close()
    }
    delete CONNECTIONS[connectionId]
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to disconnect' }, { status: 500 })
  }
} 