/* =========================
   Rizz Web — Version 2.4 Notes Authority
   script.js (FULL file)
   - Exclusive dashboard states (Focus / Pause / Warning)
   - Notes-only intelligence
   - Notes history collapsed toggle (in-edit)
   - Slider live readout (preview) but focus saved on Save
   - Progressive Next Move (stateful, avoids repeat)
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
const dashWarning = document.getElementById("dashWarning");
const dashAction = document.getElementById("dashAction");

const focusValueEl = document.getElementById("focusValue");
const statusInput = form.querySelector('[name="status"]');
const focusInput = form.querySelector('[name="focus"]');

/* ---------- EDIT MODAL ELEMENTS ---------- */
const editModal = document.getElementById("editModal");
const editNameInput = document.getElementById("editNameInput");
const editStatusSelect = document.getElementById("editStatusSelect");
const editFocus = document.getElementById("editFocus");
const editFocusValue = document.getElementById("editFocusValue");
const editNotes = document.getElementById("editNotes");
const applySmartNotes = document.getElementById("applySmartNotes");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const notesHistory = document.getElementById("notesHistory");
const notesHistoryList = document.getElementById("notesHistoryList");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveEditBtn = document.getElementById("saveEditBtn");

/* ---------- STATE ---------- */
let focus = 0;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
let editingIndex = null;

/* ---------- UI BOILERPLATE ---------- */
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

