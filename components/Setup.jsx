'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MEMBER_COLORS, MEMBER_EMOJIS, hashPin } from '../lib/utils';

const MAX_ADMINS = 2;

export default function Setup({ onComplete }) {
  const [step, setStep]       = useState('welcome'); // welcome | add | review
  const [members, setMembers] = useState([]);
  const [form, setForm]       = useState({ name:'', pin:'', confirmPin:'', role:'member', color: MEMBER_COLORS[0], emoji: MEMBER_EMOJIS[0] });
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  function set(k, v) { setForm(f => ({...f, [k]: v})); setError(''); }

  const adminCount = members.filter(m => m.role === 'admin').length;
  const usedColors = members.map(m => m.color);

  function addMember() {
    if (!form.name.trim()) return setError('Name is required');
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) return setError('PIN must be exactly 4 digits');
    if (form.pin !== form.confirmPin) return setError('PINs don\'t match');
    if (members.find(m => m.name.toLowerCase() === form.name.toLowerCase())) return setError('Name already used');
    if (form.role === 'admin' && adminCount >= MAX_ADMINS) return setError('Maximum 2 admins allowed');

    setMembers(prev => [...prev, { ...form, id: Date.now() }]);
    // Reset form for next member
    const nextColorIndex = (MEMBER_COLORS.indexOf(form.color) + 1) % MEMBER_COLORS.length;
    const nextColor = MEMBER_COLORS.find((c, i) => i >= nextColorIndex && !usedColors.includes(c)) || MEMBER_COLORS[nextColorIndex];
    setForm({ name:'', pin:'', confirmPin:'', role:'member', color: nextColor, emoji: MEMBER_EMOJIS[members.length + 1] || MEMBER_EMOJIS[0] });
    setError('');
  }

  function removeMember(id) {
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  async function launch() {
    if (members.length === 0) return setError('Add at least one member');
    if (!members.find(m => m.role === 'admin')) return setError('At least one admin is required');
    setSaving(true);
    try {
      const toInsert = await Promise.all(members.map(async m => ({
        name: m.name,
        color: m.color,
        emoji: m.emoji,
        role: m.role,
        pin_hash: await hashPin(m.pin),
      })));
      const { error } = await supabase.from('members').insert(toInsert);
      if (error) throw error;
      onComplete();
    } catch (e) {
      setError('Failed to save. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'welcome') return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-app">
      <div className="w-full max-w-sm slide-up text-center space-y-6">
        <div>
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h1 className="text-3xl font-bold text-primary mb-2">Family Budget</h1>
          <p className="text-secondary">Track spending together, keep some things private.</p>
        </div>
        <div className="card p-4 text-left space-y-3">
          {[['🔐','PIN login — each member has their own 4-digit PIN'],
            ['👥','Shared expenses split among the family'],
            ['🔒','Private expenses only you can see'],
            ['🛒','Live grocery list synced in real time'],
            ['📈','Monthly budgets with progress tracking']
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-xl">{icon}</span>
              <span className="text-secondary text-sm">{text}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setStep('add')}>Set Up Your Family →</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-app p-4 pb-8 overflow-y-auto">
      <div className="max-w-sm mx-auto space-y-5 pt-8 fade-in">

        <div>
          <h2 className="text-xl font-bold text-primary">Add Family Members</h2>
          <p className="text-muted text-sm mt-1">Up to 4 members · Max 2 admins</p>
        </div>

        {/* Existing members */}
        {members.length > 0 && (
          <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: m.color + '20', border: `2px solid ${m.color}50` }}>
                  {m.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: m.color }}>{m.name}</div>
                  <div className="text-xs text-muted">{m.role === 'admin' ? '👑 Admin' : '👤 Member'}</div>
                </div>
                <button onClick={() => removeMember(m.id)} className="text-muted hover:text-danger text-sm px-2 transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add member form */}
        {members.length < 4 && (
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-secondary">
              {members.length === 0 ? 'Add first member (will be Admin)' : `Add member ${members.length + 1}`}
            </h3>

            <input className="input" placeholder="Full name" value={form.name}
              onChange={e => set('name', e.target.value)} />

            {/* Emoji */}
            <div>
              <div className="section-label">Avatar</div>
              <div className="flex gap-2 flex-wrap">
                {MEMBER_EMOJIS.map(e => (
                  <button key={e} onClick={() => set('emoji', e)}
                    className="w-10 h-10 rounded-xl text-xl border transition-all"
                    style={{ borderColor: form.emoji===e ? 'var(--primary)' : 'var(--border)',
                             background: form.emoji===e ? 'var(--primary-subtle)' : 'transparent' }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <div className="section-label">Color</div>
              <div className="flex gap-2 flex-wrap">
                {MEMBER_COLORS.map(c => (
                  <button key={c} onClick={() => set('color', c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: form.color===c ? 'var(--text-primary)' : 'transparent',
                             opacity: usedColors.includes(c) && form.color !== c ? 0.3 : 1 }}>
                  </button>
                ))}
              </div>
            </div>

            {/* Role */}
            <div>
              <div className="section-label">Role</div>
              <div className="flex gap-2">
                {[['admin','👑 Admin'],['member','👤 Member']].map(([val, label]) => (
                  <button key={val}
                    onClick={() => set('role', val)}
                    disabled={val === 'admin' && adminCount >= MAX_ADMINS && form.role !== 'admin'}
                    className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all"
                    style={{ borderColor: form.role===val ? 'var(--primary)' : 'var(--border)',
                             background: form.role===val ? 'var(--primary-subtle)' : 'transparent',
                             color: form.role===val ? 'var(--primary-text)' : 'var(--text-secondary)',
                             opacity: val==='admin' && adminCount>=MAX_ADMINS && form.role!=='admin' ? 0.4 : 1 }}>
                    {label}
                  </button>
                ))}
              </div>
              {form.role === 'admin' && (
                <p className="text-xs text-muted mt-1.5">Admins manage budgets, members and can reset PINs</p>
              )}
            </div>

            {/* PIN */}
            <div>
              <div className="section-label">PIN</div>
              <div className="flex gap-2">
                <input className="input" type="password" inputMode="numeric" maxLength={4}
                  placeholder="4-digit PIN" value={form.pin} onChange={e => set('pin', e.target.value.replace(/\D/g,'').slice(0,4))} />
                <input className="input" type="password" inputMode="numeric" maxLength={4}
                  placeholder="Confirm PIN" value={form.confirmPin} onChange={e => set('confirmPin', e.target.value.replace(/\D/g,'').slice(0,4))} />
              </div>
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <button className="btn-primary" onClick={addMember}
              disabled={!form.name.trim() || form.pin.length !== 4}>
              + Add Member
            </button>
          </div>
        )}

        {/* Launch */}
        {members.length > 0 && (
          <div className="space-y-2 pt-2">
            {!members.find(m => m.role === 'admin') && (
              <p className="text-warning text-sm text-center">⚠️ At least one Admin is required</p>
            )}
            <button className="btn-primary" onClick={launch}
              disabled={saving || !members.find(m => m.role === 'admin')}>
              {saving ? 'Setting up...' : `Launch App with ${members.length} member${members.length>1?'s':''} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
