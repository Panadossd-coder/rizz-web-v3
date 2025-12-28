/* =========================
   Rizz Web — Version 2.4 (Fixes + Auto Activity + Varied NextMove)
   ========================= */

/* ---------- CLICK SOUND ---------- */
const clickSound = document.getElementById("clickSound");
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn || !clickSound) return;
  try { clickSound.currentTime = 0; clickSound.volume = 0.3; clickSound.play().catch(()=>{}); } catch(e){}
});

/* ---------- CORE ELEMENTS ---------- */
const form = document.getElementById("addForm");
const list = document.getElementById("peopleList");

const dashFocus = document.getElementById("dashFocus");
const dashPause = document.getElementById("dashPause");
const dashAction = document.getElementById("dashAction");
const dashWarning = document.getElementById("dashWarning");

const focusValueEl = document.getElementById("focusValue");
const statusInput = form.querySelector('[name="status"]');
const focusInput = form.querySelector('[name="focus"]');

/* Edit modal elements */
const editModal = document.getElementById("editModal");
const editNameInput = document.getElementById("editNameInput");
const editStatusSelect = document.getElementById("editStatusSelect");
const editFocus = document.getElementById("editFocus");
const editFocusValue = document.getElementById("editFocusValue");
const editNotes = document.getElementById("editNotes");
const applySmartNotes = document.getElementById("applySmartNotes");
const smartSuggestion = document.getElementById("smartSuggestion");
const detailsList = document.getElementById("detailsList");
const adviceList = document.getElementById("adviceList");
const activityToolbar = document.querySelector(".activity-toolbar");
const toneSelect = document.getElementById("toneSelect");
const activitySelect = document.getElementById("activitySelect");
const viewAllNotesBtn = document.getElementById("viewAllNotesBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

/* ---------- STATE ---------- */
let focus = 0;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
let editingIndex = null;

/* ---------- UI Setup ---------- */
document.querySelectorAll(".status-buttons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".status-buttons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    statusInput.value = btn.dataset.status;
  };
});
const defaultBtn = document.querySelector('[data-status="crush"]');
if (defaultBtn) defaultBtn.classList.add("active");

document.getElementById("plus").onclick = () => { focus = Math.min(100, focus + 10); updateFocusUI(); };
document.getElementById("minus").onclick = () => { focus = Math.max(0, focus - 10); updateFocusUI(); };
function updateFocusUI(){ focusValueEl.textContent = focus + "%"; if (focusInput) focusInput.value = focus; }

/* hide UI controls that must be auto-driven */
if(activityToolbar) activityToolbar.style.display = "none";
if(toneSelect) toneSelect.style.display = "none";

/* =========================
   Activity weights (max 20)
   ========================= */
const activityWeights = {
  casual_meet: 6,
  proper_date: 12,
  long_date: 15,
  kiss: 16,
  close_consistent: 18,
  major_confirmation: 20
};

