/* =========================
   Rizz Web — Version 2.4
   Intelligent Notes Core
   ========================= */

/* ---------- CLICK SOUND ---------- */
const clickSound = document.getElementById("clickSound");
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn || !clickSound) return;
  try {
    clickSound.currentTime = 0;
    clickSound.volume = 0.3;
    clickSound.play().catch(()=>{});
  } catch(e){}
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

/* ---------- STATE ---------- */
let focus = 0;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
let editingIndex = null;

/* ---------- STATUS BUTTONS ---------- */
document.querySelectorAll(".status-buttons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".status-buttons button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    statusInput.value = btn.dataset.status;
  };
});
const defaultBtn = document.querySelector('[data-status="crush"]');
if (defaultBtn) defaultBtn.classList.add("active");

/* ---------- FOCUS CONTROL ---------- */
document.getElementById("plus").onclick = () => {
  focus = Math.min(100, focus + 10);
  updateFocusUI();
};
document.getElementById("minus").onclick = () => {
  focus = Math.max(0, focus - 10);
  updateFocusUI();
};
function updateFocusUI(){
  focusValueEl.textContent = focus + "%";
  focusInput.value = focus;
}

/* =========================
   INTELLIGENT NOTES ENGINE
   ========================= */

/* --- signal dictionaries --- */
const POSITIVE = ["care","enjoy","calm","happy","good","love","like","miss"];
const NEGATIVE = ["ignore","ignored","no reply","late reply","cold","confused","anxious","tired","hurt"];
const IMBALANCE = ["i love","i care","i miss","i want her","i want him"];

/* --- analyze long emotional text --- */
function analyzeNotes(text){
  const t = text.toLowerCase();
  let score = 0;
  let risk = false;

  POSITIVE.forEach(w => { if (t.includes(w)) score += 3; });
  NEGATIVE.forEach(w => { if (t.includes(w)) score -= 4; });
  IMBALANCE.forEach(w => { if (t.includes(w)) risk = true; });

  if (t.length > 120) score *= 0.7; // long text = reflection, not hype

  score = Math.max(-10, Math.min(10, Math.round(score)));

  return {
    delta: score,
    risk,
    summary:
      score < 0 ? "Emotional imbalance detected"
      : score > 0 ? "Healthy emotional signal"
      : "Neutral emotional state"
  };
}

/* =========================
   NEXT MOVE (LONG, CORRECTIVE)
   ========================= */

function generateNextMove(p, analysis){
  if (analysis.risk && analysis.delta <= 0){
    return `You are emotionally ahead right now. This is not a failure — it’s a signal to slow down.
Reduce initiation, stop explaining your feelings, and let her actions speak.
If she reaches out, respond calmly. If she doesn’t, that clarity protects you.`;
  }

  if (analysis.delta > 0){
    return `The emotional tone here is positive and stable.
Stay consistent without increasing pressure.
Match her energy, keep your routine, and allow things to grow naturally without forcing progress.`;
  }

  return `Nothing significant has shifted emotionally.
Maintain balance. Do not chase or withdraw dramatically.
Let time and consistent behavior reveal the direction.`;
}

/* =========================
   DASHBOARD LOGIC
   ========================= */

function updateDashboard(){
  if (!people.length){
    dashFocus.textContent = "—";
    dashPause.textContent = "—";
    dashWarning.textContent = "—";
    dashAction.textContent = "Add someone to begin.";
    return;
  }

  const paused = people.filter(p => p.focus <= 20);
  const risky = people.filter(p => p.lastRisk);

  const focusCandidates = people
    .filter(p => p.focus >= 60 && !p.lastRisk)
    .sort((a,b)=>b.focus-a.focus)
    .slice(0,2);

  dashFocus.textContent = focusCandidates.length
    ? focusCandidates.map(p=>p.name).join(", ")
    : "—";

  dashPause.textContent = paused.length
    ? paused.map(p=>p.name).join(", ")
    : "—";

  dashWarning.textContent = risky.length
    ? risky.map(p=>p.name).join(", ")
    : "—";

  dashAction.textContent = focusCandidates.length
    ? focusCandidates[0].nextMove
    : "Stay balanced.";
}

/* =========================
   RENDER PEOPLE
   ========================= */

