import { useState } from 'react';

const API_BASE = '/api'; 

export default function ChatUI() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am the MediGuide assistant. I can provide general health information. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIX 1: Send just the string text, not the whole object
        body: JSON.stringify({ message: input.trim() }), 
      });

      if (!res.ok) {
        const errorText = await res.text(); 
        throw new Error(errorText || 'Server returned an error');
      }

      const data = await res.json(); 

      // FIX 2: The backend sends { answer: "..." }, not { reply: "..." }
      const botMessage = { role: 'assistant', content: data.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: `Error: ${error.message}` };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">MediGuide Assistant</h2>
        <p className="text-xs text-slate-500">General health information only · Not for diagnosis</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-md rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 italic">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs font-medium text-amber-800">
        ⚠️ Educational Demo: This AI does not diagnose or prescribe. For emergencies, call 911.
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-200 px-6 py-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a general health question..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}