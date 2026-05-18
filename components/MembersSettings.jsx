'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MEMBER_COLORS, MEMBER_EMOJIS, hashPin } from '../lib/utils';

export default function MembersSettings({ members, currentMember, currency, theme, onToggleTheme, onUpdate, onLock }) {
  const isAdmin = currentMember?.role === 'admin';
  const [currencyVal, setCurrencyVal] = useState(currency);
  const [editId, setEditId]           = useState(null);
  const [editName, setEditName]       = useState('');
  const [resetId, setResetId]         = useState(null);
  const [newPin, setNewPin]           = useState('');
  const [confirmPin, setConfirmPin]   = useState('');
  const [addMode, setAddMode]         = useState(false);
  const [newMember, setNewMember]     = useState({ name:'', pin:'', confirmPin:'', role:'member', color: MEMBER_COLORS[3], emoji: MEMBER_EMOJIS[3] });
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [pinSuccess, setPinSuccess]   = useState('');

  const adminCount = members.filter(m => m.role==='admin').length;

  async function updateName(id) {
    if (!editName.trim()) return;
    await supabase.from('members').update({ name: editName }).eq('id', id);
    setEditId(null); onUpdate();
  }

  async function resetPin(id) {
    if (newPin.length!==4) return setError('PIN must be 4 digits');
    if (newPin!==confirmPin) return setError('PINs don\'t match');
    setSaving(true);
    const pin_hash = await hashPin(newPin);
    await supabase.from('members').update({ pin_hash, requires_pin_change: true }).eq('id', id);
    setResetId(null); setNewPin(''); setConfirmPin(''); setError('');
    setPinSuccess('PIN reset! Share the new PIN with the member.');
    setTimeout(() => setPinSuccess(''), 3000);
    setSaving(false);
  }

  async function deleteMember(id) {
    if (id === currentMember?.id) return setError("You can't delete yourself");
    if (!confirm('Remove this member? Their expenses will remain but won\'t be assigned.')) return;
    await supabase.from('members').delete().eq('id', id);
    onUpdate();
  }

  async function saveCurrency() {
    await supabase.from('app_settings').upsert({ key:'currency', value: currencyVal });
    onUpdate();
  }

  async function addMemberSubmit() {
    if (!newMember.name.trim()) return setError('Name required');
    if (newMember.pin.length!==4) return setError('PIN must be 4 digits');
    if (newMember.pin!==newMember.confirmPin) return setError('PINs don\'t match');
    if (newMember.role==='admin' && adminCount>=2) return setError('Maximum 2 admins allowed');
    setSaving(true);
    const pin_hash = await hashPin(newMember.pin);
    await supabase.from('members').insert({ name:newMember.name, color:newMember.color, emoji:newMember.emoji, role:newMember.role, pin_hash });
    setAddMode(false); setNewMember({ name:'', pin:'', confirmPin:'', role:'member', color:MEMBER_COLORS[3], emoji:MEMBER_EMOJIS[3] }); setError('');
    setSaving(false); onUpdate();
  }

  function NM(k,v) { setNewMember(p=>({...p,[k]:v})); setError(''); }

  return (
    <div className="fade-in space-y-5">
      {/* Current member badge */}
      <div className="card p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: currentMember?.color+'20', border:`2px solid ${currentMember?.color}40` }}>
            {currentMember?.emoji}
          </div>
          <div>
            <div className="text-sm font-semibold text-primary">{currentMember?.name}</div>
            <div className="text-xs text-muted">{currentMember?.role==='admin'?'👑 Admin':'👤 Member'}</div>
          </div>
        </div>
        <button onClick={onLock} className="btn-ghost text-sm px-3 py-2">🔒 Lock</button>
      </div>

      {/* Theme toggle */}
      <div>
        <div className="section-label">Appearance</div>
        <div className="card p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-primary">{theme==='dark' ? '🌙 Dark mode' : '☀️ Light mode'}</div>
            <div className="text-xs text-muted mt-0.5">Changes how the app looks</div>
          </div>
          <button onClick={onToggleTheme}
            className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: theme==='dark' ? 'var(--primary)' : 'var(--border-strong)' }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: theme==='dark' ? '26px' : '2px' }} />
          </button>
        </div>
      </div>

      {pinSuccess && (
        <div className="card p-3 text-center text-sm font-medium"
          style={{ background:'var(--success-subtle)', borderColor:'var(--success)', color:'var(--success)' }}>
          ✅ {pinSuccess}
        </div>
      )}

      {/* Members list */}
      <div>
        <div className="section-label">Family Members</div>
        <div className="card divide-y" style={{ borderColor:'var(--border)' }}>
          {members.map((m,i) => (
            <div key={m.id} className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: m.color+'20', border:`2px solid ${m.color}40` }}>
                  {m.emoji}
                </div>
                {editId===m.id ? (
                  <div className="flex-1 flex gap-2">
                    <input autoFocus className="input flex-1 py-1.5 text-sm" value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter') updateName(m.id); if(e.key==='Escape') setEditId(null); }} />
                    <button onClick={() => updateName(m.id)} style={{ color:'var(--primary-text)', fontSize:12 }}>Save</button>
                    <button onClick={() => setEditId(null)} className="text-muted text-xs">✕</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: m.color }}>
                        {m.name} {m.id===currentMember?.id && <span className="text-xs text-muted">(You)</span>}
                      </div>
                      <div className="text-xs text-muted">{m.role==='admin'?'👑 Admin':'👤 Member'}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditId(m.id); setEditName(m.name); }}
                          className="text-xs" style={{ color:'var(--primary-text)' }}>Edit</button>
                        <button onClick={() => { setResetId(resetId===m.id?null:m.id); setNewPin(''); setConfirmPin(''); setError(''); }}
                          className="text-xs text-muted">PIN</button>
                        {m.id!==currentMember?.id && (
                          <button onClick={() => deleteMember(m.id)} className="text-xs text-danger">✕</button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* PIN reset panel */}
              {resetId===m.id && isAdmin && (
                <div className="slide-up space-y-2 pt-1 pl-13">
                  <p className="text-xs text-muted">Reset PIN for {m.name}. They'll be prompted to change it on next login.</p>
                  <div className="flex gap-2">
                    <input className="input flex-1 py-1.5 text-sm" type="password" inputMode="numeric"
                      maxLength={4} placeholder="New PIN" value={newPin}
                      onChange={e => { setNewPin(e.target.value.replace(/\D/g,'').slice(0,4)); setError(''); }} />
                    <input className="input flex-1 py-1.5 text-sm" type="password" inputMode="numeric"
                      maxLength={4} placeholder="Confirm" value={confirmPin}
                      onChange={e => { setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4)); setError(''); }} />
                  </div>
                  {error && <p className="text-danger text-xs">{error}</p>}
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1 py-2 text-sm" onClick={() => resetPin(m.id)} disabled={newPin.length!==4||saving}>
                      {saving?'Saving...':'Reset PIN'}
                    </button>
                    <button className="btn-ghost py-2 text-sm" onClick={() => setResetId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add member */}
      {isAdmin && members.length < 4 && (
        <div>
          {!addMode ? (
            <button className="btn-ghost w-full" onClick={() => setAddMode(true)}>+ Add Member</button>
          ) : (
            <div className="card p-4 space-y-3 slide-up">
              <h3 className="text-sm font-semibold text-secondary">New Member</h3>
              <input className="input" placeholder="Name" value={newMember.name} onChange={e => NM('name',e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                {MEMBER_EMOJIS.map(e => (
                  <button key={e} onClick={() => NM('emoji',e)}
                    className="w-9 h-9 rounded-xl text-lg border transition-all"
                    style={{ borderColor: newMember.emoji===e?'var(--primary)':'var(--border)',
                             background: newMember.emoji===e?'var(--primary-subtle)':'transparent' }}>
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {MEMBER_COLORS.map(c => (
                  <button key={c} onClick={() => NM('color',c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background:c, borderColor:newMember.color===c?'var(--text-primary)':'transparent' }} />
                ))}
              </div>
              <div className="flex gap-2">
                {[['admin','👑 Admin'],['member','👤 Member']].map(([val,label]) => (
                  <button key={val} onClick={() => NM('role',val)}
                    disabled={val==='admin'&&adminCount>=2}
                    className="flex-1 py-2 rounded-xl border text-sm transition-all"
                    style={{ borderColor:newMember.role===val?'var(--primary)':'var(--border)',
                             background:newMember.role===val?'var(--primary-subtle)':'transparent',
                             color:newMember.role===val?'var(--primary-text)':'var(--text-secondary)',
                             opacity:val==='admin'&&adminCount>=2?0.4:1 }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input" type="password" inputMode="numeric" maxLength={4}
                  placeholder="PIN" value={newMember.pin} onChange={e => NM('pin',e.target.value.replace(/\D/g,'').slice(0,4))} />
                <input className="input" type="password" inputMode="numeric" maxLength={4}
                  placeholder="Confirm" value={newMember.confirmPin} onChange={e => NM('confirmPin',e.target.value.replace(/\D/g,'').slice(0,4))} />
              </div>
              {error && <p className="text-danger text-sm">{error}</p>}
              <div className="flex gap-2">
                <button className="btn-primary flex-1" onClick={addMemberSubmit} disabled={!newMember.name.trim()||newMember.pin.length!==4||saving}>
                  {saving?'Adding...':'Add Member'}
                </button>
                <button className="btn-ghost" onClick={() => { setAddMode(false); setError(''); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Currency */}
      {isAdmin && (
        <div>
          <div className="section-label">Currency</div>
          <div className="card p-3 flex gap-2">
            <input className="input flex-1" value={currencyVal}
              onChange={e => setCurrencyVal(e.target.value.toUpperCase().slice(0,5))} placeholder="RSD, EUR, USD" />
            <button className="btn-ghost" onClick={saveCurrency}>Save</button>
          </div>
        </div>
      )}

      {/* Install */}
      <div>
        <div className="section-label">Install App</div>
        <div className="card p-4 space-y-1.5">
          <div className="text-xs text-secondary">📱 iPhone: Safari → Share → Add to Home Screen</div>
          <div className="text-xs text-secondary">🤖 Android: Chrome menu → Add to Home Screen</div>
        </div>
      </div>
    </div>
  );
}
