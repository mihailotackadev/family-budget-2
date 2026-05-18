import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function hashPin(pin) {
  const salt = 'fambud-2026-secure';
  const msgUint8 = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request) {
  try {
    const { pin } = await request.json();
    if (!pin || pin.length !== 4) {
      return Response.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    const pinHash = await hashPin(pin);
    const { data: member, error } = await supabase
      .from('members')
      .select('id, name, color, emoji, role, requires_pin_change')
      .eq('pin_hash', pinHash)
      .single();

    if (error || !member) {
      return Response.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    return Response.json({ member });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
