'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function GroceryList({ members, currentMember }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState('');
  const [qty,     setQty]     = useState('');
  const [adding,  setAdding]  = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    load();
    const ch = supabase.channel('grocery')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'grocery_items' },
        p => setItems(prev => prev.find(i=>i.id===p.new.id) ? prev : [...prev, p.new].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'grocery_items' },
        p => setItems(prev => prev.map(i => i.id===p.new.id ? p.new : i)))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'grocery_items' },
        p => setItems(prev => prev.filter(i => i.id!==p.old.id)))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function load() {
    const { data } = await supabase.from('grocery_items').select('*').order('created_at');
    setItems(data || []); setLoading(false);
  }

  async function addItem() {
    if (!name.trim()) return;
    setAdding(true);
    await supabase.from('grocery_items').insert({
      name: name.trim(), quantity: qty.trim()||null,
      added_by: currentMember?.name || null,
    });
    setName(''); setQty('');
    setAdding(false);
    inputRef.current?.focus();
  }

  async function toggleItem(item) {
    const checked = !item.is_checked;
    await supabase.from('grocery_items').update({
      is_checked: checked,
      checked_by: checked ? (currentMember?.name||null) : null,
      checked_at: checked ? new Date().toISOString() : null,
    }).eq('id', item.id);
  }

  async function deleteItem(id) { await supabase.from('grocery_items').delete().eq('id', id); }
  async function clearChecked() { await supabase.from('grocery_items').delete().eq('is_checked', true); }

  const unchecked = items.filter(i => !i.is_checked);
  const checked   = items.filter(i => i.is_checked);

  return (
    <div className="fade-in space-y-4">
      {/* Add form */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <input ref={inputRef} className="input" style={{ width: 72, flex: 'none' }}
            placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)}
            onKeyDown={e => e.key==='Enter' && inputRef.current?.focus()} />
          <input className="input flex-1" placeholder="Add item..."
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key==='Enter' && addItem()} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted whitespace-nowrap">Adding as:</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: currentMember?.color+'20', color: currentMember?.color, border: `1px solid ${currentMember?.color}40` }}>
            {currentMember?.emoji} {currentMember?.name}
          </div>
        </div>
        <button className="btn-primary" onClick={addItem} disabled={!name.trim()||adding}>
          {adding ? 'Adding...' : '+ Add to List'}
        </button>
      </div>

      {/* Live sync indicator */}
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full pulse-anim" style={{ background: 'var(--success)' }} />
        <span className="text-xs text-muted">Live sync · updates instantly on all devices</span>
      </div>

      {unchecked.length > 0 && (
        <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
          {unchecked.map((item, i) => (
            <GroceryRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
          ))}
        </div>
      )}

      {unchecked.length===0 && checked.length===0 && !loading && (
        <div className="card p-8 text-center text-muted">
          <div className="text-3xl mb-2">🛒</div>
          <div className="text-secondary">List is empty</div>
          <div className="text-sm text-muted mt-1">Add items above</div>
        </div>
      )}

      {unchecked.length===0 && checked.length>0 && (
        <div className="card p-6 text-center">
          <div className="text-2xl mb-1">🎉</div>
          <div className="text-secondary text-sm">All done!</div>
        </div>
      )}

      {checked.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="section-label" style={{ margin:0 }}>Bought ({checked.length})</div>
            <button onClick={clearChecked} className="text-xs text-danger hover:opacity-80">Clear all</button>
          </div>
          <div className="card divide-y opacity-60" style={{ borderColor: 'var(--border)' }}>
            {checked.map(item => <GroceryRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function GroceryRow({ item, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <button onClick={() => onToggle(item)}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2"
        style={{ borderColor: item.is_checked ? 'var(--success)' : 'var(--border-strong)',
                 background: item.is_checked ? 'var(--success-subtle)' : 'transparent' }}>
        {item.is_checked && <span className="text-xs" style={{ color:'var(--success)' }}>✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm" style={{ color: item.is_checked ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: item.is_checked ? 'line-through' : 'none' }}>
          {item.name}
          {item.quantity && <span className="text-muted ml-1.5 text-xs">× {item.quantity}</span>}
        </span>
        {(item.added_by||item.checked_by) && (
          <div className="text-xs text-muted mt-0.5">
            {item.checked_by ? `✓ ${item.checked_by}` : `+ ${item.added_by}`}
          </div>
        )}
      </div>
      <button onClick={() => onDelete(item.id)}
        className="text-muted hover:text-danger px-1 text-sm transition-colors">✕</button>
    </div>
  );
}
