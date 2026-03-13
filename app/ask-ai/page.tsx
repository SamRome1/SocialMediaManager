'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  "What's trending on TikTok right now?",
  'Best content formats for Instagram Reels?',
  'How do I grow on LinkedIn in 2026?',
  'What hooks are working for short-form video?',
]

export default function TrendsPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Request failed')
      }

      if (!res.body) throw new Error('No response stream')

      const assistantMessage: Message = { role: 'assistant', content: '' }
      setMessages((prev) => [...prev, assistantMessage])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
          }
          return prev
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Ask AI</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Chat with Claude about trends, platform strategies, and content ideas.
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-[#111218] p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-lg">
              ✦
            </div>
            <p className="mt-3 text-sm text-gray-400">Ask anything about trends or platform strategy.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                  : 'rounded-bl-sm border border-white/5 bg-white/5 text-gray-300'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && loading && (
                <span className="inline-block animate-pulse text-cyan-400">▋</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about trends… (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-white/10 bg-[#111218] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={loading || !input.trim()}
          className="self-end rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
