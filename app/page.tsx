'use client'

import { useState, useRef, useEffect } from 'react'
import { Database, Send, Copy, Check, Table, XCircle, Loader2 } from 'lucide-react'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [database, setDatabase] = useState('MySQL')
  const [generatedQuery, setGeneratedQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [connectToDb, setConnectToDb] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [dbCreds, setDbCreds] = useState({
    type: 'MySQL',
    host: '',
    user: '',
    password: '',
    database: '',
    port: '',
  })
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [schemaLoaded, setSchemaLoaded] = useState(false)
  const [schemaLoading, setSchemaLoading] = useState(false)

  const databases = [
    { value: 'MySQL', label: 'MySQL' },
    { value: 'PostgreSQL', label: 'PostgreSQL' },
    { value: 'MongoDB', label: 'MongoDB' },
  ]

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    setConnectError('')
    try {
      // Encrypt password before sending
      const encryptedPassword = await encryptPassword(dbCreds.password)
      
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dbCreds,
          password: encryptedPassword
        }),
      })
      console.log(res)
      const data = await res.json()
      console.log(data)
      if (!res.ok) throw new Error(data.error || 'Failed to connect')
      setConnected(true)
      setConnectionId(data.connectionId)
      setDatabase(dbCreds.type)
      setShowModal(false)
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!connectionId) return
    await fetch('/api/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId }),
    })
    setConnected(false)
    setConnectionId(null)
    setDbCreds({ type: 'MySQL', host: '', user: '', password: '', database: '', port: '' })
    setDatabase('MySQL')
    setConnectToDb(false)
    setSchemaLoaded(false)
    setSchemaLoading(false)
    setQuery('')
    setGeneratedQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }
    setIsLoading(true)
    setError('')
    setGeneratedQuery('')
    setResults(null)
    setSchemaLoaded(false)
    setSchemaLoading(false)
    
    try {
      // Fetch schema if connected to database
      let schema = null
      if (connectToDb && connected && connectionId) {
        setSchemaLoading(true)
        try {
          const schemaRes = await fetch('/api/schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId }),
          })
          if (schemaRes.ok) {
            const schemaData = await schemaRes.json()
            schema = schemaData.schema
            setSchemaLoaded(true)
          }
        } catch (schemaError) {
          console.warn('Failed to fetch schema, proceeding without it:', schemaError)
        } finally {
          setSchemaLoading(false)
        }
      }

      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, database, schema }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to convert query')
      setGeneratedQuery(data.query)
      if (connectToDb && connected && connectionId) {
        // Use the connection
        const execRes = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: data.query, connectionId }),
        })
        const execData = await execRes.json()
        if (!execRes.ok) throw new Error(execData.error || 'Failed to execute query')
        setResults(execData.result)
      } else if (!connectToDb) {
        // Just show the query, optionally allow execution with credentials
        setResults(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedQuery)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Simple encryption function for password
  const encryptPassword = async (password: string): Promise<string> => {
    if (!password) return ''
    
    try {
      // Use a simple but more secure encryption approach
      // In production, use proper encryption libraries like crypto-js
      
      // Simple XOR encryption with a secret key (for demo purposes)
      const secretKey = 'dbms-secure-key-2024' // In production, use environment variable
      let encrypted = ''
      
      for (let i = 0; i < password.length; i++) {
        const charCode = password.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length)
        encrypted += String.fromCharCode(charCode)
      }
      
      // Convert to base64 for safe transmission
      return btoa(encrypted)
    } catch (error) {
      console.error('Encryption failed:', error)
      // Fallback to simple base64 encoding
      return btoa(password)
    }
  }

  useEffect(() => {
    // Sync popup database type with main page selection when database changes and modal is open
    if (showModal && connectToDb && !connected) {
      setDbCreds(prev => ({ ...prev, type: database }))
    }
  }, [database, showModal, connectToDb, connected])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              TalkWithDB
            </h1>
            <p className="text-lg text-gray-600">
              Convert natural language queries to database-specific syntax using AI
            </p>
          </div>

          {/* Toggle Bar */}
          <div className="flex items-center justify-center mb-8">
            <span className="mr-4 text-gray-700 font-medium">Connect to a database?</span>
            <button
              className={classNames(
                'relative inline-flex h-8 w-16 border-2 border-blue-500 rounded-full transition-colors duration-200 focus:outline-none',
                connectToDb ? 'bg-blue-600' : 'bg-gray-200'
              )}
              onClick={() => {
                setConnectToDb((v) => !v)
                if (!connectToDb) {
                  setDbCreds(prev => ({ ...prev, type: database }))
                  setShowModal(true)
                }
                if (connectToDb) {
                  setConnected(false)
                  setConnectionId(null)
                }
              }}
              type="button"
            >
              <span
                className={classNames(
                  'inline-block h-7 w-7 rounded-full bg-white shadow transform transition-transform duration-200',
                  connectToDb ? 'translate-x-8' : 'translate-x-1'
                )}
              />
            </button>
            {connected && (
              <span className="ml-4 flex items-center text-green-600 font-medium">
                <Check className="h-5 w-5 mr-1" /> Connected
                <button
                  className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  onClick={handleDisconnect}
                  type="button"
                >
                  End Connection
                </button>
              </span>
            )}
          </div>

          {/* Modal for DB Credentials */}
          {showModal && connectToDb && !connected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
                <button
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setShowModal(false)
                    // Reset toggle to off if not connected
                    if (!connected) {
                      setConnectToDb(false)
                    }
                  }}
                  type="button"
                >
                  <XCircle className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Database Credentials</h2>
                <form onSubmit={handleConnect} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
                    <select
                      value={dbCreds.type}
                      onChange={e => setDbCreds({ ...dbCreds, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      <option value="MySQL">MySQL</option>
                      <option value="PostgreSQL">PostgreSQL</option>
                      <option value="MongoDB">MongoDB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <input
                      type="text"
                      value={dbCreds.host}
                      onChange={e => setDbCreds({ ...dbCreds, host: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <input
                      type="text"
                      value={dbCreds.user}
                      onChange={e => setDbCreds({ ...dbCreds, user: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={dbCreds.password}
                      onChange={e => setDbCreds({ ...dbCreds, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                    <input
                      type="text"
                      value={dbCreds.database}
                      onChange={e => setDbCreds({ ...dbCreds, database: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <input
                      type="number"
                      value={dbCreds.port}
                      onChange={e => setDbCreds({ ...dbCreds, port: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      required
                    />
                  </div>
                  {connectError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {connectError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                    disabled={connecting}
                  >
                    {connecting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Database Selection */}
              <div>
                <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Database
                </label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <select
                    id="database"
                    value={database}
                    onChange={(e) => {
                      setDatabase(e.target.value)
                      // Clear generated query when database type changes
                      setGeneratedQuery('')
                      setResults(null)
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                  >
                    {databases.map((db) => (
                      <option key={db.value} value={db.value}>
                        {db.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Schema indicator */}
                {connectToDb && connected && (
                  <div className="mt-2 flex items-center text-sm">
                    {schemaLoading ? (
                      <span className="text-blue-600 flex items-center">
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Loading database schema...
                      </span>
                    ) : schemaLoaded ? (
                      <span className="text-green-600 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Using database schema for accurate queries
                      </span>
                    ) : (
                      <span className="text-gray-500 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Connected (schema will be loaded when you submit a query)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Query Input */}
              <div>
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                  Natural Language Query
                </label>
                <textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Submit form on Enter, but allow Shift+Enter for new lines
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const form = e.currentTarget.closest('form')
                      if (form) {
                        form.requestSubmit()
                      }
                    }
                  }}
                  placeholder="e.g., Find all users who signed up in the last month and have made at least one purchase"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-400"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Convert Query</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Generated Query Output */}
          {generatedQuery && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated {database} Query
                </h2>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-600">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {generatedQuery}
                </pre>
                {schemaLoaded && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-green-600 flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Query generated using actual database schema for maximum accuracy
                    </p>
                  </div>
                )}
              </div>
              {/* Results Section */}
              {results !== null && connectToDb && connected && (
                <div>
                  <div className="flex items-center mb-2">
                    <Table className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-medium text-gray-800">Results</span>
                  </div>
                  
                  {Array.isArray(results) && results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead>
                          <tr>
                            {Object.keys(results[0]).map((col) => (
                              <th key={col} className="px-4 py-2 bg-blue-50 text-blue-900 font-semibold border-b border-gray-200">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((row, i) => (
                            <tr key={i} className="even:bg-gray-50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-4 py-2 border-b border-gray-100 text-gray-800">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-center">
                        <div className="text-gray-400 mb-2">
                          <Table className="h-8 w-8 mx-auto" />
                        </div>
                        <p className="text-gray-600 font-medium">No results found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          The query executed successfully but returned no matching records.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Chart Placeholder */}
              {results && Array.isArray(results) && results.length > 0 && (
                <div className="mt-6">
                  {/* Chart.js or Recharts visualization can go here */}
                  <div className="text-gray-500 italic text-sm">[Chart visualization coming soon]</div>
                </div>
              )}
            </div>
          )}

          {/* Example Queries */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Example Queries
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Find Users</h4>
                <p className="text-sm text-blue-700">
                  "Show me all users who registered in the last 30 days"
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Aggregate Data</h4>
                <p className="text-sm text-green-700">
                  "Calculate the total sales for each product category"
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Complex Filter</h4>
                <p className="text-sm text-purple-700">
                  "Find orders with total amount greater than $100 and status is pending"
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Join Tables</h4>
                <p className="text-sm text-orange-700">
                  "Get customer names and their order details from the last week"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 