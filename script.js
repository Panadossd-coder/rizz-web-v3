/* =========================
   script.js — Rizz Web V2.4
   FULL file (Notes Intelligence + Stability)
   - Deep notes interpreter
   - Non-repeating long next-move advice
   - Activity-only large focus awards (max 20)
   - Edit reliability via event delegation
   - Collapsed notes history & live preview
   - Data hygiene & compatibility fallbacks
   ========================= */

/* ---------- SAFE DOM LOOKUPS (some elements optional) ---------- */
const form = document.getElementById("addForm");
const list = document.getElementById("peopleList");

const dashFocus = document.getElementById("dashFocus");
const dashPause = document.getElementById("dashPause");
const dashAction = document.getElementById("dashAction");
// optional warning element (some versions have it)
const dashWarning = document.getElementById("dashWarning") || null;

const focusValueEl = document.getElementById("focusValue");
const statusInput = form ? form.querySelector('[name="status"]') : null;
const focusInput = form ? form.querySelector('[name="focus"]') : null;

/* EDIT MODAL elements (may be present) */
const editModal = document.getElementById("editModal");
const editNameInput = document.getElementById("editNameInput");
const editStatusSelect = document.getElementById("editStatusSelect");
const editFocus = document.getElementById("editFocus");
const editFocusValue = document.getElementById("editFocusValue");
const editNotes = document.getElementById("editNotes");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const notesHistory = document.getElementById("notesHistory");
const notesHistoryList = document.getElementById("notesHistoryList");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
/* optional auto-apply checkbox in modal; default true if not found */
const applySmartNotesEl = document.getElementById("applySmartNotes");

/* click sound (optional) */
const clickSound = document.getElementById("clickSound");

/* ---------- STATE ---------- */
let focus = 0;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
let editingIndex = null;

/* ---------- UTILS ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nowISO = () => new Date().toISOString();
const saveStorage = () => localStorage.setItem("rizz_people", JSON.stringify(people));
const playClick = () => {
  if (!clickSound) return;
  try { clickSound.currentTime = 0; clickSound.volume = 0.3; clickSound.play().catch(()=>{}); } catch {}
};

/* ---------- DATA HYGIENE (run once) ---------- */
(function dataHygiene(){
  people = (people||[]).map(p => {
    p.name = p.name || "Unnamed";
    p.status = p.status || "crush";
    p.focus = Number.isFinite(p.focus) ? clamp(p.focus, 0, 100) : 0;
    p.events = Array.isArray(p.events) ? p.events : [];
    p.adviceHistory = Array.isArray(p.adviceHistory) ? p.adviceHistory : [];
    p.risk = !!p.risk;
    p.adviceIndex = typeof p.adviceIndex === "number" ? p.adviceIndex : 0;
    return p;
  });
  saveStorage();
})();

