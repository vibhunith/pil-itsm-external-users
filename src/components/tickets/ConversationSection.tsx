'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCw, MessageSquare, ImagePlus, X, ZoomIn } from 'lucide-react';

interface Conversation {
  id: string;
  parentID: string;
  message: string;
  senderEmail: string;
  isFromExternalPortal: boolean;
  isPrivateNote: boolean;
  created: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

interface Props {
  ticketId: string;
  currentUserEmail: string;
  apiBase?: string;
}

export default function ConversationSection({ ticketId, currentUserEmail, apiBase = '/api/tickets' }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);
  const [pendingImages, setPendingImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/${ticketId}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  // Track whether editor has content
  function handleEditorInput() {
    const text = editorRef.current?.innerText?.trim() ?? '';
    setIsEmpty(text.length === 0 && pendingImages.length === 0);
  }

  // Handle image paste into editor
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((i) => i.type.startsWith('image/'));
    if (!imageItem) return; // let default paste handle text

    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    readImageFile(file);
  }

  function readImageFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPendingImages((prev) => [...prev, { dataUrl, name: file.name || 'screenshot.png' }]);
      setIsEmpty(false);
    };
    reader.readAsDataURL(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      if (f.type.startsWith('image/')) readImageFile(f);
    });
    e.target.value = '';
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const text = editorRef.current?.innerText?.trim() ?? '';
      setIsEmpty(text.length === 0 && next.length === 0);
      return next;
    });
  }

  async function handleSend() {
    const textHtml = editorRef.current?.innerHTML ?? '';
    const textPlain = editorRef.current?.innerText?.trim() ?? '';
    if (!textPlain && pendingImages.length === 0) return;

    // Build HTML message: text + embedded base64 images
    let htmlMessage = textHtml;
    for (const img of pendingImages) {
      htmlMessage += `<br/><img src="${img.dataUrl}" alt="${img.name}" style="max-width:100%;border-radius:6px;margin-top:8px;" />`;
    }

    setSending(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/${ticketId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: htmlMessage }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to send message');
        return;
      }
      // Clear editor
      if (editorRef.current) editorRef.current.innerHTML = '';
      setPendingImages([]);
      setIsEmpty(true);
      await fetchConversations();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !isEmpty && !sending;

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-700">
            Conversation
            {conversations.length > 0 && (
              <span className="ml-1.5 text-xs font-medium text-gray-400">({conversations.length})</span>
            )}
          </h2>
        </div>
        <button
          onClick={() => { setLoading(true); fetchConversations(); }}
          className="text-gray-400 hover:text-[#003087] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-96">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No messages yet. Start the conversation below.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isMe = conv.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase();
            const html = isHtml(conv.message);
            return (
              <div key={conv.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className={`text-xs text-gray-400 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {isMe ? 'You' : conv.senderEmail}
                  </span>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
                      isMe
                        ? 'bg-[#003087] text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    {html ? (
                      <div
                        className="prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded [&_img]:mt-2 [&_img]:cursor-zoom-in"
                        dangerouslySetInnerHTML={{ __html: conv.message }}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'IMG') {
                            setLightboxSrc((target as HTMLImageElement).src);
                          }
                        }}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{conv.message}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 px-1">{formatTime(conv.created)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="border-t border-gray-100 p-4 space-y-2">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Pending image previews */}
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Rich compose box */}
          <div className="flex-1 relative">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              data-placeholder="Type a message or paste a screenshot… (Ctrl+Enter to send)"
              className="min-h-[72px] max-h-40 overflow-y-auto rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#003087]/30 focus:border-[#003087] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
            />
            {/* Image attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 text-gray-400 hover:text-[#003087] transition-colors"
              title="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-[#003087] text-white hover:bg-[#002060] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending
              ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>

        <p className="text-[11px] text-gray-400">
          Paste or attach screenshots (max 5 MB each). Ctrl+Enter to send.
        </p>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-7 w-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-white/60 text-xs">
            <ZoomIn className="h-3.5 w-3.5" />
            Click outside to close
          </div>
        </div>
      )}
    </div>
  );
}
