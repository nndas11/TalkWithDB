import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import { MongoClient } from 'mongodb'

// In-memory connection store (for demo; use Redis or DB for production)
const globalAny = global as any
if (!globalAny.__DB_CONNECTIONS__) globalAny.__DB_CONNECTIONS__ = {}
const CONNECTIONS = globalAny.__DB_CONNECTIONS__

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Simple decryption function for password
const decryptPassword = (encryptedPassword: string): string => {
  if (!encryptedPassword) return ''
  
  try {
    // Decrypt the base64 encoded password
    const encrypted = atob(encryptedPassword)
    
    // Simple XOR decryption with the same secret key
    const secretKey = 'dbms-secure-key-2024' // In production, use environment variable
    let decrypted = ''
    
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length)
      decrypted += String.fromCharCode(charCode)
    }
    
    return decrypted
  } catch (error) {
    console.error('Failed to decrypt password:', error)
    // Fallback to simple base64 decoding
    try {
      return atob(encryptedPassword)
    } catch {
      return encryptedPassword // Return as-is if all decryption fails
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, host, user, password, database, port } = await request.json()
    
    // Decrypt password before using
    const decryptedPassword = decryptPassword(password)
    
    let conn, client, mongo
    let connectionId = makeId()
    if (type === 'MySQL') {
      conn = await mysql.createConnection({ host, user, password: decryptedPassword, database, port: Number(port) })
      CONNECTIONS[connectionId] = { type, conn }
    } else if (type === 'PostgreSQL') {
      client = new PgClient({ host, user, password: decryptedPassword, database, port: Number(port) })
      await client.connect()
      CONNECTIONS[connectionId] = { type, client }
    } else if (type === 'MongoDB') {
      let uri = ''
      if (user && decryptedPassword) {
        // Both username and password provided
        uri = `mongodb://${user}:${encodeURIComponent(decryptedPassword)}@${host}:${port}`
      } else if (user && !decryptedPassword) {
        // Username provided but no password
        uri = `mongodb://${user}@${host}:${port}`
      } else {
        // No authentication (local development)
        uri = `mongodb://${host}:${port}`
      }
      mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
      await mongo.connect()
      CONNECTIONS[connectionId] = { type, mongo, dbName: database }
    } else {
      return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 })
    }
    return NextResponse.json({ connectionId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to connect' }, { status: 500 })
  }
} 