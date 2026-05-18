'use client';

const TABS = [
  { id: 'dashboard', icon: '📊', label: 'Overview' },
  { id: 'add',       icon: '➕', label: 'Add' },
  { id: 'grocery',   icon: '🛒', label: 'Grocery' },
  { id: 'budget',    icon: '📈', label: 'Budget' },
  { id: 'settings',  icon: '⚙️',  label: 'Settings' },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-safe z-50"
      style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--border)' }}>
      <div className="flex items-stretch max-w-md mx-auto">
        {TABS.map(tab => {
          const isActive = active === tab.id;
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-opacity"
              style={{ opacity: isActive ? 1 : 0.5 }}>
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--primary-text)' : 'var(--text-muted)' }}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-8 h-0.5 rounded-full mt-0.5"
                  style={{ background: 'var(--primary)' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