function render(){
  list.innerHTML = "";

  people.forEach((p,i)=>{
    const card = document.createElement("div");
    card.className = `person ${p.focus<=20?"paused":p.focus>=60&&!p.lastRisk?"glow":""}`;

    card.innerHTML = `
      <strong>${p.name}</strong>
      <span class="sub">${p.status}</span>
      <div class="focus-bar"><div class="focus-fill" style="width:${p.focus}%"></div></div>
      <div class="sub">${p.focus}% focus</div>
      <div class="advice"><strong>Next Move:</strong> ${p.nextMove}</div>
      <div class="card-actions">
        <button onclick="openEdit(${i})">Edit</button>
        <button onclick="removePerson(${i})">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });

  updateDashboard();
}

/* =========================
   ADD PERSON
   ========================= */

form.onsubmit = e => {
  e.preventDefault();
  const name = form.name.value.trim();
  if (!name) return;

  people.push({
    name,
    status: statusInput.value,
    focus,
    events: [],
    nextMove: "Observe and stay balanced.",
    lastRisk: false
  });

  save();
  render();
  form.reset();
  focus = 0;
  updateFocusUI();
};

/* =========================
   EDIT MODAL
   ========================= */

const editModal = document.getElementById("editModal");
const editNameInput = document.getElementById("editNameInput");
const editStatusSelect = document.getElementById("editStatusSelect");
const editFocus = document.getElementById("editFocus");
const editFocusValue = document.getElementById("editFocusValue");
const editNotes = document.getElementById("editNotes");
const applySmartNotes = document.getElementById("applySmartNotes");
const smartSuggestion = document.getElementById("smartSuggestion");
const detailsList = document.getElementById("detailsList");

document.getElementById("cancelEditBtn").onclick = closeEdit;
document.getElementById("saveEditBtn").onclick = saveEdit;

editFocus.oninput = ()=> editFocusValue.textContent = editFocus.value + "%";

function openEdit(i){
  editingIndex = i;
  const p = people[i];

  editNameInput.value = p.name;
  editStatusSelect.value = p.status;
  editFocus.value = p.focus;
  editFocusValue.textContent = p.focus + "%";
  editNotes.value = "";
  smartSuggestion.textContent = "Suggested: —";

  detailsList.innerHTML = p.events.length
    ? p.events.slice(-5).map(e=>`• ${e.text}`).join("<br>")
    : "No saved notes yet.";

  editModal.classList.remove("hidden");
}

function closeEdit(){
  editModal.classList.add("hidden");
  editingIndex = null;
}

/* =========================
   SAVE EDIT (NOTES CORE)
   ========================= */

function saveEdit(){
  if (editingIndex === null) return;
  const p = people[editingIndex];

  p.name = editNameInput.value.trim() || p.name;
  p.status = editStatusSelect.value;
  p.focus = parseInt(editFocus.value,10) || p.focus;

  const text = editNotes.value.trim();
  if (text && applySmartNotes.checked){
    const analysis = analyzeNotes(text);
    smartSuggestion.textContent = "Suggested: " + analysis.delta;

    let delta = analysis.delta;
    if (p.focus + delta > 95) delta = Math.max(0, 95 - p.focus);

    p.focus = Math.max(0, Math.min(100, p.focus + delta));
    p.lastRisk = analysis.risk;
    p.nextMove = generateNextMove(p, analysis);

    p.events.push({
      type: "note",
      text,
      delta,
      time: new Date().toISOString()
    });

    editNotes.value = ""; // clear after save
  }

  save();
  render();
  closeEdit();
}

/* =========================
   ACTIVITY HANDLER
   ========================= */

const activityWeights = {
  casual_meet: 6,
  proper_date: 12,
  long_date: 15,
  kiss: 16,
  close_consistent: 18,
  major_confirmation: 20
};

document.getElementById("markActivityBtn").onclick = ()=>{
  if (editingIndex === null) return;
  const sel = document.getElementById("activitySelect");
  if (!sel.value) return;

  if (!confirm("Apply this activity?")) return;

  const p = people[editingIndex];
  const delta = activityWeights[sel.value] || 0;

  p.focus = Math.min(100, p.focus + delta);
  p.events.push({
    type: "activity",
    text: sel.options[sel.selectedIndex].text,
    delta,
    time: new Date().toISOString()
  });

  p.nextMove = `This activity increased momentum.
Allow things to settle. Follow up naturally within the next 24–48 hours without over-investing.`;

  sel.value = "";
  save();
  render();
  closeEdit();
};

/* =========================
   REMOVE / SAVE
   ========================= */

function removePerson(i){
  people.splice(i,1);
  save();
  render();
}

function save(){
  localStorage.setItem("rizz_people", JSON.stringify(people));
}

/* =========================
   INIT
   ========================= */

updateFocusUI();
render();