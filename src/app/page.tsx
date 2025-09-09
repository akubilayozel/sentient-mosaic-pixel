'use client';

import { useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

function uploadWithProgress(ref: ReturnType<typeof storageRef>, file: File) {
  return new Promise<string>( (resolve, reject) => {
    const task = uploadBytesResumable(ref, file, { contentType: file.type || 'application/octet-stream' });

    task.on(
      'state_changed',
      // progress (istersen gösterilebilir)
      () => {},
      // error
      (err) => reject(err),
      // complete
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

const timeout = (ms: number) =>
  new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Upload timeout')), ms));

export default function Page() {
  const [handle, setHandle] = useState('@kullanici');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // debug: aktif bucket’ı göstereceğiz
  const activeBucket = (storage as any)?.app?.options?.storageBucket || '(yok)';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      let avatarUrl: string | null = null;
      const file = fileInput.current?.files?.[0] ?? null;

      if (file) {
        setMsg('📤 Upload başlıyor…');

        const safeName = file.name.replace(/[^\w.-]/g, '_');
        const path = `avatars/${Date.now()}_${safeName}`;
        const objRef = storageRef(storage, path);

        // resumable + timeout birlikte
        avatarUrl = await Promise.race([
          uploadWithProgress(objRef, file),
          timeout(20000),
        ]);

        setMsg('✅ Upload bitti, URL alındı.');
      } else {
        setMsg('📄 Fotoğraf yok, sadece kayıt yazılacak…');
      }

      const docRef = await addDoc(collection(db, 'claims'), {
        handle: handle.trim(),
        note: note.trim() || null,
        avatarUrl,
        createdAt: serverTimestamp(),
      });

      setMsg(
        `✅ Kayıt eklendi: ${docRef.id}${avatarUrl ? ' (görsel yüklendi)' : ''}`
      );

      if (fileInput.current) fileInput.current.value = '';
    } catch (err: any) {
      console.error(err);
      setMsg(`❌ Hata: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '48px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Sentient Mosaic — Minimal Test</h1>
      <p>Önce Firestore’a basit bir kayıt atalım; varsa fotoğrafı Storage’a yükleyelim.</p>

      {/* debug: aktif bucket */}
      <p style={{fontSize:12,opacity:.7}}>Aktif bucket: <code>{activeBucket}</code></p>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Twitter kullanıcı adı
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@kullanici"
          style={inputStyle}
        />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Profil fotoğrafı (opsiyonel)
        </label>
        <input ref={fileInput} type="file" accept="image/*" style={inputStyle} />

        <label style={{ display: 'block', margin: '16px 0 6px' }}>
          Not (isteğe bağlı)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          placeholder="Kısa bir not…"
          style={{ ...inputStyle, height: 120, resize: 'vertical' }}
        />

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </form>

      {msg && (
        <p style={{ background: '#f6f9f9', padding: 12, marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {msg}
        </p>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid #d0d0d6',
  outline: 'none',
  fontSize: 14,
  background: '#fff',
};

const primaryBtn: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