/* ---------- DEFAULT UI HOOKS ---------- */
/* status buttons (desktop/mobile) */
document.querySelectorAll(".status-buttons button").forEach(btn=>{
  btn.addEventListener("click", e=>{
    document.querySelectorAll(".status-buttons button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    if (statusInput) statusInput.value = btn.dataset.status;
    playClick();
  });
});
const defaultBtn = document.querySelector('[data-status="crush"]');
if (defaultBtn) defaultBtn.classList.add("active");

/* focus +/- handlers on the add form */
const plusBtn = document.getElementById("plus");
const minusBtn = document.getElementById("minus");
if (plusBtn) plusBtn.addEventListener("click", ()=>{
  focus = Math.min(100, focus + 10); updateFocusUI(); playClick();
});
if (minusBtn) minusBtn.addEventListener("click", ()=>{
  focus = Math.max(0, focus - 10); updateFocusUI(); playClick();
});
function updateFocusUI(){
  if (focusValueEl) focusValueEl.textContent = focus + "%";
  if (focusInput) focusInput.value = focus;
}

/* ---------- INTELLIGENCE: interpreter (deep) ---------- */
/* Purpose: analyze long free-text notes, produce:
   - emotionalLead: 'user'|'her'|'balanced'
   - trajectory: 'improving'|'stable'|'declining'|'volatile'
   - risks: array of flagged issues
   - focusDelta: small emotional +/- (capped to +/-10)
   - activityBoost: concrete activities weight (0..20)
*/
function interpretNotesDeep(text){
  const t = (text||"").toLowerCase().trim();
  const result = {
    emotionalLead: "balanced",
    trajectory: "stable",
    risks: [],
    focusDelta: 0,
    activityBoost: 0,
    signals: []
  };
  if (!t) return result;

  // patterns/phrases
  const userSignals = ["i love","i miss","i care","i feel attached","i overthink","i need","i worry","i want her","i want him","im anxious","i'm anxious"];
  const herSignals = ["she ignores","she's ignoring","she didnt reply","she did not reply","no reply","left on read","she's cold","she is cold","she ghosted","she ghosting","she blocked","she took long","she never replies","she's distant","she is distant"];
  const positive = ["happy","comfortable","close","sweet","fun","enjoyed","we clicked","good time","we vibed","we talked a lot","connected"];
  const negative = ["confused","hurt","tired","frustrated","sad","upset","angry","annoyed","disrespected"];
  const danger = ["blocked","ghosted","abusive","cheated","cheating","insult","disrespect","abandon"];

  // emotional lead heuristics
  if (userSignals.some(s => t.includes(s))) result.emotionalLead = "user";
  if (herSignals.some(s => t.includes(s))) result.emotionalLead = "her";

  // trajectory
  const posCount = positive.reduce((acc,w)=>acc + (t.includes(w)?1:0),0);
  const negCount = negative.reduce((acc,w)=>acc + (t.includes(w)?1:0),0);

  if (posCount >= 2 && posCount > negCount) result.trajectory = "improving";
  else if (negCount >= 2 && negCount > posCount) result.trajectory = "declining";
  else if (posCount > 0 && negCount > 0) result.trajectory = "volatile";
  else result.trajectory = "stable";

  // risk flags
  if (danger.some(w=>t.includes(w))) result.risks.push("disrespect");
  if (result.emotionalLead === "user" && result.trajectory === "declining") result.risks.push("chasing");
  if (t.includes("left on read") || t.includes("left on read")) result.risks.push("left-on-read");

  // signals list (for debugging / context)
  ["kiss","kissed","date","met","trip","travel","slept","overnight","sex","made love","introduced","parents"].forEach(w=>{
    if (t.includes(w)) result.signals.push(w);
  });

  // activity boost detection (only these raise focus significantly)
  // weights defined; maximum applied is 20
  const activityMap = [
    { kws:["sex","made love","we had sex","we slept together"], v:20 },
    { kws:["introduced","met parents","met your parents","introduced to family"], v:18 },
    { kws:["overnight","spent the night","slept over","slept together"], v:15 },
    { kws:["trip","travel","vacation","went away"], v:12 },
    { kws:["kiss","kissed","we kissed"], v:8 },
    { kws:["date","went on a date","met up","hung out","coffee","dinner"], v:6 }
  ];

  activityMap.forEach(a=>{
    if (a.kws.some(k=>t.includes(k))) result.activityBoost = Math.max(result.activityBoost, a.v);
  });

  // focusDelta from emotional signals (small)
  if (result.trajectory === "improving") result.focusDelta += 4;
  if (result.trajectory === "declining") result.focusDelta -= 5;
  if (result.emotionalLead === "user") result.focusDelta -= 3;
  if (result.emotionalLead === "her") result.focusDelta += 2;

  // small adjustments from phrases
  if (t.includes("replied with love") || t.includes("replied warmly")) result.focusDelta += 2;
  if (t.includes("ignored me") || t.includes("ignores me")) result.focusDelta -= 4;

  // cap focusDelta
  result.focusDelta = clamp(Math.round(result.focusDelta), -10, 10);

  return result;
}

/* ---------- NEXT MOVE generation (long, non-repeating) ---------- */
const ADVICE_POOLS = {
  chasing: [
    "You're emotionally ahead. Pull back for 48–72 hours and stop initiating — let her show interest. This protects your energy and gives space for honest signals.",
    "Reduce initiation and keep replies short and warm. If she values you, she'll close the gap — if not, this reveals the real level of interest."
  ],
  disrespect: [
    "Disrespect detected. Step back and protect your boundaries — do not explain or defend yourself. Reconnect only if clear respect returns.",
    "This behaviour is not acceptable. Pause attempts to engage and re-evaluate the relationship's value to you."
  ],
  positiveMomentum: [
    "Good momentum — reinforce it with a relaxed, confident suggestion to meet. Keep pressure low and enjoy the moment.",
    "Things are moving forward. Keep messages light and plan a small shared activity to strengthen the connection."
  ],
  steady: [
    "No urgent action needed. Stay steady, keep consistent, and let time reveal effort.",
    "Balance your attention: small, regular check-ins beat heavy messages. Let consistency build attraction."
  ],
  volatile: [
    "Mixed signals detected. Ask a clear but gentle question about plans and observe the response. Avoid emotional long messages until clarity appears.",
    "Emotional volatility — pause for one day, then reach out with something light that tests effort without asking for reassurance."
  ]
};

function generateNextMoveDeep(person, analysis){
  person.adviceHistory = person.adviceHistory || [];

  // select pool
  let pool = ADVICE_POOLS.steady;
  if (analysis.risks.includes("disrespect")) pool = ADVICE_POOLS.disrespect;
  else if (analysis.risks.includes("chasing")) pool = ADVICE_POOLS.chasing;
  else if (analysis.trajectory === "improving") pool = ADVICE_POOLS.positiveMomentum;
  else if (analysis.trajectory === "volatile") pool = ADVICE_POOLS.volatile;
  else pool = ADVICE_POOLS.steady;

  // prefer advice not used recently
  let candidate = pool.find(a => !person.adviceHistory.includes(a));
  if (!candidate) candidate = pool[ person.adviceHistory.length % pool.length ];

  // push and cap history
  person.adviceHistory.push(candidate);
  if (person.adviceHistory.length > 8) person.adviceHistory.shift();

  return candidate;
}

/* ---------- CORE DASHBOARD AUTHORITY ---------- */
/* Priority: disrespect/risk > strong focus candidates (>=60) > paused (<=20) */
function updateDashboard(){
  if (!people || people.length === 0){
    if (dashFocus) dashFocus.textContent = "—";
    if (dashPause) dashPause.textContent = "—";
    if (dashAction) dashAction.textContent = "Add someone to begin.";
    if (dashWarning) dashWarning.textContent = "—";
    return;
  }

  // compute priorities
  const risk = people.find(p => p.risk);
  const focusCandidate = people.filter(p => !p.risk && p.focus >= 60).sort((a,b)=>b.focus-a.focus)[0] || null;
  const pauseCandidate = people.filter(p => !p.risk && p.focus <= 20)[0] || null;

  if (dashWarning) dashWarning.textContent = risk ? risk.name : "—";
  if (dashFocus) dashFocus.textContent = focusCandidate ? focusCandidate.name : "—";
  if (dashPause) dashPause.textContent = pauseCandidate ? pauseCandidate.name : "—";

  // action chooses top priority
  const top = risk || focusCandidate || pauseCandidate;
  if (dashAction) dashAction.textContent = top ? (top.nextMove || "Observe and stay balanced.") : "Stay steady.";
}

/* ---------- RENDER ---------- */
function render(){
  if (!list) return;
  list.innerHTML = "";

  // determine glow set (top two by focus for flair)
  const glowSet = new Set(people.filter(p => (p.focus >= 60 && !p.risk)).sort((a,b)=>b.focus-a.focus).slice(0,2).map(p=>p.name));

  people.forEach((p, i) => {
    const card = document.createElement("div");
    const state = p.risk ? "paused" : (glowSet.has(p.name) ? "glow" : "");
    card.className = `person ${state}`;
    card.dataset.index = i;

    const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";

    card.innerHTML = `
      <strong>${escapeHtml(p.name)}</strong>
      <span class="sub">${escapeHtml(p.status)}</span>

      <div class="focus-bar" aria-hidden="true">
        <div class="focus-fill" style="width:${p.focus}%"></div>
      </div>
      <div class="sub">${p.focus}% focus</div>

      ${reminderHtml}

      <div class="advice"><strong>Next Move:</strong> ${escapeHtml(p.nextMove || "Stay balanced.")}</div>

      <div class="card-actions">
        <button class="edit-btn">Edit</button>
        <button class="remove-btn">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });

  updateDashboard();
}

/* small HTML escape utility */
function escapeHtml(s){
  if (s === undefined || s === null) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

/* ---------- ADD PERSON (form submit) ---------- */
if (form){
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const name = (form.name && form.name.value || "").trim();
    if (!name) return;

    const p = {
      name,
      status: statusInput ? statusInput.value : "crush",
      focus: focus || 0,
      reminder: form.reminder ? (form.reminder.value || "").trim() : "",
      events: [],
      adviceHistory: [],
      risk: false,
      nextMove: "Observe and stay balanced."
    };

    // optional quick notes on add -> apply intelligence if present
    const quickNote = form.notes ? (form.notes.value||"").trim() : "";
    const autoApply = true; // add form quick note should be applied by default
    if (quickNote && autoApply){
      const analysis = interpretNotesDeep(quickNote);
      // compute delta + activity; cap rules: notes alone can't push >95 unless activityBoost >=20
      let appliedDelta = analysis.focusDelta;
      let activityBoost = Math.min(analysis.activityBoost || 0, 20);
      let newFocus = clamp(p.focus + appliedDelta + activityBoost, 0, 100);
      if (newFocus > 95 && activityBoost < 20) newFocus = Math.min(newFocus, 95);
      p.focus = newFocus;
      p.risk = analysis.risks.length > 0;
      p.nextMove = generateNextMoveDeep(p, analysis);
      p.events.push({ type: "note", text: quickNote, time: nowISO(), delta: appliedDelta, activityBoost });
      // clear quick note in form for UX
      if (form.notes) form.notes.value = "";
    }

    people.push(p);
    saveStorage();
    render();
    form.reset();
    focus = 0;
    updateFocusUI();
    playClick();
  });
}

/* ---------- EVENT DELEGATION: edit/remove ---------- */
if (list){
  list.addEventListener("click", e=>{
    const card = e.target.closest(".person");
    if (!card) return;
    const i = parseInt(card.dataset.index, 10);

    if (e.target.classList.contains("edit-btn")){
      openEdit(i);
      playClick();
    }

    if (e.target.classList.contains("remove-btn")){
      people.splice(i,1);
      saveStorage();
      render();
      playClick();
    }
  });
}

/* ---------- OPEN EDIT ---------- */
function openEdit(i){
  editingIndex = i;
  const p = people[i];
  if (!editModal) {
    // fallback: quick inline prompt (should rarely happen)
    const newName = prompt("Edit name", p.name);
    if (newName !== null){ p.name = newName; saveStorage(); render(); }
    editingIndex = null;
    return;
  }

  // populate modal fields with safety checks
  if (editNameInput) editNameInput.value = p.name || "";
  if (editStatusSelect) editStatusSelect.value = p.status || "crush";
  if (editFocus) { editFocus.value = p.focus || 0; }
  if (editFocusValue) editFocusValue.textContent = (p.focus||0) + "%";
  if (editNotes) editNotes.value = "";

  // collapsed history by default
  if (notesHistory && notesHistoryList){
    notesHistory.classList.add("hidden");
    notesHistoryList.innerHTML = p.events && p.events.length
      ? p.events.slice().reverse().map(ev=>`• ${escapeHtml(ev.text)} <small style="color:#9aa3ad">• ${new Date(ev.time).toLocaleString()} • Δ ${ev.delta||0}</small>`).join("<br>")
      : "No notes yet.";
  }

  // advice preview - show a short variant near history if available
  if (notesHistoryList){
    const previewHtml = `<div class="modal-advice-preview" style="margin-bottom:10px"><strong style="color:#ff9fcf">Preview Advice</strong><div style="color:#d6dbe0;margin-top:6px">${escapeHtml(p.nextMove||"No suggestion yet.")}</div></div>`;
    // ensure not duplicated
    if (!notesHistoryList.previousElementSibling || !notesHistoryList.previousElementSibling.classList.contains("modal-advice-preview")){
      notesHistoryList.parentElement.insertAdjacentHTML("beforebegin", previewHtml);
    } else {
      notesHistoryList.previousElementSibling.innerHTML = `<strong style="color:#ff9fcf">Preview Advice</strong><div style="color:#d6dbe0;margin-top:6px">${escapeHtml(p.nextMove||"No suggestion yet.")}</div>`;
    }
  }

  // show modal
  editModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

/* ---------- modal interactions ---------- */
if (editFocus && editFocusValue){
  editFocus.addEventListener("input", ()=> {
    editFocusValue.textContent = editFocus.value + "%";
  });
}

/* toggle notes history button if present */
if (toggleHistoryBtn && notesHistory){
  toggleHistoryBtn.addEventListener("click", ()=>{
    notesHistory.classList.toggle("hidden");
    toggleHistoryBtn.textContent = notesHistory.classList.contains("hidden") ? "View Notes History" : "Hide Notes History";
    playClick();
  });
}

/* cancel edit */
if (cancelEditBtn){
  cancelEditBtn.addEventListener("click", ()=>{
    editModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingIndex = null;
    playClick();
  });
}

/* save edit (complex logic: applies notes intelligence only if auto-apply checked or default true) */
if (saveEditBtn){
  saveEditBtn.addEventListener("click", ()=>{
    if (editingIndex === null) return;
    const p = people[editingIndex];

    // name/status
    if (editNameInput) p.name = (editNameInput.value || "").trim() || p.name;
    if (editStatusSelect) p.status = editStatusSelect.value || p.status;

    // manual focus override via slider - commit value
    if (editFocus) p.focus = clamp(parseInt(editFocus.value,10)||0, 0, 100);

    // auto-apply preference: if checkbox present use value, else default true
    const autoApply = applySmartNotesEl ? !!applySmartNotesEl.checked : true;

    // notes processing (if provided)
    const noteText = editNotes ? (editNotes.value||"").trim() : "";
    if (noteText && autoApply){
      const analysis = interpretNotesDeep(noteText);

      // apply emotional delta (small) + activityBoost (concrete)
      let delta = analysis.focusDelta || 0;
      let activityBoost = Math.min(analysis.activityBoost || 0, 20);

      // new focus before protective caps
      let newFocus = clamp(p.focus + delta + activityBoost, 0, 100);

      // rule: notes alone should not push to 100; if newFocus>95 and activityBoost<20 cap to 95
      if (newFocus > 95 && activityBoost < 20) newFocus = Math.min(newFocus, 95);
      p.focus = newFocus;

      // update risk flag
      p.risk = (analysis.risks && analysis.risks.length > 0);

      // generate next move
      p.nextMove = generateNextMoveDeep(p, analysis);

      // archive event
      p.events = p.events || [];
      p.events.push({ type: "note", text: noteText, time: nowISO(), delta, activityBoost, analysis });
      // clear the editor note for UX
      if (editNotes) editNotes.value = "";
    }

    // persist & close
    saveStorage();
    render();
    editModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingIndex = null;
    playClick();
  });
}

/* ---------- small helper: generateNextMoveDeep used above ---------- */
/* We declare it here as well in case not hoisted */
function generateNextMoveDeep(person, analysis){
  person.adviceHistory = person.adviceHistory || [];

  // choose pool
  let pool = ADVICE_POOLS.steady;
  if (analysis.risks && analysis.risks.includes("disrespect")) pool = ADVICE_POOLS.disrespect;
  else if (analysis.risks && analysis.risks.includes("chasing")) pool = ADVICE_POOLS.chasing;
  else if (analysis.trajectory === "improving") pool = ADVICE_POOLS.positiveMomentum;
  else if (analysis.trajectory === "volatile") pool = ADVICE_POOLS.volatile;
  else pool = ADVICE_POOLS.steady;

  // pick advice not recently used
  let candidate = pool.find(a => !person.adviceHistory.includes(a));
  if (!candidate) candidate = pool[ person.adviceHistory.length % pool.length ];

  person.adviceHistory.push(candidate);
  if (person.adviceHistory.length > 8) person.adviceHistory.shift();

  return candidate;
}

/* ---------- ADVICE POOLS (same as used earlier, kept local for standalone) ---------- */
const ADVICE_POOLS = {
  chasing: [
    "You're emotionally ahead. Pull back for 48–72 hours and stop initiating — let her show interest. This protects your energy and gives space for honest signals.",
    "Reduce initiation and keep replies short and warm. If she values you, she'll close the gap — if not, this reveals the real level of interest.",
    "Protect your energy: reduce messages and observe whether effort returns before escalating."
  ],
  disrespect: [
    "Disrespect detected. Step back and protect your boundaries — do not explain or defend yourself. Reconnect only if clear respect returns.",
    "This behaviour is not acceptable. Pause attempts to engage and re-evaluate the relationship's value to you."
  ],
  positiveMomentum: [
    "Good momentum — reinforce it with a relaxed, confident suggestion to meet. Keep pressure low and enjoy the moment.",
    "Things are moving forward. Keep messages light and plan a small shared activity to strengthen the connection."
  ],
  steady: [
    "No urgent action needed. Stay steady, keep consistent, and let time reveal effort.",
    "Balance your attention: small, regular check-ins beat heavy messages. Let consistency build attraction."
  ],
  volatile: [
    "Mixed signals detected. Ask a clear but gentle question about plans and observe the response. Avoid emotional long messages until clarity appears.",
    "Emotional volatility — pause for one day, then reach out with something light that tests effort without asking for reassurance."
  ]
};

/* ---------- small helper for escapeHtml if not defined earlier ---------- */
function escapeHtml(s){
  if (s === undefined || s === null) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ---------- INIT ---------- */
updateFocusUI();
render();

/* ---------- expose some functions globally for debugging if needed ---------- */
window.rizz = {
  people,
  interpretNotesDeep,
  generateNextMoveDeep,
  saveStorage,
  render
};
/* ===============================
   🔧 BUTTON FIX — V2.4 HOT PATCH
   Centralized event delegation
   Safari-safe
   =============================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- STATUS BUTTONS ---------- */
  document.body.addEventListener("click", (e) => {
    const statusBtn = e.target.closest(".status-buttons button");
    if (!statusBtn) return;

    const status = statusBtn.dataset.status;
    if (!status) return;

    // visual active state
    document.querySelectorAll(".status-buttons button")
      .forEach(b => b.classList.remove("active"));

    statusBtn.classList.add("active");

    // hidden input sync
    const statusInput = document.querySelector('[name="status"]');
    if (statusInput) statusInput.value = status;
  });

  /* ---------- FOCUS + / - BUTTONS ---------- */
  document.body.addEventListener("click", (e) => {
    const plus = e.target.closest("#plus");
    const minus = e.target.closest("#minus");

    if (!plus && !minus) return;

    const focusValueEl = document.getElementById("focusValue");
    const focusInput = document.querySelector('[name="focus"]');

    let current = parseInt(focusInput?.value || "0", 10);

    if (plus) current = Math.min(100, current + 10);
    if (minus) current = Math.max(0, current - 10);

    if (focusInput) focusInput.value = current;
    if (focusValueEl) focusValueEl.textContent = current + "%";
  });

  /* ---------- EDIT / REMOVE BUTTONS ---------- */
  document.body.addEventListener("click", (e) => {

    const editBtn = e.target.closest(".edit-btn");
    const removeBtn = e.target.closest(".remove-btn");

    const card = e.target.closest(".person");
    if (!card) return;

    const index = parseInt(card.dataset.index, 10);
    if (Number.isNaN(index)) return;

    if (editBtn) {
      if (typeof openEdit === "function") {
        openEdit(index);
      }
    }

    if (removeBtn) {
      people.splice(index, 1);
      localStorage.setItem("rizz_people", JSON.stringify(people));
      render();
    }
  });

});