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
    let schema = {}

    if (entry.type === 'MySQL') {
      // Get all tables
      const [tables] = await entry.conn.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `)
      
      schema = {}
      for (const table of tables) {
        const tableName = table.TABLE_NAME
        // Get columns for each table
        const [columns] = await entry.conn.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [tableName])
        
        schema[tableName] = columns.map(col => ({
          name: col.COLUMN_NAME,
          type: col.DATA_TYPE,
          nullable: col.IS_NULLABLE === 'YES',
          key: col.COLUMN_KEY
        }))
      }
    } else if (entry.type === 'PostgreSQL') {
      // Get all tables
      const tablesRes = await entry.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `)
      
      schema = {}
      for (const table of tablesRes.rows) {
        const tableName = table.table_name
        // Get columns for each table
        const columnsRes = await entry.client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName])
        
        schema[tableName] = columnsRes.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        }))
      }
    } else if (entry.type === 'MongoDB') {
      // For MongoDB, get all collections and their sample documents
      const db = entry.mongo.db(entry.dbName)
      const collections = await db.listCollections().toArray()
      
      schema = {}
      for (const collection of collections) {
        const collectionName = collection.name
        const coll = db.collection(collectionName)
        
        // Get a sample document to understand the structure
        const sample = await coll.findOne({})
        if (sample) {
          // Extract field names and types from sample document
          const fields = {}
          for (const [key, value] of Object.entries(sample)) {
            fields[key] = {
              name: key,
              type: Array.isArray(value) ? 'array' : typeof value,
              example: Array.isArray(value) ? '[]' : value
            }
          }
          schema[collectionName] = Object.values(fields)
        } else {
          schema[collectionName] = []
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 })
    }

    return NextResponse.json({ schema })
  } catch (error: any) {
    console.error('Error fetching schema:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch schema' }, { status: 500 })
  }
} 