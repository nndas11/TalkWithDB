import { NextRequest, NextResponse } from 'next/server'

// Import DB drivers
import mysql from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import { MongoClient } from 'mongodb'

// Helper to get DB config from env
function getDbConfig(database: string) {
  switch (database) {
    case 'MySQL':
      return {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      }
    case 'PostgreSQL':
      return {
        host: process.env.PG_HOST,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
        port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
      }
    case 'MongoDB':
      return {
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB,
      }
    default:
      throw new Error('Unsupported database type')
  }
}

export async function POST(request: NextRequest) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const { query, database } = await request.json()
    if (!query || !database) {
      return NextResponse.json({ error: 'Query and database are required' }, { status: 400 })
    }
    const config = getDbConfig(database)

    let result
    if (database === 'MySQL') {
      const conn = await mysql.createConnection(config)
      try {
        [result] = await conn.query({ sql: query, timeout: 10000 })
      } finally {
        await conn.end()
      }
    } else if (database === 'PostgreSQL') {
      const client = new PgClient(config)
      await client.connect()
      try {
        const res = await client.query({ text: query, statement_timeout: 10000 })
        result = res.rows
      } finally {
        await client.end()
      }
    } else if (database === 'MongoDB') {
      const { uri, dbName } = config
      if (!uri || !dbName) throw new Error('MongoDB config missing')
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
      await client.connect()
      try {
        // Only allow find queries for safety
        let parsed
        try {
          parsed = JSON.parse(query)
        } catch {
          throw new Error('MongoDB query must be valid JSON')
        }
        const collectionName = parsed.collection || 'collection'
        const filter = parsed.filter || {}
        const options = parsed.options || {}
        const db = client.db(dbName)
        const collection = db.collection(collectionName)
        result = await collection.find(filter, options).limit(100).toArray()
      } finally {
        await client.close()
      }
    } else {
      throw new Error('Unsupported database type')
    }
    clearTimeout(timeout)
    return NextResponse.json({ result })
  } catch (error: any) {
    clearTimeout(timeout)
    let message = error.message || 'Internal server error'
    if (error.name === 'AbortError') {
      message = 'Query timed out'
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
} 