/* small helpers */
function saveStorage(){ localStorage.setItem("rizz_people", JSON.stringify(people)); }
function nowISO(){ return new Date().toISOString(); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* =========================
   Notes analysis (long-text aware)
   - returns noteDelta, riskFlag, keySignals, inferredActivities
   ========================= */
function analyzeNotesAdvanced(text){
  const t = (text||"").toLowerCase();
  const out = { delta: 0, risk: false, signals: [], inferredActivities: [] };

  // sentiment-ish signals (weighted)
  const posSeeds = { "love":4, "like":3, "enjoy":2, "calm":2, "warm":2, "good":2, "affection":3 };
  const negSeeds = { "ignore":-5, "ignored":-5, "no reply":-4, "left on read":-4, "cold":-3, "anxious":-3, "hurt":-4, "jealous":-3 };

  Object.keys(posSeeds).forEach(k => { if(t.includes(k)){ out.delta += posSeeds[k]; out.signals.push(k); } });
  Object.keys(negSeeds).forEach(k => { if(t.includes(k)){ out.delta += negSeeds[k]; out.signals.push(k); out.risk = out.risk || (negSeeds[k] < -3); } });

  // imbalance detection
  if(/\bi love\b|\bi miss\b|\bi need\b|\bi want\b/.test(t)) { out.signals.push("declaration"); out.risk = out.risk || true; }

  // long text scaling: long reflective notes are treated as more reliable signals but scaled for safety
  if(t.length > 200) { out.delta = Math.round(out.delta * 0.9); }
  if(t.length > 500) { out.delta = Math.round(out.delta * 0.95); }

  // inferred activity detection (search for common phrases)
  const actMap = {
    major_confirmation: ["met parents","met your parents","introduced to family","met his parents"],
    long_date: ["long date","quality date","proper date","long time together","romantic dinner"],
    proper_date: ["date","we went on a date","went on a date"],
    casual_meet: ["met up","hung out","chilled together","hang out","met for coffee","coffee"],
    kiss: ["kissed","we kissed","gave a kiss","kiss"],
    close_consistent: ["stayed over","spent night","we traveled together","trip together","travelled together"]
  };
  Object.keys(actMap).forEach(k=>{
    actMap[k].forEach(phrase=>{
      if(t.includes(phrase) && !out.inferredActivities.some(x=>x.kind===k)){
        out.inferredActivities.push({ kind: k, phrase });
      }
    });
  });

  // cap safe delta
  out.delta = clamp(out.delta, -40, 40);

  return out;
}

/* =========================
   Infer activities and compute inferred delta (reduced rate)
   - inferred weight = 60% of nominal, but still capped at 20%
   - returns totalInferredDelta and details list
   ========================= */
function inferActivitiesDelta(inferredActivities){
  let total = 0;
  const details = [];
  inferredActivities.forEach(a=>{
    const base = activityWeights[a.kind] || 0;
    const inferred = Math.round(base * 0.6); // 60% strength for inferred
    const applied = clamp(inferred, 0, 20);
    total += applied;
    details.push({ kind: a.kind, phrase: a.phrase, base, applied });
  });
  // cap total single automatic activity apply to 20 per rules (don't let inferred sum exceed 20)
  total = Math.min(total, 20);
  return { total, details };
}

/* =========================
   Next Move generator (varied, long, contextual)
   - uses template parts and history to avoid repetition
   ========================= */

const templateSeed = {
  correctiveStart: [
    "You're emotionally ahead right now — this often leads to anxiety and chasing.",
    "This is a common warning sign: you're investing more emotionally than she is.",
    "Right now your actions may be creating imbalance; it's time for a reset."
  ],
  correctiveSteps: [
    "Reduce initiation for 3–7 days; respond kindly but don't lead conversations.",
    "Focus on your routine; prioritize your life, hobbies, and friends to reset energy.",
    "Avoid sending long messages explaining feelings; preserve dignity and clarity."
  ],
  correctiveFinish: [
    "Let her show effort; if nothing changes, you'll gain clarity instead of anxiety.",
    "If she reaches out, respond warmly; otherwise, consider pausing heavy investment.",
    "Remember: protection of your emotional energy is progress, not defeat."
  ],
  positiveStart: [
    "This looks like healthy momentum — keep a steady approach.",
    "Positive signs here: mutual warmth is visible in the notes.",
    "You're building good momentum; subtlety will preserve attraction."
  ],
  positiveSteps: [
    "Keep consistency without over-texting; short, quality interactions are best.",
    "Suggest small shared activities that fit both schedules, no pressure.",
    "Reinforce emotional security with small gestures, not grand reveals."
  ],
  positiveFinish: [
    "Let things grow naturally; don't create false urgency.",
    "A steady approach builds real trust over time.",
    "Small, regular steps beat one big push."
  ],
  neutralPhrases: [
    "No major change detected.",
    "Maintain calm and observe patterns over the coming days.",
    "Balance your attention; be neither desperate nor absent."
  ]
};

function hashText(s){
  // simple hash to identify last next move
  let h = 0;
  for(let i=0;i<s.length;i++){ h = (h<<5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

function generateLongNextMove(p, analysis, inferredDetails){
  let parts = [];
  if(analysis.risk || analysis.delta < 0){
    parts.push(pick(templateSeed.correctiveStart));
    // 2 steps (choose two distinct)
    const steps = [...templateSeed.correctiveSteps];
    parts.push(pick(steps)); // random
    // avoid repetition by picking another step different
    let other = pick(steps);
    if(other === parts[1]) other = pick(steps);
    parts.push(other);
    parts.push(pick(templateSeed.correctiveFinish));
  } else if(analysis.delta > 0){
    parts.push(pick(templateSeed.positiveStart));
    parts.push(pick(templateSeed.positiveSteps));
    parts.push(pick(templateSeed.positiveFinish));
  } else {
    parts.push(pick(templateSeed.neutralPhrases));
    parts.push("Keep your routine and watch for consistent effort.");
  }

  // if inferred activities exist, include them as context-sensitive follow-ups
  if(inferredDetails && inferredDetails.length){
    const a = inferredDetails[0];
    parts.push(`Detected recent activity: "${a.phrase}". That suggests meaningful contact — follow up gently within the next 24–48 hours but don't over-index emotionally.`);
  }

  // assemble
  let nextMove = parts.join(" ");
  // avoid repeating exactly the previous advice
  const lastHash = p.lastNextMoveHash || 0;
  const newHash = hashText(nextMove);
  if(newHash === lastHash){
    // try small variation: shuffle order or add small phrase
    nextMove += " Try a calm and clear message if needed.";
  }
  // save hash for future dedup checks
  p.lastNextMoveHash = newHash;
  return nextMove;
}

/* =========================
   Dashboard logic
   ========================= */
function updateDashboard(){
  if(!people.length){
    dashFocus.textContent = "—";
    dashPause.textContent = "—";
    dashWarning.textContent = "—";
    dashAction.textContent = "Add someone to begin.";
    return;
  }

  const paused = people.filter(p => p.focus <= 20);
  const risky = people.filter(p => p.lastRisk);

  // priority score: focus * healthFactor (healthFactor less if risk)
  const scored = people.map(p => {
    const healthFactor = p.lastRisk ? 0.6 : 1.0;
    return { name: p.name, score: p.focus * healthFactor, p };
  }).sort((a,b)=>b.score - a.score);

  const top = scored.slice(0,2).map(s=>s.p);

  dashFocus.textContent = top.length ? top.map(p=>p.name).join(", ") : "—";
  dashPause.textContent = paused.length ? paused.map(p=>p.name).join(", ") : "—";
  dashWarning.textContent = risky.length ? risky.map(p=>p.name).join(", ") : "—";
  dashAction.textContent = top.length ? top[0].nextMove : "Stay balanced.";
}

/* =========================
   Render people list
   ========================= */
function render(){
  list.innerHTML = "";
  people.forEach((p,i)=>{
    const card = document.createElement("div");
    card.className = `person ${(p.focus<=20) ? "paused" : (p.focus>=60 && !p.lastRisk) ? "glow" : ""}`;
    const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";
    card.innerHTML = `
      <strong>${escapeHtml(p.name)}</strong>
      <span class="sub">${escapeHtml(p.status)}</span>
      <div class="focus-bar"><div class="focus-fill" style="width:${p.focus}%"></div></div>
      <div class="sub">${p.focus}% focus</div>
      ${reminderHtml}
      <div class="advice"><strong>Next Move:</strong> ${escapeHtml(truncate(p.nextMove || "Stay balanced.", 220))}</div>
      <div class="card-actions">
        <button onclick="openEdit(${i})">Edit</button>
        <button onclick="removePerson(${i})">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });
  updateDashboard();
}

/* small helpers for text */
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function truncate(s,n){ if(!s) return ""; return s.length>n? s.slice(0,n-1)+"…": s; }

/* =========================
   Add person
   ========================= */
form.onsubmit = e => {
  e.preventDefault();
  const name = (form.name && form.name.value || "").trim();
  if(!name) return;
  const p = {
    name,
    status: statusInput.value || "crush",
    focus,
    events: [],
    nextMove: "Observe and stay balanced.",
    lastRisk: false,
    lastNextMoveHash: 0
  };
  people.push(p);
  saveStorage(); render();
  form.reset(); focus = 0; updateFocusUI();
  document.querySelectorAll(".status-buttons button").forEach(b=>b.classList.remove("active"));
  if(defaultBtn) defaultBtn.classList.add("active");
};

/* =========================
   Edit modal logic
   ========================= */
cancelEditBtn.onclick = closeEdit;
saveEditBtn.onclick = saveEdit;
if(viewAllNotesBtn) viewAllNotesBtn.onclick = () => {
  if(editingIndex === null) return;
  const p = people[editingIndex];
  const txt = (p.events && p.events.length) ? p.events.map(e=>`${formatTime(e.time)} • [${e.type}] ${e.text} (Δ ${e.delta})`).join("\n\n") : "No saved notes.";
  alert("Notes history:\n\n" + txt);
};

function openEdit(i){
  editingIndex = i;
  const p = people[i];
  editNameInput.value = p.name || "";
  editStatusSelect.value = p.status || "crush";
  editFocus.value = p.focus || 0;
  editFocusValue.textContent = (p.focus||0) + "%";
  editNotes.value = "";
  smartSuggestion.textContent = "Suggested: —";
  detailsList.innerHTML = (p.events && p.events.length) ? p.events.slice(-6).map(e=>`• ${escapeHtml(e.text)} • ${formatTime(e.time)} • Δ ${e.delta}`).join("<br>") : "No saved notes yet.";
  // advice auto-generate for view
  populateAdvicePreview(p);
  editModal.classList.remove("hidden");
}

function closeEdit(){
  editModal.classList.add("hidden");
  editingIndex = null;
}

/* =========================
   Save Edit: notes + inferred activities auto-handling
   ========================= */
function saveEdit(){
  if(editingIndex === null) return;
  const p = people[editingIndex];
  try {
    // basic fields
    p.name = (editNameInput.value || "").trim() || p.name;
    p.status = editStatusSelect.value || p.status;
    p.focus = clamp(parseInt(editFocus.value,10) || p.focus, 0, 100);

    const notesText = (editNotes.value || "").trim();
    if(notesText){
      // analyze notes deeply
      const analysis = analyzeNotesAdvanced(notesText);
      // inferred activities delta
      const inferred = inferActivitiesDelta(analysis.inferredActivities);
      // total note delta (notes influence) — keep notes small effect: noteDelta scaled down
      const noteDelta = Math.round(analysis.delta * 0.9); // gentle scaling
      // inferred activities add as automatic but limited
      let totalAutoDelta = 0;
      if(inferred.total > 0){
        totalAutoDelta += inferred.total;
      }
      // apply note delta but small cap: notes alone should rarely exceed +10 per your rule
      const noteCap = 10;
      const appliedNoteDelta = clamp(noteDelta, -noteCap, noteCap);

      // combined auto delta before safety clamps
      let combinedDelta = appliedNoteDelta + totalAutoDelta;

      // safety: no single automatic change > 40
      combinedDelta = clamp(combinedDelta, -40, 40);

      // hard-to-100% rule: if p.focus + combinedDelta > 95, cap it to 95 (notes can't push to 100)
      if(p.focus + combinedDelta > 95){
        combinedDelta = Math.max(0, 95 - p.focus);
      }

      // apply
      p.focus = clamp(p.focus + combinedDelta, 0, 100);

      // mark risk flag
      p.lastRisk = !!analysis.risk;

      // build nextMove using inference & analysis
      p.nextMove = generateLongNextMove(p, analysis, inferred.details);

      // record event (note)
      p.events = p.events || [];
      p.events.push({
        type: inferred.details && inferred.details.length ? "note+activity_inferred" : "note",
        text: notesText,
        delta: combinedDelta,
        inferredActivities: inferred.details || [],
        time: nowISO()
      });

      // clear input
      editNotes.value = "";
    }
    // finally persist & render
    saveStorage();
    render();
  } catch(err){
    console.error("saveEdit error", err);
  } finally {
    closeEdit();
  }
}

/* =========================
   populateAdvicePreview (auto advice display)
   ========================= */
function populateAdvicePreview(p){
  adviceList.innerHTML = "";
  // create 2–3 varied suggestions using generateLongNextMove with slight variations
  const a1 = generateLongNextMove(p, { delta: 0, risk: p.lastRisk, signals: [] }, []);
  const a2 = generateLongNextMove(p, { delta: -1, risk: p.lastRisk, signals: [] }, []);
  const a3 = generateLongNextMove(p, { delta: 1, risk: p.lastRisk, signals: [] }, []);

  [a1,a2,a3].forEach((t, idx)=>{
    const card = document.createElement("div");
    card.className = "advice-card";
    card.innerHTML = `<div style="display:flex;gap:8px;align-items:center;"><div style="font-weight:800;color:#ff9fcf">${idx===0?"Primary":"Alt "+idx}</div><div style="margin-left:auto;color:#9aa3ad">Confidence ${Math.max(50,80 - idx*8)}%</div></div><div style="margin-top:8px">${escapeHtml(t)}</div>`;
    adviceList.appendChild(card);
  });
}

/* =========================
   Utility functions
   ========================= */
function formatTime(iso){ if(!iso) return ""; const d = new Date(iso); return d.toLocaleString(); }
function removePerson(i){ people.splice(i,1); saveStorage(); render(); }

/* =========================
   Init
   ========================= */
updateFocusUI();
render();