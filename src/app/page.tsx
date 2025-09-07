'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const GRID = 20; // 20x20 = 400
const TOTAL_SLOTS = GRID * GRID;

function toHandleId(input: string) {
  let s = (input || '').trim();
  if (s.startsWith('@')) s = s.slice(1);
  s = s.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return s.slice(0, 32);
}

function timeAgo(d?: Date) {
  if (!d) return '';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s`;
  const days = Math.floor(hrs / 24);
  return `${days}g`;
}

export default function Page() {
  const [validMap, setValidMap] = useState<boolean[]>(Array(TOTAL_SLOTS).fill(false));
  const [claimed, setClaimed] = useState<Record<number, any>>({});
  const [feed, setFeed] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<number | null>(null);
  const [handle, setHandle] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // 1) mask.png -> 20x20 geçerli hücre haritası
  useEffect(() => {
    const img = new Image();
    img.src = '/mask.png';
    img.onload = () => {
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d')!;
      cvs.width = GRID; cvs.height = GRID;
      ctx.clearRect(0, 0, GRID, GRID);
      ctx.drawImage(img, 0, 0, GRID, GRID);
      const data = ctx.getImageData(0, 0, GRID, GRID).data;
      const arr = new Array(TOTAL_SLOTS).fill(false);
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const idx = (y * GRID + x) * 4;
          const a = data[idx + 3];
          arr[y * GRID + x] = a > 20; // alfa eşiği
        }
      }
      setValidMap(arr);
    };
  }, []);

  // 2) Pixels feed (canlı)
  useEffect(() => {
    const q = query(collection(db, 'pixels'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      const claimedMap: Record<number, any> = {};
      snap.forEach((d) => {
        const v: any = d.data();
        const id = Number(d.id);
        claimedMap[id] = v;
        list.push({ id, ...v });
      });
      setClaimed(claimedMap);
      setFeed(list);
    });
    return () => unsub();
  }, []);

  const remaining = TOTAL_SLOTS - Object.keys(claimed).length;

  // 3) Hücre tıklama
  const clickCell = (i: number) => {
    if (!validMap[i]) return;
    if (claimed[i]) return;
    setSlot(i);
    setHandle('');
    setNote('');
    setFile(null);
    setError(null);
    setOk(null);
    setOpen(true);
  };

  // 4) Claim gönder
  const submitClaim = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setOk(null);
      if (slot == null) throw new Error('Slot yok');
      const hid = toHandleId(handle);
      if (!hid || hid.length < 2) throw new Error('Geçerli bir kullanıcı adı girin (en az 2 karakter).');
      if (!file) throw new Error('Bir profil görseli seçin.');
      if (!validMap[slot]) throw new Error('Geçersiz slot.');
      if (claimed[slot]) throw new Error('Bu slot zaten alınmış.');

      // 4.1 Avatar yükle
      if (file.size > 2 * 1024 * 1024) throw new Error('Dosya boyutu 2MB üzerine çıkamaz.');
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const safe = `${Date.now()}.${ext}`;
      const path = `avatars/${hid}/${safe}`;
      const r = sRef(storage, path);
      await uploadBytes(r, file, { contentType: file.type || 'image/png' });
      const avatarUrl = await getDownloadURL(r);

      // 4.2 Transaction: handles + pixels
      await runTransaction(db, async (tx) => {
        const pixelRef = doc(db, 'pixels', String(slot));
        const handleRef = doc(db, 'handles', hid);

        const hSnap = await tx.get(handleRef);
        if (hSnap.exists()) throw new Error('Bu kullanıcı adı ile daha önce pixel alınmış.');
        const pSnap = await tx.get(pixelRef);
        if (pSnap.exists()) throw new Error('Bu pixel alınmış.');

        const x = slot % GRID; const y = Math.floor(slot / GRID);
        tx.set(pixelRef, {
          slotId: slot,
          x, y,
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          handleId: hid,
          note: (note || '').slice(0, 280),
          avatarUrl,
          createdAt: serverTimestamp(),
        } as any);
        tx.set(handleRef, {
          handle: handle.startsWith('@') ? handle : `@${handle}`,
          pixelPath: pixelRef.path,
          createdAt: serverTimestamp(),
        } as any);
      });

      setOk('Pixel başarıyla alındı. Teşekkürler!');
      setTimeout(() => setOpen(false), 900);
    } catch (e: any) {
      setError(e?.message || 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  // 5) UI
  return (
    <div className="container">
      <div className="header">
        <h1>Sentient Mosaic</h1>
        <div className="badge">Kalan slot: {remaining} / {TOTAL_SLOTS}</div>
      </div>

      <div className="gridLayout">
        {/* Sol: Talimat + Mosaic */}
        <div className="mosaicWrap">
          <div className="instructions">
            Burada kullanıcıyı yönlendirelim:
            <ol>
              <li>Logodan bir pixel seç</li>
              <li>Twitter kullanıcı adını yaz</li>
              <li>Profil fotoğrafını ekle</li>
              <li>Sentient hakkında düşüncelerini yaz</li>
            </ol>
          </div>

          <div
            className="square"
            style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, gridTemplateRows: `repeat(${GRID}, 1fr)` }}
          >
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
              const isValid = validMap[i];
              const isClaimed = !!claimed[i];
              const cls = ['cell', isValid ? 'valid' : '', isClaimed ? 'claimed' : '']
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={i}
                  className={cls}
                  aria-label={`Hücre ${i}`}
                  onClick={() => clickCell(i)}
                  disabled={!isValid || isClaimed || submitting}
                />
              );
            })}
          </div>

          <div className="legend">
            <span className="l1" /> seçilebilir &nbsp; <span className="l2" /> alınmış
          </div>
        </div>

        {/* Sağ: Feed */}
        <aside className="feed">
          <div className="feedHead">
            <b>Topluluk Notları</b>
            <span className="badge">{feed.length} kayıt</span>
          </div>
          <div>
            {feed.map((item) => {
              const d =
                (item.createdAt?.toDate && item.createdAt.toDate()) ||
                (item.createdAt ? new Date(item.createdAt) : undefined);
              return (
                <div className="card" key={item.id}>
                  <img className="avatar" src={item.avatarUrl} alt="avatar" />
                  <div>
                    <div className="handle">{item.handle}</div>
                    <div className="note">{item.note}</div>
                    <div className="meta">slot #{item.id} • {timeAgo(d)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Modal */}
      {open && (
        <div className="modalMask" onClick={() => !submitting && setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <b>Pixel Al (slot #{slot})</b>
              <button className="btn outline" onClick={() => setOpen(false)} disabled={submitting}>Kapat</button>
            </header>
            <main>
              <div className="row">
                <label>Twitter kullanıcı adı</label>
                <input
                  type="text"
                  placeholder="@kullanici"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div className="row">
                <label>Profil fotoğrafı (max 2MB)</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="row">
                <label>Notun (280 karakter)</label>
                <textarea value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
              </div>
              {error && <div className="err">{error}</div>}
              {ok && <div className="success">{ok}</div>}
            </main>
            <footer>
              <button className="btn outline" onClick={() => setOpen(false)} disabled={submitting}>İptal</button>
              <button className="btn" onClick={submitClaim} disabled={submitting}>Gönder</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
