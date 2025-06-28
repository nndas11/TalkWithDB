import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { query, database, schema } = await request.json()

    if (!query || !database) {
      return NextResponse.json(
        { error: 'Query and database are required' },
        { status: 400 }
      )
    }

    let systemPrompt = `You are a database query converter. Convert the given natural language query to the appropriate database query syntax.

Database types and their syntax:
- MySQL: Use standard SQL syntax with MySQL-specific features
- PostgreSQL: Use standard SQL syntax with PostgreSQL-specific features  
- MongoDB: Return a JSON object with the following structure:
  { "find": "collection_name", "filter": {...}, "projection": {...}, "sort": {...}, "limit": number }
  Example: { "find": "users", "filter": {"age": {"$gt": 18}}, "projection": {"name": 1, "email": 1, "_id": 0} }

Rules:
1. Only return the query, no explanations
2. Use proper syntax for the selected database
3. Use EXACT table/collection names and column names from the provided schema
4. Pay attention to case sensitivity - use exact names as provided
5. For MongoDB, return a JSON object with "find", "filter", "projection" properties (no JSON.stringify)
6. For SQL databases, return complete SELECT, INSERT, UPDATE, or DELETE statements as appropriate

Current database: ${database}`

    // Add schema information to the prompt if provided
    if (schema && Object.keys(schema).length > 0) {
      systemPrompt += `\n\nDatabase Schema:\n`
      
      if (database === 'MongoDB') {
        // Format MongoDB schema
        for (const [collectionName, fields] of Object.entries(schema)) {
          systemPrompt += `\nCollection: ${collectionName}\n`
          if (Array.isArray(fields) && fields.length > 0) {
            fields.forEach((field: any) => {
              systemPrompt += `  - ${field.name} (${field.type})`
              if (field.example) systemPrompt += ` - example: ${field.example}`
              systemPrompt += `\n`
            })
          } else {
            systemPrompt += `  (empty collection)\n`
          }
        }
      } else {
        // Format SQL schema
        for (const [tableName, columns] of Object.entries(schema)) {
          systemPrompt += `\nTable: ${tableName}\n`
          if (Array.isArray(columns) && columns.length > 0) {
            columns.forEach((col: any) => {
              systemPrompt += `  - ${col.name} (${col.type})`
              if (col.key === 'PRI') systemPrompt += ` [PRIMARY KEY]`
              if (!col.nullable) systemPrompt += ` [NOT NULL]`
              systemPrompt += `\n`
            })
          } else {
            systemPrompt += `  (empty table)\n`
          }
        }
      }
      
      systemPrompt += `\nIMPORTANT: Use ONLY the exact table/collection names and column names shown above. Do not make assumptions about naming conventions.`
    } else {
      systemPrompt += `\n\nNo schema provided - make reasonable assumptions about table/collection names and structure, but be aware this may lead to errors.`
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const generatedQuery = completion.choices[0]?.message?.content

    if (!generatedQuery) {
      return NextResponse.json(
        { error: 'Failed to generate query' },
        { status: 500 }
      )
    }

    return NextResponse.json({ query: generatedQuery.trim() })
  } catch (error) {
    console.error('Error converting query:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// This route only handles conversion. Execution will be handled in a new route. 