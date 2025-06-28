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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6">
              <Database className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-4">
              TalkWithDB
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Transform your natural language into powerful database queries with AI precision
            </p>
          </div>

          {/* Connection Status Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 font-medium">Database Connection</span>
                <div className="relative">
                  <button
                    className={classNames(
                      'relative inline-flex h-10 w-20 border-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20',
                      connectToDb ? 'border-blue-400 bg-blue-500' : 'border-gray-500 bg-gray-600'
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
                        'inline-block h-9 w-9 rounded-full bg-white shadow-lg transform transition-all duration-300',
                        connectToDb ? 'translate-x-10' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
              
              {connected && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 font-medium text-sm">Connected</span>
                  </div>
                  <button
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 rounded-full text-sm font-medium transition-all duration-200"
                    onClick={handleDisconnect}
                    type="button"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal for DB Credentials */}
          {showModal && connectToDb && !connected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md relative border border-white/10">
                <button
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  onClick={() => {
                    setShowModal(false)
                    if (!connected) {
                      setConnectToDb(false)
                    }
                  }}
                  type="button"
                >
                  <XCircle className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">Database Connection</h2>
                <form onSubmit={handleConnect} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Database Type</label>
                    <select
                      value={dbCreds.type}
                      onChange={e => setDbCreds({ ...dbCreds, type: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="MySQL">MySQL</option>
                      <option value="PostgreSQL">PostgreSQL</option>
                      <option value="MongoDB">MongoDB</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Host</label>
                      <input
                        type="text"
                        value={dbCreds.host}
                        onChange={e => setDbCreds({ ...dbCreds, host: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
                      <input
                        type="number"
                        value={dbCreds.port}
                        onChange={e => setDbCreds({ ...dbCreds, port: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                      <input
                        type="text"
                        value={dbCreds.user}
                        onChange={e => setDbCreds({ ...dbCreds, user: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                      <input
                        type="password"
                        value={dbCreds.password}
                        onChange={e => setDbCreds({ ...dbCreds, password: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Database Name</label>
                    <input
                      type="text"
                      value={dbCreds.database}
                      onChange={e => setDbCreds({ ...dbCreds, database: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  {connectError && (
                    <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 text-sm">
                      {connectError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    disabled={connecting}
                  >
                    {connecting ? <Loader2 className="animate-spin h-5 w-5" /> : null}
                    <span>{connecting ? 'Connecting...' : 'Connect to Database'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Database Selection */}
              <div>
                <label htmlFor="database" className="block text-sm font-medium text-gray-300 mb-3">
                  Select Database Type
                </label>
                <div className="relative">
                  <Database className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <select
                    id="database"
                    value={database}
                    onChange={(e) => {
                      setDatabase(e.target.value)
                      setGeneratedQuery('')
                      setResults(null)
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
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
                  <div className="mt-3 flex items-center text-sm">
                    {schemaLoading ? (
                      <span className="text-blue-400 flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading database schema...
                      </span>
                    ) : schemaLoaded ? (
                      <span className="text-green-400 flex items-center">
                        <Check className="h-4 w-4 mr-2" />
                        Using database schema for accurate queries
                      </span>
                    ) : (
                      <span className="text-gray-400 flex items-center">
                        <Check className="h-4 w-4 mr-2" />
                        Connected (schema will be loaded when you submit a query)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Query Input */}
              <div>
                <label htmlFor="query" className="block text-sm font-medium text-gray-300 mb-3">
                  Natural Language Query
                </label>
                <textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const form = e.currentTarget.closest('form')
                      if (form) {
                        form.requestSubmit()
                      }
                    }
                  }}
                  placeholder="e.g., Find all users who signed up in the last month and have made at least one purchase"
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400 transition-all"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Converting Query...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Convert to {database} Query</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
                <p className="text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Generated Query Output */}
          {generatedQuery && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Generated {database} Query
                </h2>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 hover:border-gray-500 rounded-xl transition-all duration-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-gray-300" />
                      <span className="text-gray-300">Copy Query</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-6 mb-6 border border-gray-700">
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {generatedQuery}
                </pre>
                {schemaLoaded && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-green-400 flex items-center">
                      <Check className="h-3 w-3 mr-2" />
                      Query generated using actual database schema for maximum accuracy
                    </p>
                  </div>
                )}
              </div>
              
              {/* Results Section */}
              {results !== null && connectToDb && connected && (
                <div>
                  <div className="flex items-center mb-4">
                    <Table className="h-6 w-6 mr-3 text-blue-400" />
                    <span className="font-semibold text-white text-lg">Query Results</span>
                  </div>
                  
                  {Array.isArray(results) && results.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-700">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gray-800/50">
                            {Object.keys(results[0]).map((col) => (
                              <th key={col} className="px-6 py-4 text-left text-sm font-semibold text-gray-300 border-b border-gray-700">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-gray-900/30">
                          {results.map((row, i) => (
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-6 py-4 text-sm text-gray-200">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-900/30 rounded-xl border border-gray-700">
                      <div className="text-center">
                        <div className="text-gray-500 mb-4">
                          <Table className="h-12 w-12 mx-auto" />
                        </div>
                        <p className="text-gray-300 font-medium text-lg mb-2">No results found</p>
                        <p className="text-gray-400">
                          The query executed successfully but returned no matching records.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Example Queries */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
            <h3 className="text-2xl font-bold text-white mb-6">
              Example Queries
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-500/10 border border-blue-400/20 rounded-xl hover:bg-blue-500/20 transition-all">
                <h4 className="font-semibold text-blue-300 mb-3">Find Users</h4>
                <p className="text-sm text-blue-200 leading-relaxed">
                  "Show me all users who registered in the last 30 days"
                </p>
              </div>
              <div className="p-6 bg-green-500/10 border border-green-400/20 rounded-xl hover:bg-green-500/20 transition-all">
                <h4 className="font-semibold text-green-300 mb-3">Aggregate Data</h4>
                <p className="text-sm text-green-200 leading-relaxed">
                  "Calculate the total sales for each product category"
                </p>
              </div>
              <div className="p-6 bg-purple-500/10 border border-purple-400/20 rounded-xl hover:bg-purple-500/20 transition-all">
                <h4 className="font-semibold text-purple-300 mb-3">Complex Filter</h4>
                <p className="text-sm text-purple-200 leading-relaxed">
                  "Find orders with total amount greater than $100 and status is pending"
                </p>
              </div>
              <div className="p-6 bg-orange-500/10 border border-orange-400/20 rounded-xl hover:bg-orange-500/20 transition-all">
                <h4 className="font-semibold text-orange-300 mb-3">Join Tables</h4>
                <p className="text-sm text-orange-200 leading-relaxed">
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