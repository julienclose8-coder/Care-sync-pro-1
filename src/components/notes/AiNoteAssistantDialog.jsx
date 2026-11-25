import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, Send, RotateCcw, FileText, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { NOTE_CATEGORIES, BEHAVIOURAL_SUBTYPES, categoryLabel } from '@/components/notes/noteCategories';
import MobileSelect from '@/components/mobile/MobileSelect';
import { toast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';

export default function AiNoteAssistantDialog({ open, onOpenChange, client, clientName, shift, onSaved }) {
  const [category, setCategory] = useState('support');
  const [subtype, setSubtype] = useState('positive');
  const [phase, setPhase] = useState('setup');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCategory('support'); setSubtype('positive'); setPhase('setup');
      setMessages([]); setInput(''); setDraft(''); setError('');
    }
  }, [open]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  const compile = async (history) => {
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('careNoteAssistant', {
        action: 'compile', category, behavioural_subtype: category === 'behavioural' ? subtype : '',
        client_id: client?.id, shift_id: shift?.id || '', messages: history,
      });
      setDraft(res.data.content || '');
      setPhase('review');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to generate the note.');
    } finally { setLoading(false); }
  };

  const ask = async (nextMessages) => {
    setLoading(true); setError('');
    try {
      const res = await base44.functions.invoke('careNoteAssistant', {
        action: 'ask', category, behavioural_subtype: category === 'behavioural' ? subtype : '',
        client_id: client?.id, shift_id: shift?.id || '', messages: nextMessages,
      });
      const data = res.data;
      if (data.complete) {
        await compile(nextMessages);
      } else {
        setMessages([...nextMessages, { role: 'assistant', text: data.question, topic: data.topic }]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reach the AI assistant.');
    } finally { setLoading(false); }
  };

  const start = () => { setPhase('collect'); ask([]); };

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', text }];
    setMessages(next); setInput('');
    ask(next);
  };

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true); setError('');
    try {
      await base44.functions.invoke('careNotes', {
        action: 'save', client_id: client?.id, shift_id: shift?.id || '',
        note_category: category, behavioural_subtype: category === 'behavioural' ? subtype : '',
        content: draft.trim(), status: 'draft',
      });
      toast({ title: 'Draft saved', description: `${categoryLabel(category)} draft saved for you to review and edit.` });
      await onSaved?.(); onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save the note.');
    } finally { setSaving(false); }
  };

  const restart = () => { setMessages([]); setDraft(''); setPhase('setup'); setError(''); setInput(''); };
  const close = () => { if (!loading && !saving) onOpenChange(false); };
  const clientId = client?.id;

  return <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
    <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-lg grid-cols-1 max-h-[92dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI note assistant</DialogTitle>
        <DialogDescription>{clientName || client?.full_name || 'Client'}{shift ? ` · ${formatDate(shift.date)}` : ''} · Guided Q&A drafts the note for you.</DialogDescription>
      </DialogHeader>

      {!clientId && <p className="text-sm text-destructive">Select a client first.</p>}

      {clientId && phase === 'setup' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Note category</Label>
            <MobileSelect value={category} onValueChange={setCategory} options={NOTE_CATEGORIES.filter(([v]) => v !== 'general').map(([value, label]) => ({ value, label }))} />
          </div>
          {category === 'behavioural' && (
            <div className="space-y-2"><Label>Behaviour type</Label><MobileSelect value={subtype} onValueChange={setSubtype} options={BEHAVIOURAL_SUBTYPES.map(([value, label]) => ({ value, label }))} /></div>
          )}
          {category === 'locked_concern' && <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />Locked notes of concern are private. Only you can see them.</div>}
          <Button onClick={start} disabled={loading}><Sparkles className="mr-1 h-4 w-4" />Start</Button>
        </div>
      )}

      {clientId && phase === 'collect' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{categoryLabel(category)}</Badge>
            {category === 'behavioural' && <Badge variant="outline">{subtype === 'positive' ? 'Positive' : 'Negative'}</Badge>}
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={restart} disabled={loading}><RotateCcw className="mr-1 h-3 w-3" />Restart</Button>
          </div>
          <div ref={scrollRef} className="max-h-[40dvh] space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
            {messages.length === 0 && !loading && <p className="text-sm text-muted-foreground">Thinking of the first question…</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
                  {m.role === 'assistant' && m.topic && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.topic}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="rounded-xl border bg-card px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div></div>}
          </div>
          <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Type your answer…" rows={2} disabled={loading} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} className="min-h-[44px]" />
          <div className="flex items-center justify-between gap-2">
            <Button onClick={send} disabled={loading || !input.trim()}><Send className="mr-1 h-4 w-4" />Send</Button>
            <Button variant="outline" onClick={() => compile(messages)} disabled={loading || messages.filter(m => m.role === 'user').length === 0}><FileText className="mr-1 h-4 w-4" />Generate note</Button>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {clientId && phase === 'review' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5"><Badge variant="secondary">{categoryLabel(category)}</Badge>{category === 'behavioural' && <Badge variant="outline">{subtype === 'positive' ? 'Positive' : 'Negative'}</Badge>}</div>
          <Label htmlFor="ai-note-draft">Draft note — review and edit before saving</Label>
          <Textarea id="ai-note-draft" value={draft} onChange={e => setDraft(e.target.value)} rows={8} maxLength={20000} className="min-h-[160px]" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={restart} disabled={saving}><RotateCcw className="mr-1 h-4 w-4" />Start over</Button>
            <Button onClick={save} disabled={saving || !draft.trim()}>{saving ? 'Saving…' : 'Save as draft'}</Button>
          </div>
        </div>
      )}

      <DialogFooter><Button variant="ghost" onClick={close} disabled={loading || saving}>Close</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}