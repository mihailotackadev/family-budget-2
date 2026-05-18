'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../lib/utils';
import ReceiptScanner from './ReceiptScanner';

export default function AddExpense({ members, currentMember, currency, onAdded }) {
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [form, setForm] = useState({
    description: '', amount: '',
    paid_by: currentMember?.id || members[0]?.id || '',
    category: 'food', type: 'shared',
    personal_member: currentMember?.id || members[0]?.id || '',
    is_private: false,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  function set(k, v) { setForm(f => ({...f, [k]: v})); }

  async function saveExpense(desc, amount, category, isPrivate = false) {
    const payload = {
      description: desc, amount: parseFloat(amount),
      paid_by: form.paid_by, category,
      type: isPrivate ? 'personal' : form.type,
      personal_member: (isPrivate || form.type==='personal') ? (isPrivate ? form.paid_by : form.personal_member) : null,
      is_private: isPrivate || form.is_private,
      date: form.date, notes: form.notes || null,
    };
    const { data: exp, error } = await supabase.from('expenses').insert(payload).select().single();
    if (error) throw error;
    if (!isPrivate && form.type==='shared' && members.length>0) {
      const splitAmt = parseFloat(amount) / members.length;
      await supabase.from('expense_splits').insert(
        members.map(m => ({ expense_id: exp.id, member_id: m.id, amount: splitAmt }))
      );
    }
  }

  async function handleSubmit() {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      await saveExpense(form.description, form.amount, form.category, form.is_private);
      setForm(f => ({ ...f, description:'', amount:'', notes:'', is_private: false }));
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onAdded?.(); }, 1500);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleScanned(items) {
    setSaving(true); setScanning(false);
    try {
      for (const item of items) await saveExpense(item.description, item.amount, item.category);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onAdded?.(); }, 1500);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (scanning) return (
    <div className="card p-4 fade-in">
      <ReceiptScanner onItemsScanned={handleScanned} onClose={() => setScanning(false)} />
    </div>
  );

  if (success) return (
    <div className="fade-in text-center py-16">
      <div className="text-5xl mb-3">✅</div>
      <div className="text-xl font-bold text-primary mb-1">Added!</div>
      <div className="text-muted text-sm">Going to overview...</div>
    </div>
  );

  return (
    <div className="fade-in space-y-4">
      {/* Scanner CTA */}
      <button onClick={() => setScanning(true)}
        className="card w-full flex items-center gap-3 p-4 hover:border-primary transition-colors text-left"
        style={{ borderColor: 'var(--border)' }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: 'var(--primary-subtle)', border: '1px solid var(--border)' }}>📷</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-primary">Scan Receipt</div>
          <div className="text-xs text-muted mt-0.5">AI reads items automatically · up to 3 photos</div>
        </div>
        <span className="text-muted">›</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs text-muted">or add manually</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <input className="input" placeholder="Description" value={form.description} onChange={e => set('description', e.target.value)} />

      <div className="flex gap-2">
        <input type="number" className="input" placeholder={`Amount (${currency})`} value={form.amount} onChange={e => set('amount', e.target.value)} />
        <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} style={{ width: 152 }} />
      </div>

      {/* Category */}
      <div>
        <div className="section-label">Category</div>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => set('category', cat.id)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
              style={{ borderColor: form.category===cat.id ? cat.color : 'var(--border)',
                       background: form.category===cat.id ? cat.color+'20' : 'transparent' }}>
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[9px] text-muted text-center leading-tight">{cat.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      <div>
        <div className="section-label">Paid by</div>
        <div className="flex gap-2 flex-wrap">
          {members.map(m => (
            <button key={m.id} onClick={() => set('paid_by', m.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all"
              style={{ borderColor: form.paid_by===m.id ? m.color : 'var(--border)',
                       background: form.paid_by===m.id ? m.color+'20' : 'transparent',
                       color: form.paid_by===m.id ? m.color : 'var(--text-secondary)' }}>
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Type + Private */}
      <div className="space-y-2">
        <div className="section-label">Type</div>
        <div className="flex gap-2">
          {[['shared','👥 Shared'],['personal','👤 Personal']].map(([val, label]) => (
            <button key={val} onClick={() => { set('type', val); set('is_private', false); }}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{ borderColor: form.type===val&&!form.is_private ? 'var(--primary)' : 'var(--border)',
                       background: form.type===val&&!form.is_private ? 'var(--primary-subtle)' : 'transparent',
                       color: form.type===val&&!form.is_private ? 'var(--primary-text)' : 'var(--text-secondary)' }}>
              {label}
            </button>
          ))}
          <button onClick={() => set('is_private', !form.is_private)}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all"
            style={{ borderColor: form.is_private ? '#7c3aed' : 'var(--border)',
                     background: form.is_private ? '#7c3aed20' : 'transparent',
                     color: form.is_private ? '#a78bfa' : 'var(--text-secondary)' }}>
            🔒 Private
          </button>
        </div>
        {form.is_private && (
          <p className="text-xs text-muted px-1">Only you can see this expense</p>
        )}
        {form.type === 'personal' && !form.is_private && (
          <div>
            <div className="section-label mt-2">For whom?</div>
            <div className="flex gap-2 flex-wrap">
              {members.map(m => (
                <button key={m.id} onClick={() => set('personal_member', m.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all"
                  style={{ borderColor: form.personal_member===m.id ? m.color : 'var(--border)',
                           background: form.personal_member===m.id ? m.color+'20' : 'transparent',
                           color: form.personal_member===m.id ? m.color : 'var(--text-secondary)' }}>
                  {m.emoji} {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <textarea className="input resize-none" placeholder="Notes (optional)" rows={2}
        value={form.notes} onChange={e => set('notes', e.target.value)} />

      <button className="btn-primary" onClick={handleSubmit}
        disabled={!form.description.trim() || !form.amount || saving}>
        {saving ? 'Saving...' : 'Add Expense'}
      </button>
    </div>
  );
}
