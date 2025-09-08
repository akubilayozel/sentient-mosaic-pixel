'use client';

import React, { useMemo, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const GRID = 20; // 20x20 = 400 slot
const TOTAL_SLOTS = GRID * GRID;

type FormState = {
  handle: string;
  note: string;
  file: File | null;
};

export default function Page() {
  const slots = useMemo(() => Array.from({ length: TOTAL_SLOTS }, (_, i) => i), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    handle: '',
    note: '',
    file: null,
  });

  function resetForm() {
    setForm({ handle: '', note: '', file: null });
    setSelected(null);
    setOpen(false);
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Basit validasyon
    if (selected == null) return alert('Lütfen bir slot seçin.');
    const handle = form.handle.trim();
    if (!handle) return alert('Twitter kullanıcı adını girin.');
    const note = form.note.trim();

    setSubmitting(true);
    try {
      // Ortak alanlar
      const base = {
        handle,
        note,
        slot: selected,
        createdAt: serverTimestamp(),
      };

      // Dosya varsa yükle
      let avatarUrl: string | undefined = undefined;
      if (form.file) {
        const fileRef = ref(
          storage,
          `avatars/${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}-${form.file.name}`,
        );
        const snap = await uploadBytes(fileRef, form.file);
        avatarUrl = await getDownloadURL(snap.ref);
      }

      // 🔑 avatarUrl sadece varsa ekle (undefined gönderME)
      const payload = avatarUrl ? { ...base, avatarUrl } : base;

      await addDoc(collection(db, 'claims'), payload);

      alert('Kayıt alındı. Teşekkürler!');
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? 'Bir hata oluştu.');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Sentient Mosaic</h1>

      <ol style={{ marginBottom: 16, lineHeight: 1.5 }}>
        <li>Logodan bir piksel seç</li>
        <li>Twitter kullanıcı adını yaz</li>
        <li>Profil fotoğrafını ekle (opsiyonel)</li>
        <li>Sentient hakkında düşüncelerini yaz (opsiyonel)</li>
      </ol>

      {/* Izgara */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID}, 24px)`,
          gridTemplateRows: `repeat(${GRID}, 24px)`,
          gap: 4,
          userSelect: 'none',
        }}
      >
        {slots.map((i) => (
          <button
            key={i}
            title={`Slot #${i}`}
            onClick={() => {
              setSelected(i);
              setOpen(true);
            }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: '1px solid #ddd',
              background: '#f5f5f5',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => {
            if (!submitting) setOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 540,
              maxWidth: '92vw',
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Pixel AI (slot #{selected})</strong>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
              >
                Kapat
              </button>
            </div>

            <div style={{ height: 8 }} />

            {/* Handle */}
            <label style={{ fontSize: 12, opacity: 0.75 }}>Twitter kullanıcı adı</label>
            <input
              type="text"
              placeholder="@kullanici"
              value={form.handle}
              onChange={(e) => setForm((s) => ({ ...s, handle: e.target.value }))}
              style={inputStyle}
            />

            {/* File */}
            <label style={{ fontSize: 12, opacity: 0.75 }}>Profil fotoğrafı (max ~2MB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setForm((s) => ({ ...s, file: f }));
              }}
              style={inputStyle}
            />

            {/* Note */}
            <label style={{ fontSize: 12, opacity: 0.75 }}>Notun (280 karakter)</label>
            <textarea
              rows={5}
              maxLength={280}
              value={form.note}
              onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                style={ghostBtn}
              >
                İptal
              </button>
              <button type="submit" disabled={submitting} style={primaryBtn}>
                {submitting ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
  margin: '6px 0 12px',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #dadce0',
  outline: 'none',
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: 0,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
};