/* ---------- Helpers ---------- */
function saveStorage(){ localStorage.setItem("rizz_people", JSON.stringify(people)); }
function nowISO(){ return new Date().toISOString(); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function truncate(s,n){ if(!s) return ""; return s.length>n? s.slice(0,n-1)+"…": s; }

/* =========================
   Notes analysis (long-text aware)
   - Returns: delta (signed int), risk boolean, signals array
   - Delta is a sentiment-like proxy (bounded)
   ========================= */
function analyzeNotesAdvanced(text){
  const t = (text||"").toLowerCase();
  const out = { delta: 0, risk: false, signals: [], inferredPhrases: [] };

  const posMap = { "love":4, "like":3, "enjoy":2, "good":2, "warm":2, "affection":3, "comfortable":2 };
  const negMap = { "ignore":-5, "ignored":-5, "no reply":-4, "cold":-3, "anxious":-3, "hurt":-4, "left on read":-4, "jealous":-3 };

  Object.keys(posMap).forEach(k => { if(t.includes(k)){ out.delta += posMap[k]; out.signals.push(k); } });
  Object.keys(negMap).forEach(k => { if(t.includes(k)){ out.delta += negMap[k]; out.signals.push(k); if(negMap[k] <= -4) out.risk = true; } });

  if(/\bi love\b|\bi miss\b|\bi need\b|\bi want\b/.test(t)){ out.signals.push("declaration"); out.risk = true; }

  // inferred activity-like phrase detection (used only to enrich nextMove; not shown as manual activity)
  const activityPhrases = [
    "kissed","we kissed","long date","date","went on a date","met up","hung out","stayed over","spent night","met your parents","introduced to family","travel together","trip together","coffee"
  ];
  activityPhrases.forEach(p => { if(t.includes(p) && !out.inferredPhrases.includes(p)) out.inferredPhrases.push(p); });

  // long text scaling: slight downscale to avoid big swings from long writing
  if(t.length > 200) out.delta = Math.round(out.delta * 0.9);
  if(t.length > 500) out.delta = Math.round(out.delta * 0.95);

  out.delta = clamp(out.delta, -40, 40);
  return out;
}

/* =========================
   Next Move (progressive / stateful)
   - We store p.adviceCounter per person to vary advice
   ========================= */
const adviceTemplates = {
  correctiveParts: [
    "You're emotionally ahead right now — this often leads to anxiety and chasing.",
    "This is a warning sign: you're investing more emotionally than she currently is.",
    "Your messages show more emotional weight; it's time to protect your energy."
  ],
  correctiveSteps: [
    "Reduce initiation for 3–7 days; respond kindly but don't lead conversations.",
    "Refocus on your routine and hobbies; give space for natural responses.",
    "Avoid long explanations of feeling right now—let actions show intent."
  ],
  correctiveFinish: [
    "If she reaches out, respond warmly; otherwise, let this clarity protect you.",
    "If things stay one-sided, consider stepping back and observing.",
    "Protection of emotional energy is progress; clarity will follow."
  ],
  positiveStart: [
    "Healthy momentum detected — keep a steady approach.",
    "Positive signs here: mutual warmth is visible.",
    "You're building good momentum; subtlety preserves attraction."
  ],
  positiveSteps: [
    "Keep consistent short check-ins rather than long messages.",
    "Suggest small shared plans that don't create pressure.",
    "Reinforce security with small gestures, not heavy carries."
  ],
  positiveFinish: [
    "Let this grow naturally; avoid creating urgency.",
    "Small regular steps build trust more than big gestures.",
    "Keep calm confidence — it scales attraction."
  ],
  neutral: [
    "No major change detected. Maintain balance and observe over the next few days.",
    "Keep calm and routine; watch for consistent effort before escalating."
  ]
};

function generateNextMoveFor(p, analysis){
  // ensure adviceCounter exists
  p.adviceCounter = (p.adviceCounter||0) + 1;

  // choose path
  let parts = [];
  if(analysis.risk || analysis.delta < 0){
    // rotate among correctiveParts/Steps/Finish using adviceCounter to vary
    parts.push(adviceTemplates.correctiveParts[p.adviceCounter % adviceTemplates.correctiveParts.length]);
    parts.push(adviceTemplates.correctiveSteps[(p.adviceCounter + 1) % adviceTemplates.correctiveSteps.length]);
    parts.push(adviceTemplates.correctiveFinish[(p.adviceCounter + 2) % adviceTemplates.correctiveFinish.length]);
  } else if(analysis.delta > 0){
    parts.push(adviceTemplates.positiveStart[p.adviceCounter % adviceTemplates.positiveStart.length]);
    parts.push(adviceTemplates.positiveSteps[(p.adviceCounter + 1) % adviceTemplates.positiveSteps.length]);
    parts.push(adviceTemplates.positiveFinish[(p.adviceCounter + 2) % adviceTemplates.positiveFinish.length]);
  } else {
    parts.push(adviceTemplates.neutral[p.adviceCounter % adviceTemplates.neutral.length]);
  }

  // if inferred phrases present, append helpful contextual line (not treated as activity for focus big jumps)
  if(analysis.inferredPhrases && analysis.inferredPhrases.length){
    parts.push(`Detected recent event phrases: "${analysis.inferredPhrases.slice(0,2).join('", "')}". Use that context — follow up gently within 24–48 hours but avoid over-indexing emotionally.`);
  }

  // assemble and ensure not identical to last one (use small alteration)
  let nextMove = parts.join(" ");
  if(p.lastNextMove && p.lastNextMove === nextMove){
    nextMove += " (Try a calm, concise message if you follow up.)";
  }
  p.lastNextMove = nextMove;
  return nextMove;
}

/* =========================
   DASHBOARD: exclusive assignment per your rule
   Priority: Warning (risk) > Pause (focus<=20) > Focus (focus>=60)
   Only one person per bucket; show top candidate where multiple
   ========================= */
function updateDashboard(){
  if(!people.length){
    dashFocus.textContent = "—";
    dashPause.textContent = "—";
    dashWarning.textContent = "—";
    dashAction.textContent = "Add someone to begin.";
    return;
  }

  // classify lists
  const warnings = people.filter(p=>p.lastRisk);
  const pauses = people.filter(p=>!p.lastRisk && p.focus <= 20);
  const focusCandidates = people.filter(p=>!p.lastRisk && p.focus >= 60);

  // pick top by focus where needed
  const pickTop = arr => arr.length ? arr.sort((a,b)=>b.focus - a.focus)[0] : null;

  const focusTop = pickTop(focusCandidates);
  const pauseTop = pickTop(pauses);
  const warnTop = pickTop(warnings);

  dashFocus.textContent = focusTop ? focusTop.name : "—";
  dashPause.textContent = pauseTop ? pauseTop.name : "—";
  dashWarning.textContent = warnTop ? warnTop.name : "—";

  // dashAction: choose the highest priority present (warning > focus > pause)
  if(warnTop) dashAction.textContent = warnTop.nextMove || "Careful — review notes.";
  else if(focusTop) dashAction.textContent = focusTop.nextMove || "Keep steady.";
  else if(pauseTop) dashAction.textContent = pauseTop.nextMove || "Give space.";
  else dashAction.textContent = "Stay balanced.";
}

/* =========================
   RENDER PEOPLE LIST
   ========================= */
function render(){
  list.innerHTML = "";
  people.forEach((p,i)=>{
    const card = document.createElement("div");
    const stateClass = p.lastRisk ? "paused" : (p.focus >= 60 ? "glow" : (p.focus <= 20 ? "paused" : ""));
    card.className = `person ${stateClass}`;
    const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";
    card.innerHTML = `
      <strong>${escapeHtml(p.name)}</strong>
      <span class="sub">${escapeHtml(p.status)}</span>
      <div class="focus-bar" aria-hidden="true"><div class="focus-fill" style="width:${p.focus}%"></div></div>
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

/* expose removePerson for button onclick */
function removePerson(i){ people.splice(i,1); saveStorage(); render(); }
window.removePerson = removePerson;

/* =========================
   ADD PERSON
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
    adviceCounter: 0,
    lastNextMove: ""
  };
  people.push(p);
  saveStorage();
  render();
  form.reset();
  focus = 0;
  updateFocusUI();
  document.querySelectorAll(".status-buttons button").forEach(b=>b.classList.remove("active"));
  if(defaultBtn) defaultBtn.classList.add("active");
};

/* =========================
   EDIT MODAL LOGIC
   - slider updates live readout but does not commit until Save
   - notes preview (smart suggestion) updates as you type
   - notesHistory is collapsed by default; toggle to show
   ========================= */

cancelEditBtn.onclick = closeEdit;
saveEditBtn.onclick = saveEdit;
if(toggleHistoryBtn) toggleHistoryBtn.onclick = toggleHistory;

function openEdit(i){
  editingIndex = i;
  const p = people[i];
  editNameInput.value = p.name || "";
  editStatusSelect.value = p.status || "crush";
  editFocus.value = p.focus || 0;
  editFocusValue.textContent = (p.focus||0) + "%";
  editNotes.value = "";
  applySmartNotes.checked = true;
  // collapsed history by default
  notesHistory.classList.add("hidden");
  toggleHistoryBtn.textContent = "View Notes History";
  // short preview in history (not expanded)
  notesHistoryList.innerHTML = (p.events && p.events.length) ? p.events.slice(-4).map(e=>`• ${escapeHtml(e.text)} <small style="color:#9aa3ad">• ${new Date(e.time).toLocaleString()} • Δ ${e.delta}</small>`).join("<br>") : "No saved notes yet.";
  // prepare advice preview area: immediate populate
  populateAdvicePreview(p);
  editModal.classList.remove("hidden");
}

function closeEdit(){
  editModal.classList.add("hidden");
  editingIndex = null;
}

/* live slider readout */
if(editFocus){
  editFocus.addEventListener("input", ()=> {
    editFocusValue.textContent = editFocus.value + "%";
    // also update smart suggestion preview using current note text (non-committal preview)
    try {
      const noteText = (editNotes && editNotes.value) ? editNotes.value.trim() : "";
      if(noteText && editingIndex !== null){
        const analysis = analyzeNotesAdvanced(noteText);
        // note limited to +/-10 per rules
        const noteDelta = clamp(Math.round(analysis.delta * 0.9), -10, 10);
        // inferred phrases add context but do not give large focus boosts automatically here (we won't infer auto activity now)
        const inferredBonus = 0; // preview doesn't add inferred auto value to avoid confusion
        const combinedPreview = clamp(noteDelta + inferredBonus, -40, 40);
        // show numeric only
        const previewEl = document.getElementById("editFocusValue");
        if(previewEl) previewEl.textContent = ((combinedPreview>0)? `+${combinedPreview}` : `${combinedPreview}`) || (editFocus.value + "%");
      }
    } catch(e){}
  });
}

/* live notes preview while typing - updates smartSuggestion numeric only */
if(editNotes){
  editNotes.addEventListener("input", ()=> {
    const text = editNotes.value.trim();
    if(!text){ 
      // reset suggestion display to empty
      const previewEl = document.getElementById("editFocusValue");
      if(previewEl) previewEl.textContent = editFocus.value + "%";
      return;
    }
    const analysis = analyzeNotesAdvanced(text);
    const noteDelta = clamp(Math.round(analysis.delta * 0.9), -10, 10);
    // show only numeric in the small readout area (we reuse editFocusValue as compact preview spot)
    const previewEl = document.getElementById("editFocusValue");
    if(previewEl) previewEl.textContent = noteDelta ? (noteDelta > 0 ? `+${noteDelta}` : `${noteDelta}`) : editFocus.value + "%";
  });
}

/* toggle notes history */
function toggleHistory(){
  if(!notesHistory) return;
  if(notesHistory.classList.contains("hidden")){
    // populate full history from person
    if(editingIndex === null) return;
    const p = people[editingIndex];
    notesHistoryList.innerHTML = (p.events && p.events.length) ? p.events.slice().reverse().map(e=>`<div style="margin-bottom:10px"><strong>[${escapeHtml(e.type)}]</strong> ${escapeHtml(e.text)}<br/><small style="color:#9aa3ad">${new Date(e.time).toLocaleString()} • Δ ${e.delta}</small></div>`).join("") : "No saved notes.";
    notesHistory.classList.remove("hidden");
    toggleHistoryBtn.textContent = "Hide Notes History";
  } else {
    notesHistory.classList.add("hidden");
    toggleHistoryBtn.textContent = "View Notes History";
  }
}

/* =========================
   SAVE EDIT: notes-only intelligence
   - notes get analyzed and archived (cleared)
   - notes can give small focus delta (cap 10)
   - inferred phrases add context to nextMove but do NOT give large auto jumps
   - manual slider value is applied only on Save (manual override)
   ========================= */
function saveEdit(){
  if(editingIndex === null) return;
  const p = people[editingIndex];

  // apply name / status / manual slider override
  p.name = (editNameInput.value || "").trim() || p.name;
  p.status = editStatusSelect.value || p.status;
  // manual override value (commit)
  const manualVal = clamp(parseInt(editFocus.value,10) || p.focus, 0, 100);
  p.focus = manualVal;

  // handle notes
  const text = (editNotes.value || "").trim();
  if(text){
    const analysis = analyzeNotesAdvanced(text);
    // notes effect small cap +/-10
    const noteDelta = clamp(Math.round(analysis.delta * 0.9), -10, 10);

    // apply note delta but prevent pushing to full 100 by notes alone
    let appliedDelta = noteDelta;
    if(p.focus + appliedDelta > 95){
      appliedDelta = Math.max(0, 95 - p.focus);
    }
    p.focus = clamp(p.focus + appliedDelta, 0, 100);

    // risk flag
    p.lastRisk = !!analysis.risk;

    // nextMove uses progressive/stateful generator
    p.nextMove = generateNextMoveFor(p, analysis);

    // archive event
    p.events = p.events || [];
    p.events.push({
      type: "note",
      text,
      delta: appliedDelta,
      inferred: analysis.inferredPhrases || [],
      time: nowISO()
    });

    // clear note input in modal
    editNotes.value = "";
  }

  // persist and render
  saveStorage();
  render();
  closeEdit();
}

/* =========================
   Advice preview population (in modal) - show 2 variations
   ========================= */
function populateAdvicePreview(p){
  // clear first
  const existing = document.querySelectorAll(".advice-card");
  existing.forEach(n => n.remove());
  // we will show two cards inside the modal by injecting into notesHistoryList area top (since we removed dedicated advice area)
  // Build two varied advices
  const a1 = p.nextMove || generateNextMoveFor(p, { delta: 0, risk: p.lastRisk, inferredPhrases: [] });
  // temporarily simulate slight variation
  const a2 = a1 + " (Alt) Keep calm and observe.";
  // Create nodes above the history preview
  const container = document.createElement("div");
  container.className = "modal-advice-preview";
  container.innerHTML = `<div style="margin-bottom:10px" class="advice-card"><strong style="color:#ff9fcf">Primary</strong><div style="color:#d6dbe0;margin-top:6px">${escapeHtml(a1)}</div></div><div class="advice-card"><strong style="color:#ff9fcf">Alternative</strong><div style="color:#d6dbe0;margin-top:6px">${escapeHtml(a2)}</div></div>`;
  // insert at top of notesHistoryList area for quick view (but hidden collapsed by default)
  if(notesHistoryList){
    // we keep a single preview node: replace if exists
    const old = document.querySelector(".modal-advice-preview");
    if(old) old.remove();
    notesHistoryList.parentElement.insertBefore(container, notesHistoryList);
  }
}

/* expose openEdit for buttons */
window.openEdit = function(i){ openEdit(i); };

/* init */
updateFocusUI();
render();