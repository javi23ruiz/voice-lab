import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const USERS_FILE = join(__dirname, 'users.json')
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET not set — using insecure dev fallback. Set JWT_SECRET in .env for production.')
  return 'dev-insecure-secret-change-me'
})()
const JWT_EXPIRES_IN = '7d'

function readUsers() {
  try { return JSON.parse(readFileSync(USERS_FILE, 'utf8')) } catch { return [] }
}
function writeUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

const app = express()
const PORT = process.env.PORT || 3001
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// POST /api/chat — streams Claude responses via SSE
app.post('/api/chat', async (req, res) => {
  const { messages, model = 'claude-sonnet-4-6', system } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: system || 'You are a helpful, thoughtful assistant. Format responses using markdown when appropriate.',
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`)
      }
    }

    const finalMsg = await stream.finalMessage()
    res.write(`data: ${JSON.stringify({ type: 'done', usage: finalMsg.usage, stop_reason: finalMsg.stop_reason })}\n\n`)
  } catch (err) {
    console.error('Anthropic API error:', err)
    res.write(`data: ${JSON.stringify({ type: 'delta', text: '\n\n⚠️ API error: ' + err.message })}\n\n`)
    res.write(`data: ${JSON.stringify({ type: 'done', usage: null, stop_reason: 'error' })}\n\n`)
  } finally {
    res.end()
  }
})

// POST /api/map-agent — single non-streaming call for the agent loop
app.post('/api/map-agent', async (req, res) => {
  const { messages, systemPrompt, model = 'claude-sonnet-4-6' } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    res.json({ text, usage: response.usage })
  } catch (err) {
    console.error('Map agent API error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/models — available models list
app.get('/api/models', (_req, res) => {
  res.json({
    models: [
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        description: 'Most intelligent — agents & complex reasoning',
        badge: 'Most Powerful',
        badgeColor: 'purple',
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        description: 'Best balance of speed and intelligence',
        badge: 'Balanced',
        badgeColor: 'blue',
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        description: 'Fastest and most cost-effective',
        badge: 'Fastest',
        badgeColor: 'green',
      },
    ],
  })
})

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const users = readUsers()
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = { id: Math.random().toString(36).slice(2, 11), username, passwordHash, createdAt: new Date().toISOString() }
  writeUsers([...users, user])

  const token = signToken({ id: user.id, username: user.username })
  res.status(201).json({ token, username: user.username })
})

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })

  const users = readUsers()
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
  if (!user) return res.status(401).json({ error: 'Invalid username or password' })

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) return res.status(401).json({ error: 'Invalid username or password' })

  const token = signToken({ id: user.id, username: user.username })
  res.json({ token, username: user.username })
})

// GET /api/auth/me — validate token
app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  try {
    const payload = verifyToken(auth.slice(7))
    res.json({ username: payload.username })
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
