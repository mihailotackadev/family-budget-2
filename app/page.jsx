'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PinScreen from '../components/PinScreen';
import Setup from '../components/Setup';
import BottomNav from '../components/BottomNav';
import Dashboard from '../components/Dashboard';
import AddExpense from '../components/AddExpense';
import GroceryList from '../components/GroceryList';
import BudgetView from '../components/BudgetView';
import MembersSettings from '../components/MembersSettings';

const TITLES = {
  dashboard: 'Overview',
  add:       'Add Expense',
  grocery:   'Grocery List',
  budget:    'Budget',
  settings:  'Settings',
};

export default function AppShell() {
  const [screen, setScreen]               = useState('loading'); // loading | setup | pin | app
  const [tab, setTab]                     = useState('dashboard');
  const [members, setMembers]             = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [currency, setCurrency]           = useState('RSD');
  const [theme, setTheme]                 = useState('dark');

  useEffect(() => {
    // Restore theme from localStorage
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);

    // Restore session from sessionStorage
    const session = sessionStorage.getItem('currentMember');
    if (session) {
      try { setCurrentMember(JSON.parse(session)); } catch {}
    }

    init();
  }, []);

  async function init() {
    const [{ data: mem }, { data: settings }] = await Promise.all([
      supabase.from('members').select('*').order('created_at'),
      supabase.from('app_settings').select('*'),
    ]);
    setMembers(mem || []);
    const cur = settings?.find(s => s.key==='currency')?.value;
    if (cur) setCurrency(cur);

    if (!mem || mem.length === 0) {
      setScreen('setup');
      return;
    }

    // Check for saved session
    const session = sessionStorage.getItem('currentMember');
    if (session) {
      try {
        const member = JSON.parse(session);
        // Verify member still exists
        if (mem.find(m => m.id === member.id)) {
          setCurrentMember(member);
          setScreen('app');
          return;
        }
      } catch {}
    }

    setScreen('pin');
  }

  async function loadMembers() {
    const [{ data: mem }, { data: settings }] = await Promise.all([
      supabase.from('members').select('*').order('created_at'),
      supabase.from('app_settings').select('*'),
    ]);
    setMembers(mem || []);
    const cur = settings?.find(s => s.key==='currency')?.value;
    if (cur) setCurrency(cur);
  }

  function handlePinSuccess(member) {
    setCurrentMember(member);
    sessionStorage.setItem('currentMember', JSON.stringify(member));
    setScreen('app');
  }

  function handleLock() {
    sessionStorage.removeItem('currentMember');
    setCurrentMember(null);
    setTab('dashboard');
    setScreen('pin');
  }

  function handleSetupComplete() {
    init();
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  // Loading
  if (screen === 'loading') return (
    <div className="min-h-dvh flex items-center justify-center bg-app">
      <div className="text-center">
        <div className="text-4xl mb-3">💰</div>
        <div className="text-sm text-muted">Loading...</div>
      </div>
    </div>
  );

  if (screen === 'setup') return <Setup onComplete={handleSetupComplete} />;
  if (screen === 'pin')   return <PinScreen onSuccess={handlePinSuccess} />;

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto bg-app">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 border-b"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-primary">{TITLES[tab]}</h1>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* Current user chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer"
              style={{ background: currentMember?.color+'20', color: currentMember?.color, border:`1px solid ${currentMember?.color}40` }}
              onClick={() => setTab('settings')}>
              {currentMember?.emoji} {currentMember?.name}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {tab === 'dashboard' && (
          <Dashboard members={members} currentMember={currentMember} currency={currency} />
        )}
        {tab === 'add' && (
          <AddExpense members={members} currentMember={currentMember} currency={currency}
            onAdded={() => setTab('dashboard')} />
        )}
        {tab === 'grocery' && (
          <GroceryList members={members} currentMember={currentMember} />
        )}
        {tab === 'budget' && (
          <BudgetView currency={currency} currentMember={currentMember} />
        )}
        {tab === 'settings' && (
          <MembersSettings
            members={members}
            currentMember={currentMember}
            currency={currency}
            theme={theme}
            onToggleTheme={toggleTheme}
            onUpdate={loadMembers}
            onLock={handleLock}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
