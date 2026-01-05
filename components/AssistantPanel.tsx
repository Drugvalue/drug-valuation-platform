import React, { useEffect, useRef, useState } from 'react';

const quick = [
  'Explain PTRS calculation here',
  'Which 3 inputs move rNPV most?',
  'Validate LOE and exclusivity assumptions',
  'Suggest low/base/high scenarios',
];

const AssistantPanel: React.FC<{ valuation: any }> = ({ valuation }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Ask me about this valuation. I can explain rNPV, PTRS, LOE, royalty math, and data sources.' },
  ]);
  const [input, setInput] = useState('What drives the rNPV on this asset?');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context: { type: 'valuation', payload: valuation } }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data?.message || 'No reply.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Assistant error. Check server logs or API key.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-20 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-neutral-900 max-h-[80vh] flex flex-col">
      <div className="text-sm font-medium mb-2">Assistant</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={
                'inline-block px-3 py-2 rounded-xl text-sm ' +
                (m.role === 'user'
                  ? 'bg-gray-200 dark:bg-neutral-800'
                  : 'bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800')
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder="Ask about this valuation…"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none"
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
        >
          Send
        </button>
      </div>
      <div className="mt-2 text-[11px] text-gray-500">
        Tip: use the quick prompts above to analyze drivers, assumptions, and scenarios.
      </div>
    </div>
  );
};

export default AssistantPanel;
