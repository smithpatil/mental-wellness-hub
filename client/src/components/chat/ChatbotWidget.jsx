import { useState, useRef, useEffect } from 'react';
import { MessageCircleHeart, X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const GREETING = { id: 1, role: 'model', text: "Hi, I'm your wellness companion. How are you feeling today? I can share coping ideas, but I'm not a therapist, and I can't diagnose." };
const STARTERS = ['I feel stressed about exams', "I can't sleep well", 'Help me calm down'];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen, loading]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || loading) return;
    const userMsg = { id: Date.now(), role: 'user', text: message };
    const history = messages.filter((m) => m.id !== 1).map((m) => ({ role: m.role, text: m.text }));
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await chatAPI.sendMessage({ message, history });
      if (data.success) setMessages((p) => [...p, { id: Date.now() + 1, role: 'model', text: data.message }]);
    } catch {
      toast.error('The assistant is unavailable right now. Please try again later.');
      setMessages((p) => p.filter((m) => m.id !== userMsg.id));
      setInput(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} aria-label="Open wellness chat"
          className="fixed bottom-5 right-5 z-40 h-14 pl-4 pr-5 rounded-full bg-lav-500 text-white shadow-lg hover:bg-lav-700 transition-colors flex items-center gap-2 border-0 font-semibold text-sm">
          <MessageCircleHeart size={22} /> <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}

      {isOpen && (
        <section role="dialog" aria-label="Wellness assistant"
          className="fixed z-50 bottom-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-[400px] h-[85vh] sm:h-[34rem] sm:max-h-[80vh] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-line flex flex-col overflow-hidden">
          <header className="px-5 py-4 bg-lav-500 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"><Sparkles size={18} /></div>
              <div><p className="font-bold text-sm m-0 leading-tight">Wellness companion</p><p className="text-xs text-lav-100 m-0">Supportive, not a substitute for therapy</p></div>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat" className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center text-white bg-transparent border-0"><X size={20} /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-canvas" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'self-end bg-brand-600 text-white rounded-br-md' : 'self-start bg-white text-ink border border-line rounded-bl-md'}`}>
                {m.role === 'model' ? <div className="[&_p]:m-0 [&_p+p]:mt-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:pl-5 [&_ol]:list-decimal"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown></div> : <p className="m-0 whitespace-pre-wrap">{m.text}</p>}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-1">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="chip">{s}</button>)}</div>
            )}
            {loading && <div className="self-start bg-white border border-line rounded-2xl rounded-bl-md px-4 py-3 flex gap-1" aria-label="Typing">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-lav-500/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 bg-white border-t border-line flex gap-2 shrink-0">
            <input className="input !rounded-full !py-2.5" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" aria-label="Message" disabled={loading} />
            <button disabled={!input.trim() || loading} aria-label="Send" className="w-11 h-11 rounded-full bg-lav-500 hover:bg-lav-700 text-white flex items-center justify-center shrink-0 border-0 disabled:opacity-50"><Send size={17} /></button>
          </form>
        </section>
      )}
    </>
  );
}
