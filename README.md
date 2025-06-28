# TalkWithDB

Convert natural language to database queries using AI. Supports MySQL, PostgreSQL, and MongoDB with live database connections and schema-aware query generation.

**Created by [Nihad](https://github.com/nndas)**

## Features

- 🎯 Natural language to SQL/MongoDB conversion
- 🗄️ Support for MySQL, PostgreSQL, MongoDB
- 🔌 Live database connections with encrypted credentials
- 🧠 Schema-aware query generation for accuracy
- 📊 Real-time query execution and results
- 🔒 Client-side password encryption

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.local.example .env.local
   ```
   Add your OpenAI API key to `.env.local`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

## Usage

### Convert Only
1. Select database type
2. Enter natural language query
3. Press Enter or click "Convert Query"
4. Copy the generated query

### Connect to Database
1. Toggle "Connect to database" on
2. Enter credentials (password optional for local development)
3. Enter natural language query
4. View generated query and results

### Example Queries
- "Find all users who signed up in the last month"
- "Calculate total sales by category"
- "Show orders with amount > $100 and status pending"

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **Database**: mysql2, pg, mongodb

## Deployment

Deploy to Vercel:
1. Push to GitHub
2. Connect repository to Vercel
3. Add `OPENAI_API_KEY` environment variable
4. Deploy

**Author**: [Nihad](https://github.com/nndas) | **GitHub**: [@nndas](https://github.com/nndas)
