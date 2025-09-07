'use client';
style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, gridTemplateRows: `repeat(${GRID}, 1fr)` }}
>
{Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
const isValid = validMap[i];
const isClaimed = !!claimed[i];
const cls = ['cell', isValid ? 'valid' : '', isClaimed ? 'claimed' : ''].filter(Boolean).join(' ');
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
<span className="l1"/> seçilebilir &nbsp; <span className="l2"/> alınmış
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
const d = item.createdAt?.toDate?.() || (item.createdAt? new Date(item.createdAt) : undefined);
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
