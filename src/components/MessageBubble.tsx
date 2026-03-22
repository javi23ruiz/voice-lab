import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, Copy, RefreshCw, Pencil } from 'lucide-react'
import { useState } from 'react'
import { TypingIndicator } from './TypingIndicator'
import type { Message } from '../types'

interface Props {
  message: Message
  isLast?: boolean
  onRegenerate?: () => void
  onEdit?: () => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={copy}
        className="p-1 rounded text-gray-400 hover:text-gray-300 hover:bg-white/10 transition-colors"
        title="Copy message"
      >
        <Copy size={13} />
      </button>
      {copied && (
        <span className="text-[11px] font-medium text-accent-400 animate-fade-in">
          Copied!
        </span>
      )}
    </span>
  )
}

export function MessageBubble({ message, isLast, onRegenerate, onEdit }: Props) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${
        message.isStreaming && message.content === '' ? 'animate-fade-in' : 'animate-slide-up'
      }`}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-surface-800 border border-white/10 text-accent-400"
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      {/* Bubble */}
      <div className={`group flex flex-col gap-1 ${isUser ? 'items-end max-w-[80%]' : 'items-start w-full'}`}>
        {isUser ? (
          <div className="relative px-5 py-4 rounded-2xl text-base leading-relaxed bg-accent-500 text-white rounded-tr-sm">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        ) : (
          <div className="py-2 text-base leading-relaxed text-gray-200 w-full">
            {message.isStreaming && message.content === '' ? (
              <TypingIndicator />
            ) : (
              <div className="prose prose-invert max-w-none break-words prose-headings:text-lg prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      if (match) {
                        return (
                          <SyntaxHighlighter
                            style={vscDarkPlus as Record<string, React.CSSProperties>}
                            language={match[1]}
                            PreTag="div"
                            className="!rounded-lg !text-xs !mt-2 !mb-2"
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        )
                      }
                      return (
                        <code
                          className="bg-black/30 text-green-300 px-1.5 py-0.5 rounded text-xs font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
                          <table className="w-full text-sm border-collapse">{children}</table>
                        </div>
                      )
                    },
                    thead({ children }) {
                      return <thead className="bg-surface-800 text-gray-100 text-left">{children}</thead>
                    },
                    tbody({ children }) {
                      return <tbody className="text-gray-300">{children}</tbody>
                    },
                    tr({ children }) {
                      return <tr className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">{children}</tr>
                    },
                    th({ children }) {
                      return <th className="px-4 py-2.5 font-semibold text-gray-100 border-b border-white/10 whitespace-nowrap">{children}</th>
                    },
                    td({ children }) {
                      return <td className="px-4 py-2.5 align-top">{children}</td>
                    },
                    blockquote({ children }) {
                      return <blockquote className="border-l-4 border-accent-500 pl-4 my-3 text-gray-400 italic">{children}</blockquote>
                    },
                    hr() {
                      return <hr className="border-white/10 my-4" />
                    },
                    h1({ children }) {
                      return <h1 className="text-xl font-bold text-gray-100 mt-4 mb-2 pb-1 border-b border-white/10">{children}</h1>
                    },
                    h2({ children }) {
                      return <h2 className="text-lg font-semibold text-gray-100 mt-3 mb-1.5">{children}</h2>
                    },
                    h3({ children }) {
                      return <h3 className="text-base font-semibold text-gray-200 mt-2.5 mb-1">{children}</h3>
                    },
                    h4({ children }) {
                      return <h4 className="text-sm font-semibold text-gray-200 mt-2 mb-1">{children}</h4>
                    },
                    ul({ children }) {
                      return <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>
                    },
                    ol({ children }) {
                      return <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>
                    },
                    li({ children }) {
                      return <li className="text-gray-300 leading-relaxed">{children}</li>
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-400 underline underline-offset-2 hover:text-accent-300 transition-colors"
                        >
                          {children}
                        </a>
                      )
                    },
                    strong({ children }) {
                      return <strong className="font-semibold text-gray-100">{children}</strong>
                    },
                    em({ children }) {
                      return <em className="italic text-gray-300">{children}</em>
                    },
                    p({ children }) {
                      return <p className="my-1.5 leading-relaxed text-gray-200">{children}</p>
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-accent-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Meta row */}
        {!message.isStreaming && (
          <div
            className={`flex items-center gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? 'flex-row-reverse' : ''
            }`}
          >
            <span className="text-[10px] text-gray-400">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {!isUser && message.model && (
              <span className="text-[10px] text-gray-400">{message.model}</span>
            )}
            <CopyButton text={message.content} />
            {isLast && isUser && onEdit && (
              <button
                onClick={onEdit}
                className="p-1 rounded text-gray-400 hover:text-gray-300 hover:bg-white/10 transition-colors"
                title="Edit message"
              >
                <Pencil size={13} />
              </button>
            )}
            {isLast && !isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded text-gray-400 hover:text-gray-300 hover:bg-white/10 transition-colors"
                title="Regenerate response"
              >
                <RefreshCw size={13} />
              </button>
            )}
            {message.usage && !isUser && (
              <span className="text-[10px] text-gray-500">
                {message.usage.input_tokens}↑ {message.usage.output_tokens}↓
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
