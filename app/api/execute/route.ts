import { NextRequest, NextResponse } from 'next/server'

const globalAny = global as any
if (!globalAny.__DB_CONNECTIONS__) globalAny.__DB_CONNECTIONS__ = {}
const CONNECTIONS = globalAny.__DB_CONNECTIONS__

export async function POST(request: NextRequest) {
  try {
    const { query, connectionId } = await request.json()
    if (!query || !connectionId || !CONNECTIONS[connectionId]) {
      return NextResponse.json({ error: 'Query and connectionId are required' }, { status: 400 })
    }
    const entry = CONNECTIONS[connectionId]
    let result
    if (entry.type === 'MySQL') {
      [result] = await entry.conn.query({ sql: query, timeout: 10000 })
    } else if (entry.type === 'PostgreSQL') {
      const res = await entry.client.query({ text: query, statement_timeout: 10000 })
      result = res.rows
    } else if (entry.type === 'MongoDB') {
      let parsed
      try {
        parsed = JSON.parse(query)
      } catch {
        throw new Error('MongoDB query must be valid JSON')
      }
      
      const db = entry.mongo.db(entry.dbName)
      
      // Handle different MongoDB query formats
      if (parsed.find) {
        // Standard MongoDB find query: { "find": "collection", "filter": {...}, "projection": {...} }
        const collectionName = parsed.find
        const filter = parsed.filter || {}
        const projection = parsed.projection || {}
        const sort = parsed.sort || {}
        const limit = parsed.limit || 100
        
        const collection = db.collection(collectionName)
        let cursor = collection.find(filter, projection)
        
        if (Object.keys(sort).length > 0) {
          cursor = cursor.sort(sort)
        }
        
        result = await cursor.limit(limit).toArray()
      } else if (parsed.collection) {
        // Legacy format: { "collection": "name", "filter": {...}, "options": {...} }
        const collectionName = parsed.collection
        const filter = parsed.filter || {}
        const options = parsed.options || {}
        
        const collection = db.collection(collectionName)
        result = await collection.find(filter, options).limit(100).toArray()
      } else {
        throw new Error('Invalid MongoDB query format. Expected "find" or "collection" property.')
      }
    } else {
      return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 })
    }
    return NextResponse.json({ result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to execute query' }, { status: 500 })
  }
} 