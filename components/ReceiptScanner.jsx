'use client';
import { useState, useRef } from 'react';
import { CATEGORIES } from '../lib/utils';

export default function ReceiptScanner({ onItemsScanned, onClose }) {
  const [photos,   setPhotos]   = useState([]);
  const [scanning, setScanning] = useState(false);
  const [items,    setItems]    = useState(null);
  const [error,    setError]    = useState('');
  const fileRef = useRef();

  function addPhotos(files) {
    Array.from(files).slice(0, 3 - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setPhotos(p => [...p, { file, dataUrl: e.target.result }]);
      reader.readAsDataURL(file);
    });
  }

  async function scan() {
    setScanning(true); setError('');
    try {
      const images = photos.map(p => {
        const [header, data] = p.dataUrl.split(',');
        return { data, mediaType: header.match(/data:(.*);/)[1] };
      });
      const res  = await fetch('/api/scan-receipt', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ images }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setItems(json.items);
    } catch { setError('Could not scan receipt. Try again or add manually.'); }
    finally { setScanning(false); }
  }

  function updateItem(i, k, v) { setItems(p => p.map((it,idx) => idx===i ? {...it,[k]:v} : it)); }
  function removeItem(i) { setItems(p => p.filter((_,idx) => idx!==i)); }

  if (items) return (
    <div className="slide-up space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary">Review Items ({items.length})</h3>
        <button onClick={() => setItems(null)} className="text-xs text-muted">← Rescan</button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="card-sm p-3 space-y-2">
            <div className="flex gap-2 items-start">
              <input className="input flex-1 text-sm py-1.5" value={item.description}
                onChange={e => updateItem(i,'description',e.target.value)} />
              <button onClick={() => removeItem(i)} className="text-muted hover:text-danger mt-1 px-1 transition-colors">✕</button>
            </div>
            <div className="flex gap-2">
              <input type="number" className="input w-28 text-sm py-1.5" value={item.amount}
                onChange={e => updateItem(i,'amount',parseFloat(e.target.value))} />
              <select className="input flex-1 text-sm py-1.5" value={item.category}
                onChange={e => updateItem(i,'category',e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1" onClick={() => onItemsScanned(items)}>
          Add {items.length} item{items.length!==1?'s':''}
        </button>
      </div>
    </div>
  );

  return (
    <div className="slide-up space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary">Scan Receipt</h3>
        <button onClick={onClose} className="text-muted text-sm">Cancel</button>
      </div>
      <p className="text-xs text-muted">Up to 3 photos for long receipts. Overlap photos by ~20%.</p>
      <button onClick={() => fileRef.current?.click()} disabled={photos.length>=3}
        className="w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors"
        style={{ borderColor: 'var(--border)', borderStyle: 'dashed' }}>
        <div className="text-2xl mb-1">📷</div>
        <div className="text-sm text-muted">
          {photos.length===0 ? 'Tap to add photo(s)' : `Add more (${photos.length}/3)`}
        </div>
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => addPhotos(e.target.files)} />
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={p.dataUrl} className="w-20 h-28 object-cover rounded-lg" alt={`Receipt ${i+1}`} />
              <button onClick={() => setPhotos(prev => prev.filter((_,idx) => idx!==i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                style={{ background: 'var(--danger)' }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-danger text-sm">{error}</p>}
      <button className="btn-primary" onClick={scan} disabled={photos.length===0||scanning}>
        {scanning ? '🔍 Scanning...' : `Scan ${photos.length>0?`${photos.length} photo${photos.length>1?'s':''}` :'Receipt'}`}
      </button>
    </div>
  );
}
