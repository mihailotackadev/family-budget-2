'use client';
import { useState, useEffect } from 'react';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinScreen({ onSuccess, appName = 'Family Budget' }) {
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockout, setLockout] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Lockout countdown
  useEffect(() => {
    if (lockout <= 0) return;
    const t = setTimeout(() => setLockout(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [lockout]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !loading) verify(pin);
  }, [pin]);

  function pressKey(key) {
    if (lockout > 0 || loading) return;
    if (key === '⌫') {
      setPin(p => p.slice(0,-1));
      setError('');
      return;
    }
    if (pin.length < 4) setPin(p => p + key);
  }

  async function verify(enteredPin) {
    setLoading(true);
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data.member);
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      setError(newAttempts >= 3 ? '' : 'Incorrect PIN');
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      if (newAttempts >= 3) {
        setLockout(30);
        setAttempts(0);
        setError('');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-app">
      <div className="w-full max-w-xs flex flex-col items-center gap-8 slide-up">

        {/* App icon + name */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-subtle flex items-center justify-center text-3xl mx-auto mb-3"
            style={{ background: 'var(--primary-subtle)', border: '1.5px solid var(--border)' }}>
            💰
          </div>
          <h1 className="text-xl font-bold text-primary">{appName}</h1>
          <p className="text-muted text-sm mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div className={`flex gap-4 ${shaking ? 'shake' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {/* Error / lockout message */}
        <div className="h-5 text-center">
          {lockout > 0 && (
            <p className="text-warning text-sm font-medium">
              Too many attempts — wait {lockout}s
            </p>
          )}
          {error && !lockout && (
            <p className="text-danger text-sm font-medium">{error}</p>
          )}
          {loading && (
            <p className="text-muted text-sm">Verifying...</p>
          )}
        </div>

        {/* PIN keypad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, i) => key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              className="pin-key"
              onClick={() => pressKey(key)}
              disabled={lockout > 0 || loading}
              style={{ opacity: lockout > 0 ? 0.4 : 1 }}
            >
              {key}
            </button>
          ))}
        </div>

        <p className="text-disabled text-xs">
          Forgot PIN? Ask your admin to reset it.
        </p>
      </div>
    </div>
  );
}
