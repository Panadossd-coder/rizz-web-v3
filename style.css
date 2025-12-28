/* =========================
   Rizz Web — Version 2.4 (Style)
   Preserves V2 styling, adds edit modal extras
   ========================= */

* { box-sizing: border-box; }

html, body {
  height: 100%;
  background: #000;
}

body {
  margin: 0;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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

/* Dashboard/glow etc kept (same as v2) */
.dashboard { position: relative; text-align:left; border-radius:20px; padding:22px; overflow:hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015)),
    radial-gradient(circle at top left, rgba(255,105,180,0.22), transparent 60%),
    #0f1112;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 20px 45px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06);
}
.dashboard h3{margin-bottom:14px;font-size:18px;font-weight:700;color:#fff}
.dash-item{margin-top:8px;font-size:15px;display:flex;align-items:center;gap:6px;color:#eaeaec}
.dash-item span{font-weight:700;color:#ff9fcf}

/* Form & inputs */
input, textarea, button, select {
  width: 100%;
  margin-top: 10px;
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
  flex:1;
  background:#1c1f22;
  color:#fff;
  border-radius:12px;
  padding:10px;
  border: none;
}
.status-buttons button.active { background: linear-gradient(135deg,#ff6aa2,#ff99c8); color:#000; font-weight:700; }

/* Focus controls */
.focus-control { display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; margin-top:10px; }
.focus-control button { height:56px; font-size:26px; border-radius:18px; background: linear-gradient(135deg,#ff6aa2,#ff99c8); color:#000; border:none; }
#focusValue { font-size:22px; font-weight:800; color:#ff99c8; min-width:64px; text-align:center; }

/* add button */
button[type="submit"] { background: linear-gradient(135deg,#00d08a,#00f2a0); color: #000; font-weight:800; padding:14px; border-radius:12px; border:none; }

/* People card */
.person { border-radius: 16px; padding:16px; transition: transform .22s cubic-bezier(.2,.9,.2,1), box-shadow .22s ease; position: relative; overflow: visible; }
.person .sub { color:#9aa3ad; display:block; margin-top:6px; }

/* focus bar */
.focus-bar { height:8px; background:#1c1f22; border-radius:6px; overflow:hidden; margin-top:8px; }
.focus-fill { height:100%; background:#00d08a; transition: width .35s ease; }

/* advice */
.advice { margin-top:8px; font-size:13px; color:#9aa3ad; font-style:italic; }

/* card actions */
.card-actions { display:flex; gap:12px; margin-top:14px; }
.card-actions button { flex:1; background: rgba(255,255,255,0.04); color:#fff; padding:12px; border-radius:12px; border:none; }

/* glow states */
.person.glow { box-shadow: 0 18px 48px rgba(0,0,0,0.55), 0 0 40px rgba(0,208,138,0.14); border: 1px solid rgba(0,208,138,0.06); transform: translateY(-4px); animation: glowGreen 3s ease-in-out 2; }
@keyframes glowGreen { 0%{box-shadow:0 12px 30px rgba(0,0,0,0.55),0 0 28px rgba(0,208,138,0.06);transform:translateY(-2px)}50%{box-shadow:0 26px 60px rgba(0,0,0,0.55),0 0 48px rgba(0,208,138,0.14);transform:translateY(-6px)}100%{box-shadow:0 12px 30px rgba(0,0,0,0.55),0 0 28px rgba(0,208,138,0.06);transform:translateY(-2px)}}

/* paused */
.person.paused { border: 1px solid rgba(255,80,80,0.10); box-shadow: 0 10px 26px rgba(0,0,0,0.55), 0 0 28px rgba(255,40,40,0.06) inset; animation: pulseRed 1.8s ease-in-out 2; }
@keyframes pulseRed { 0%{box-shadow:0 8px 20px rgba(0,0,0,0.55),0 0 12px rgba(255,60,60,0.06);transform:translateY(0)}50%{box-shadow:0 16px 36px rgba(0,0,0,0.55),0 0 36px rgba(255,60,60,0.14);transform:translateY(-2px)}100%{box-shadow:0 8px 20px rgba(0,0,0,0.55),0 0 12px rgba(255,60,60,0.06);transform:translateY(0)}}
.person.paused::after { content: " PAUSED"; position: absolute; top: 12px; right: 14px; font-size:12px; color:#ff8b8b; font-weight:700; background: rgba(255,255,255,0.02); padding:4px 8px; border-radius:8px; }

/* edit modal */
.edit-modal { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.6); z-index:9999; padding: 20px; }
.edit-modal.hidden { display:none !important; }
.edit-box { width:92%; max-width:420px; border-radius:14px; padding:16px; background: linear-gradient(180deg,#0b0b0b,#111214); box-shadow:0 20px 40px rgba(0,0,0,0.6); }

/* smart row */
.smart-row { display:flex; gap:12px; align-items:center; margin-top:8px; }
.checkbox-wrap { display:flex; align-items:center; gap:8px; font-weight:600; }
.smart-suggestion { margin-left:auto; color:#ffcc66; font-weight:700; }

/* profile summary */
.profile-summary { margin-top:12px; background: rgba(255,255,255,0.02); padding:10px; border-radius:10px; font-size:13px; color:#d6dbe0; }
.summary-facts { color:#ffdbe8; margin-top:6px; }
.summary-state { color:#9aa3ad; margin-top:6px; font-style:italic; }

/* timeline & advice */
.event-timeline, .advice-box { margin-top:12px; background: rgba(255,255,255,0.02); padding:10px; border-radius:10px; }
.timeline-list { font-size:13px; color:#d6dbe0; max-height:140px; overflow:auto; }
.advice-controls { display:flex; gap:12px; align-items:center; margin-bottom:8px; }
.advice-list { display:flex; flex-direction:column; gap:8px; }
.advice-card { background: linear-gradient(180deg,#0b0b0b,#111214); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.02); }
.advice-card .tone { font-weight:800; color:#ff9fcf; margin-bottom:6px; }
.advice-card .confidence { float:right; color:#9aa3ad; font-size:12px; }

/* small controls */
.edit-actions { display:flex; gap:10px; margin-top:12px; }
.edit-actions button { flex:1; padding:12px; border-radius:10px; border:none; background:#00d08a; color:#000; font-weight:700; }
.edit-actions button.cancel { background: rgba(255,255,255,0.06); color:#fff; }

/* accessibility */
@media (prefers-reduced-motion: reduce) { .person.glow, .person.paused, .person.reminder-due { animation: none; transform: none; box-shadow: none; } }

@media (max-width:420px){ .focus-control { grid-template-columns: 1fr auto 1fr; gap:10px; } .focus-control button { height:52px; } }
