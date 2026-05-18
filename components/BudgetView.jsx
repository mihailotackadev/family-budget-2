'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, getCategoryById, CATEGORIES, getMonthName, currentYearMonth } from '../lib/utils';

export default function BudgetView({ currency, currentMember }) {
  const isAdmin = currentMember?.role === 'admin';
  const now = currentYearMonth();
  const [year, setYear]     = useState(now.year);
  const [month, setMonth]   = useState(now.month);
  const [budgets, setBudgets]   = useState({});
  const [expenses, setExpenses] = useState([]);
  const [editing, setEditing]   = useState(null);
  const [editVal, setEditVal]   = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const end   = `${year}-${String(month).padStart(2,'0')}-31`;
    const [{ data: bud }, { data: exp }] = await Promise.all([
      supabase.from('monthly_budgets').select('*').eq('year', year).eq('month', month),
      supabase.from('expenses').select('*').gte('date', start).lte('date', end),
    ]);
    const budMap = {};
    (bud||[]).forEach(b => { budMap[b.category ?? 'total'] = b.amount; });
    setBudgets(budMap);
    setExpenses(exp||[]);
  }

  async function saveBudget(category, amount) {
    setSaving(true);
    const catKey = category==='total' ? null : category;
    await supabase.from('monthly_budgets').upsert(
      { year, month, category: catKey, amount: parseFloat(amount) },
      { onConflict: 'year,month,category' }
    );
    setBudgets(prev => ({...prev, [category]: parseFloat(amount)}));
    setEditing(null); setSaving(false);
  }

  async function removeBudget(category) {
    const catKey = category==='total' ? null : category;
    await supabase.from('monthly_budgets').delete().eq('year',year).eq('month',month).is('category',catKey);
    setBudgets(prev => { const n={...prev}; delete n[category]; return n; });
  }

  const catSpend   = {};
  expenses.forEach(e => { catSpend[e.category] = (catSpend[e.category]||0) + parseFloat(e.amount); });
  const totalSpent = expenses.reduce((s,e) => s+parseFloat(e.amount), 0);

  function BudgetRow({ label, icon, catKey, spent, budgetAmt }) {
    const pct   = budgetAmt ? Math.min((spent/budgetAmt)*100,100) : 0;
    const color = !budgetAmt ? 'var(--primary)' : pct>90 ? 'var(--danger)' : pct>70 ? 'var(--warning)' : 'var(--success)';
    const isEditing = editing===catKey;

    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium text-secondary">{label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {budgetAmt ? (
              <>
                <span className="text-muted">{formatCurrency(spent,currency)} / {formatCurrency(budgetAmt,currency)}</span>
                {isAdmin && <>
                  <button onClick={() => { setEditing(catKey); setEditVal(String(budgetAmt)); }} style={{ color:'var(--primary-text)' }}>Edit</button>
                  <button onClick={() => removeBudget(catKey)} className="text-muted hover:text-danger">✕</button>
                </>}
              </>
            ) : (
              <>
                <span className="text-muted">{formatCurrency(spent,currency)} spent</span>
                {isAdmin && <button onClick={() => { setEditing(catKey); setEditVal(''); }} style={{ color:'var(--primary-text)' }}>+ Set</button>}
              </>
            )}
          </div>
        </div>

        {isEditing && isAdmin && (
          <div className="flex gap-2 slide-up">
            <input autoFocus type="number" className="input flex-1 py-1.5 text-sm"
              placeholder={`Budget in ${currency}`} value={editVal} onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') saveBudget(catKey,editVal); if(e.key==='Escape') setEditing(null); }} />
            <button className="btn-primary w-16 text-sm py-1.5" disabled={!editVal||saving} onClick={() => saveBudget(catKey,editVal)}>Save</button>
            <button className="btn-ghost py-1.5 text-sm" onClick={() => setEditing(null)}>✕</button>
          </div>
        )}

        {budgetAmt && (
          <div className="space-y-1">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width:`${pct}%`, background: color }} />
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color }}>{Math.round(pct)}% used</span>
              <span className="text-muted">
                {budgetAmt>spent ? `${formatCurrency(budgetAmt-spent,currency)} left` : `${formatCurrency(spent-budgetAmt,currency)} over!`}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const prevMonth = () => month===1?(setMonth(12),setYear(y=>y-1)):setMonth(m=>m-1);
  const nextMonth = () => month===12?(setMonth(1),setYear(y=>y+1)):setMonth(m=>m+1);

  return (
    <div className="fade-in space-y-4">
      {!isAdmin && (
        <div className="card p-3 flex items-center gap-2"
          style={{ background:'var(--bg-subtle)', borderColor:'var(--border)' }}>
          <span>ℹ️</span>
          <span className="text-xs text-muted">Only admins can set budgets. You can view progress.</span>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="btn-ghost px-3 py-2 text-lg">‹</button>
        <div className="text-center font-semibold text-primary">{getMonthName(month)} {year}</div>
        <button onClick={nextMonth} className="btn-ghost px-3 py-2 text-lg">›</button>
      </div>

      <div>
        <div className="section-label px-1">Total Monthly Budget</div>
        <div className="card"><BudgetRow label="All Categories" icon="💰" catKey="total" spent={totalSpent} budgetAmt={budgets['total']} /></div>
      </div>

      <div>
        <div className="section-label px-1">By Category</div>
        <div className="card divide-y" style={{ borderColor:'var(--border)' }}>
          {CATEGORIES.map(cat => (
            <BudgetRow key={cat.id} label={cat.label} icon={cat.icon} catKey={cat.id} spent={catSpend[cat.id]||0} budgetAmt={budgets[cat.id]} />
          ))}
        </div>
      </div>
    </div>
  );
}
