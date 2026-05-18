'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, getCategoryById, getMonthName, currentYearMonth } from '../lib/utils';

export default function Dashboard({ members, currentMember, currency }) {
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const now = currentYearMonth();
  const [year, setYear]   = useState(now.year);
  const [month, setMonth] = useState(now.month);

  useEffect(() => {
    load();
    const ch = supabase.channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [year, month, currentMember]);

  async function load() {
    setLoading(true);
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const end   = `${year}-${String(month).padStart(2,'0')}-31`;
    const [{ data: exp }, { data: bud }] = await Promise.all([
      supabase.from('expenses').select('*').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('monthly_budgets').select('*').eq('year', year).eq('month', month),
    ]);
    // Filter: hide private expenses that don't belong to current member
    const visible = (exp || []).filter(e =>
      !e.is_private || e.paid_by === currentMember?.id
    );
    setExpenses(visible);
    setBudgets(bud || []);
    setLoading(false);
  }

  const totalSpent   = expenses.reduce((s,e) => s + parseFloat(e.amount), 0);
  const totalBudget  = budgets.find(b => b.category === null)?.amount;
  const budgetPct    = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : null;
  const budgetColor  = !budgetPct ? 'var(--primary)' : budgetPct > 90 ? 'var(--danger)' : budgetPct > 70 ? 'var(--warning)' : 'var(--success)';

  // Per-member spend
  const memberSpend = {};
  members.forEach(m => { memberSpend[m.id] = 0; });
  expenses.forEach(e => {
    if (e.type === 'personal') {
      const mid = e.personal_member || e.paid_by;
      if (mid && memberSpend[mid] !== undefined) memberSpend[mid] += parseFloat(e.amount);
    } else {
      const share = parseFloat(e.amount) / members.length;
      members.forEach(m => { memberSpend[m.id] = (memberSpend[m.id] || 0) + share; });
    }
  });

  // Category spend
  const catSpend  = {};
  expenses.forEach(e => { catSpend[e.category] = (catSpend[e.category] || 0) + parseFloat(e.amount); });
  const catEntries = Object.entries(catSpend).sort((a,b) => b[1]-a[1]);

  const prevMonth = () => month===1 ? (setMonth(12),setYear(y=>y-1)) : setMonth(m=>m-1);
  const nextMonth = () => month===12 ? (setMonth(1),setYear(y=>y+1)) : setMonth(m=>m+1);
  const isNow = year===now.year && month===now.month;

  return (
    <div className="fade-in space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="btn-ghost px-3 py-2 text-lg">‹</button>
        <div className="text-center">
          <div className="font-semibold text-primary">{getMonthName(month)} {year}</div>
          {isNow && <div className="text-xs" style={{ color: 'var(--primary-text)' }}>This month</div>}
        </div>
        <button onClick={nextMonth} className="btn-ghost px-3 py-2 text-lg" disabled={isNow}>›</button>
      </div>

      {/* Total */}
      <div className="card p-5">
        <div className="section-label">Total Spent</div>
        <div className="text-3xl font-bold text-primary mb-3">{formatCurrency(totalSpent, currency)}</div>
        {totalBudget ? (
          <>
            <div className="progress-bar mb-2">
              <div className="progress-fill" style={{ width:`${budgetPct}%`, background: budgetColor }} />
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Budget: {formatCurrency(totalBudget, currency)}</span>
              <span style={{ color: budgetColor }}>{Math.round(budgetPct)}%</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted">No budget set — go to Budget to set one</p>
        )}
      </div>

      {/* Per member */}
      {members.length > 0 && (
        <div>
          <div className="section-label px-1">Per Member</div>
          <div className="grid grid-cols-2 gap-3">
            {members.map(m => (
              <div key={m.id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-sm font-medium text-secondary truncate">{m.name}</span>
                  {m.id === currentMember?.id && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--primary-subtle)', color: 'var(--primary-text)' }}>You</span>
                  )}
                </div>
                <div className="text-lg font-bold" style={{ color: m.color }}>
                  {formatCurrency(memberSpend[m.id] || 0, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {catEntries.length > 0 && (
        <div>
          <div className="section-label px-1">By Category</div>
          <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
            {catEntries.map(([catId, amt]) => {
              const cat = getCategoryById(catId);
              const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
              return (
                <div key={catId} className="flex items-center gap-3 p-3">
                  <span className="text-xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-secondary">{cat.label}</span>
                      <span className="text-sm font-semibold text-primary">{formatCurrency(amt, currency)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${pct}%`, background: cat.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent */}
      {expenses.length > 0 && (
        <div>
          <div className="section-label px-1">Recent Expenses</div>
          <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
            {expenses.slice(0,10).map(exp => {
              const cat   = getCategoryById(exp.category);
              const payer = members.find(m => m.id === exp.paid_by);
              return (
                <div key={exp.id} className="flex items-center gap-3 p-3">
                  <span className="text-lg">{exp.is_private ? '🔒' : cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-primary truncate">{exp.description}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {payer?.name} · {exp.type==='shared'?'👥 shared':'👤 personal'}{exp.is_private?' · 🔒':''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-primary whitespace-nowrap">
                    {formatCurrency(exp.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expenses.length === 0 && !loading && (
        <div className="card p-8 text-center text-muted">
          <div className="text-3xl mb-2">💸</div>
          <div className="text-secondary">No expenses this month</div>
          <div className="text-sm text-muted mt-1">Tap ➕ to add your first one</div>
        </div>
      )}
    </div>
  );
}
