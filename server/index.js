import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
