/* =========================
   Rizz Web — Version 2.4
   Notes Authority — style.css
   ========================= */

* { box-sizing: border-box; }

html, body {
  height: 100%;
  background: #000;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #fff;
  background: radial-gradient(circle at top, #0a0b0e, #000);
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px;
}

h1 { font-size: 28px; margin-bottom: 4px; }
.sub { color: #9aa3ad; font-size: 14px; margin-bottom: 14px; }

/* Card base */
.card {
  background: #0f1112;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  transition: transform .18s ease, box-shadow .18s ease;
}

/* =========================
   DASHBOARD — GLASS + LIGHTING
   ========================= */
.dashboard {
  position: relative;
  border-radius: 20px;
  padding: 22px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015)),
    radial-gradient(circle at top left, rgba(255,105,180,0.14), transparent 60%),
    #0f1112;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 20px 45px rgba(0,0,0,0.65);
  animation: dashboardFloat 6s ease-in-out infinite;
}

@keyframes dashboardFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(0); }
}

.dashboard::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: radial-gradient(circle at top, rgba(255,105,180,0.12), transparent 70%);
  opacity: 0.9;
  pointer-events: none;
}

.dashboard::after {
  content: "";
  position: absolute;
  top: -40%;
  left: -60%;
  width: 220%;
  height: 220%;
  background: linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.06), transparent 60%);
  animation: dashboardSweep 9s linear infinite;
  pointer-events: none;
}

@keyframes dashboardSweep {
  0%   { transform: translateX(-30%) rotate(0deg); }
  100% { transform: translateX(30%) rotate(0deg); }
}

.dashboard h3 { margin-bottom: 14px; font-size: 18px; font-weight: 700; color: #fff; }
.dash-item { margin-top: 8px; font-size: 15px; display:flex; align-items:center; gap:8px; color:#eaeaec; }
.dash-item span { font-weight: 700; color:#ff9fcf; }
.dash-item.warning span { color:#ffb347; }

/* =========================
   FORM & INPUTS
   ========================= */
label { display:block; margin-top:12px; color:#9aa3ad; font-size:13px; }
input, textarea, select, button {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  background: rgba(255,255,255,0.03);
  color: #fff;
}
textarea { resize: none; min-height: 80px; }

/* Status buttons */
.status-buttons { display:flex; gap:10px; margin-top:8px; }
.status-buttons button {
  flex:1; background:#1c1f22; color:#fff; border-radius:12px; padding:10px; border:none;
}
.status-buttons button.active { background: linear-gradient(135deg,#ff6aa2,#ff99c8); color:#000; font-weight:700; }

/* Focus control (add manual override readout) */
.focus-control { display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; margin-top:10px; }
.focus-control button { height:56px; font-size:26px; border-radius:18px; background: linear-gradient(135deg,#ff6aa2,#ff99c8); color:#000; border:none; }
#focusValue { font-size:22px; font-weight:800; color:#ff99c8; min-width:64px; text-align:center; }

/* add button */
button[type="submit"] { background: linear-gradient(135deg,#00d08a,#00f2a0); color: #000; font-weight:800; padding:14px; border-radius:12px; border:none; }

/* =========================
   PEOPLE CARD
   ========================= */
.person { border-radius:16px; padding:16px; margin-bottom:14px; background:#0f1112; position:relative; overflow:visible; transition: transform .22s cubic-bezier(.2,.9,.2,1), box-shadow .22s ease; }
.person .sub { color:#9aa3ad; display:block; margin-top:6px; }
.focus-bar { height:8px; background:#1c1f22; border-radius:6px; overflow:hidden; margin-top:8px; }
.focus-fill { height:100%; background:#00d08a; transition: width .35s ease; }
.advice { margin-top:8px; font-size:13px; color:#9aa3ad; font-style:italic; }
.card-actions { display:flex; gap:12px; margin-top:14px; }
.card-actions button { flex:1; background: rgba(255,255,255,0.04); color:#fff; padding:12px; border-radius:12px; border:none; }

/* glow states */
.person.glow { box-shadow: 0 18px 48px rgba(0,0,0,0.55), 0 0 40px rgba(0,208,138,0.14); border: 1px solid rgba(0,208,138,0.06); transform: translateY(-4px); animation: glowGreen 3s ease-in-out 2; }
@keyframes glowGreen { 0% { box-shadow: 0 12px 30px rgba(0,0,0,0.55), 0 0 28px rgba(0,208,138,0.06); transform: translateY(-2px); } 50% { box-shadow: 0 26px 60px rgba(0,0,0,0.55), 0 0 48px rgba(0,208,138,0.14); transform: translateY(-6px); } 100% { box-shadow: 0 12px 30px rgba(0,0,0,0.55), 0 0 28px rgba(0,208,138,0.06); transform: translateY(-2px); } }

/* paused */
.person.paused { border: 1px solid rgba(255,80,80,0.10); box-shadow: 0 10px 26px rgba(0,0,0,0.55), inset 0 0 28px rgba(255,40,40,0.06); }

/* =========================
   EDIT MODAL
   ========================= */
.edit-modal {
  position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.65); z-index:9999; padding:20px;
}
.edit-modal.hidden { display:none !important; }

.edit-box {
  width: 92%; max-width: 420px; border-radius:14px; padding:18px; background: linear-gradient(180deg,#0b0b0b,#111214); box-shadow:0 20px 40px rgba(0,0,0,0.6); max-height:90vh; overflow:auto;
}

.focus-readout { text-align:center; margin-top:8px; font-size:22px; font-weight:800; color:#ff99c8; }

/* checkbox */
.checkbox-wrap { display:flex; align-items:center; gap:8px; margin-top:10px; color:#9aa3ad; font-weight:700; }

/* =========================
   NOTES HISTORY (collapsed by default)
   ========================= */
.history-toggle { margin-top:12px; display:flex; justify-content:flex-end; }
.history-toggle button { width:auto; padding:8px 12px; border-radius:10px; background: rgba(255,255,255,0.04); color:#fff; border:none; font-weight:700; }

.notes-history { margin-top:10px; background: rgba(255,255,255,0.02); padding:10px; border-radius:10px; max-height:260px; overflow:auto; transition: all .22s ease; }
.notes-history.hidden { display:none; }

/* notes list */
#notesHistoryList { font-size:13px; color:#d6dbe0; }

/* =========================
   EDIT ACTIONS
   ========================= */
.edit-actions { display:flex; gap:10px; margin-top:14px; }
.edit-actions .cancel { flex:1; padding:12px; border-radius:10px; background: rgba(255,255,255,0.06); color:#fff; border:none; font-weight:700; }
#saveEditBtn { flex:1; padding:12px; border-radius:10px; background: linear-gradient(135deg,#00d08a,#00f2a0); color:#000; border:none; font-weight:800; }

/* =========================
   SMALL & ACCESSIBILITY
   ========================= */
@media (max-width:420px) {
  .focus-control { grid-template-columns:1fr auto 1fr; gap:10px; }
  .focus-control button { height:52px; }
  .edit-box { padding:14px; }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard, .person.glow { animation: none; transform:none; box-shadow:none; }
}