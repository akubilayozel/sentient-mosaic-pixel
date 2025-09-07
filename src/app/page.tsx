'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const GRID = 20; // 20x20 = 400 slot
const TOTAL_SLOTS = GRID * GRID;

type Claim = {
  slot: number;
  handle: string;
  note: string;
  avatarUrl?: string;
  createdAt?: any;
};

export default function Page() {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claims, setClaims] = useState<Record<number, Claim>>({});

  // Canlı olarak kayıtları çek
  useEffect(() => {
    const q = query(collection(db, 'claims'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<number, Claim> = {};
      snap.forEach((d) => {
        const c = d.data() as Claim;
        if (typeof c.slot === 'number') map[c.slot] = c;
      });
      setClaims(map);
    });
    return () => unsub();
  }, []);

  const grid = useMemo(() => Array.from({ length: TOTAL_SLOTS }, (_, i) => i), []);

  const isClaimed = (i: number) => !!claims[i];

  // Basit validasyon
  const isValid = openSlot !== null && handle.trim().length > 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting || openSlot === null) return;

    try {
      setSubmitting(true);

      let avatarUrl: string | undefined = undefined;
      if (file) {
        const key = `avatars/${Date.now()}-${file.name}`.replace(/\s+/g, '-');
        const r = ref(storage, key);
        await uploadBytes(r, file);
        avatarUrl = await getDownloadURL(r);
      }

      await addDoc(collection(db, 'claims'), {
        slot: openSlot,
        handle,
        note,
        avatarUrl,
        createdAt: serverTimestamp(),
      });

      // Temizle + kapat
      setFile(null);
      setNote('');
      setOpenSlot(null);
      alert('Kaydın alındı ✔️');
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: 12 }}>
      <header className="header">
        <h1>Sentient Mosaic</h1>
        <ol className="instructions">
          <li>Logodan bir pixel seç</li>
          <li>Twitter kullanıcı adını yaz</li>
          <li>Profil fotoğrafını ekle</li>
          <li>Sentient hakkında düşüncelerini yaz</li>
        </ol>
      </header>

      {/* GRID */}
      <div
        className="gridLayout"
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: `repeat(${GRID}, 1fr)`,
          gridTemplateRows: `repeat(${GRID}, 1fr)`,
        }}
      >
        {grid.map((i) => {
          const claimed = isClaimed(i);
          return (
            <button
              key={i}
              className={`cell ${claimed ? 'claimed' : ''}`}
              aria-label={`Hücre ${i + 1}`}
              onClick={() => (!claimed ? setOpenSlot(i) : undefined)}
              disabled={claimed}
              title={claimed ? 'Bu slot alınmış' : 'Seçilebilir'}
            />
          );
        })}
      </div>

      <aside className="feed">
        <strong>Topluluk Notları</strong>
        <div className="note">Kayıtlar burada listelenir…</div>
      </aside>

      {/* MODAL */}
      {openSlot !== null && (
        <div
          // “nükleer” inline stil: z-index tepe, klik alır, panel merkezi
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={() => setOpenSlot(null)} // backdrop tıklayınca kapansın
        >
          <div
            style={{
              width: 520,
              maxWidth: 'calc(100vw - 32px)',
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,.25)',
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()} // panel içindeki tıklar panelde kalsın
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Pixel Al (slot #{openSlot + 1})</strong>
              <button onClick={() => setOpenSlot(null)}>Kapat</button>
            </div>

            <form onSubmit={onSubmit}>
              <label className="label">Twitter kullanıcı adı</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="input"
                placeholder="@kullanici"
              />

              <label className="label" style={{ marginTop: 8 }}>
                Profil fotoğrafı (max 2MB)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="input"
              />

              <label className="label" style={{ marginTop: 8 }}>
                Notun (280 karakter)
              </label>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="textarea"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setOpenSlot(null)}>
                  İptal
                </button>
                <button type="submit" disabled={!isValid || submitting}>
                  {submitting ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
