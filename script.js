/* =========================
   Rizz Web — Version 2.4 FINAL
   NOTES INTELLIGENCE CORE
   ========================= */

/* ---------- CORE ---------- */
const form = document.getElementById("addForm");
const list = document.getElementById("peopleList");

const dashFocus = document.getElementById("dashFocus");
const dashPause = document.getElementById("dashPause");
const dashWarning = document.getElementById("dashWarning");
const dashAction = document.getElementById("dashAction");

const focusValueEl = document.getElementById("focusValue");
const statusInput = form.querySelector('[name="status"]');

const editModal = document.getElementById("editModal");
const editNameInput = document.getElementById("editNameInput");
const editStatusSelect = document.getElementById("editStatusSelect");
const editFocus = document.getElementById("editFocus");
const editFocusValue = document.getElementById("editFocusValue");
const editNotes = document.getElementById("editNotes");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const notesHistory = document.getElementById("notesHistory");
const notesHistoryList = document.getElementById("notesHistoryList");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let focus = 0;
let editingIndex = null;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];

/* ---------- UTIL ---------- */
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const now = ()=>new Date().toISOString();
const save = ()=>localStorage.setItem("rizz_people",JSON.stringify(people));

/* =========================
   INTELLIGENCE DEFINITIONS
   ========================= */

/* ACTIVITY WEIGHTS (ONLY WAY TO REACH HIGH FOCUS) */
const ACTIVITY_WEIGHTS = [
  { k:["kiss","kissed"], v:8 },
  { k:["date","went out","met up"], v:6 },
  { k:["slept","spent night","overnight"], v:15 },
  { k:["sex","made love"], v:20 },
  { k:["introduced","family","parents"], v:18 },
  { k:["trip","travel","vacation"], v:12 }
];

/* EMOTIONAL SIGNALS */
const SIGNALS = {
  positive:["happy","comfortable","safe","love","affection","care"],
  negative:["ignored","cold","dry","anxious","confused","hurt","overthinking"],
  danger:["blocking","ghosting","no reply","disrespect"]
};

/* NEXT MOVE POOLS (LONG FORM, ROTATED) */
const NEXT_MOVES = {
  pullback: [
    "You are emotionally ahead right now. Pull back for 48–72 hours. Let her re-enter without pressure. This protects your value and stops emotional leakage.",
    "Reduce initiation. Respond warmly but briefly. If interest is real, she will step forward.",
    "Silence is strategy here. Give space and observe behavior instead of words."
  ],
  steady: [
    "Momentum is neutral. Stay consistent without pushing. Light communication, no emotional weight.",
    "Let things flow naturally. Avoid forcing plans. Calm confidence builds attraction.",
    "Keep routine steady. Don’t escalate until effort is matched."
  ],
  advance: [
    "Positive signals detected. Reinforce connection with a relaxed meet-up suggestion.",
    "You can escalate gently. Keep it simple and pressure-free.",
    "This is a good moment to deepen interaction without rushing."
  ],
  warning: [
    "High emotional risk detected. Protect your energy immediately. Do not chase.",
    "Disengage slightly. Re-evaluate investment levels.",
    "Pause initiation and reset emotional balance."
  ]
};

/* =========================
   NOTES INTERPRETER
   ========================= */
function interpretNotes(text){
  const t = text.toLowerCase();
  let focusDelta = 0;
  let risk = false;
  let activityBoost = 0;

  SIGNALS.positive.forEach(w=>{
    if(t.includes(w)) focusDelta += 2;
  });

  SIGNALS.negative.forEach(w=>{
    if(t.includes(w)) focusDelta -= 3;
  });

  SIGNALS.danger.forEach(w=>{
    if(t.includes(w)) risk = true;
  });

  ACTIVITY_WEIGHTS.forEach(a=>{
    if(a.k.some(k=>t.includes(k))){
      activityBoost = Math.max(activityBoost,a.v);
    }
  });

  focusDelta = clamp(focusDelta,-10,10);
  return { focusDelta, activityBoost, risk };
}

/* =========================
   NEXT MOVE GENERATOR
   ========================= */
function generateNextMove(p,analysis){
  p.adviceIndex = p.adviceIndex || 0;

  let pool = NEXT_MOVES.steady;
  if(analysis.risk) pool = NEXT_MOVES.warning;
  else if(analysis.focusDelta < 0) pool = NEXT_MOVES.pullback;
  else if(analysis.focusDelta > 3 || analysis.activityBoost >= 10) pool = NEXT_MOVES.advance;

  const move = pool[p.adviceIndex % pool.length];
  p.adviceIndex++;
  return move;
}

/* =========================
   DASHBOARD (EXCLUSIVE)
   ========================= */
function updateDashboard(){
  dashFocus.textContent = "—";
  dashPause.textContent = "—";
  dashWarning.textContent = "—";
  dashAction.textContent = "Stay steady.";

  let warning = people.find(p=>p.risk);
  let focusP = people.filter(p=>!p.risk && p.focus>=60).sort((a,b)=>b.focus-a.focus)[0];
  let pauseP = people.filter(p=>!p.risk && p.focus<=20)[0];

  if(warning){
    dashWarning.textContent = warning.name;
    dashAction.textContent = warning.nextMove;
  } else if(focusP){
    dashFocus.textContent = focusP.name;
    dashAction.textContent = focusP.nextMove;
  } else if(pauseP){
    dashPause.textContent = pauseP.name;
    dashAction.textContent = pauseP.nextMove;
  }
}

/* =========================
   RENDER
   ========================= */
function render(){
  list.innerHTML = "";
  people.forEach((p,i)=>{
    const d = document.createElement("div");
    d.className = "person";
    d.dataset.i = i;
    d.innerHTML = `
      <strong>${p.name}</strong>
      <span class="sub">${p.status}</span>
      <div class="focus-bar"><div class="focus-fill" style="width:${p.focus}%"></div></div>
      <div class="sub">${p.focus}% focus</div>
      <div class="advice"><strong>Next Move:</strong> ${p.nextMove}</div>
      <div class="card-actions">
        <button class="edit-btn">Edit</button>
        <button class="remove-btn">Remove</button>
      </div>`;
    list.appendChild(d);
  });
  updateDashboard();
}

/* =========================
   EVENTS
   ========================= */
list.addEventListener("click",e=>{
  const card = e.target.closest(".person");
  if(!card) return;
  const i = +card.dataset.i;

  if(e.target.classList.contains("edit-btn")) openEdit(i);
  if(e.target.classList.contains("remove-btn")){
    people.splice(i,1); save(); render();
  }
});

/* =========================
   ADD PERSON
   ========================= */
form.onsubmit = e=>{
  e.preventDefault();
  const name = form.name.value.trim();
  if(!name) return;

  people.push({
    name,
    status:statusInput.value,
    focus,
    nextMove:"Observe calmly.",
    events:[],
    adviceIndex:0,
    risk:false
  });

  save(); render();
  form.reset();
  focus=0;
  focusValueEl.textContent="0%";
};

/* =========================
   EDIT
   ========================= */
function openEdit(i){
  editingIndex=i;
  const p=people[i];
  editNameInput.value=p.name;
  editStatusSelect.value=p.status;
  editFocus.value=p.focus;
  editFocusValue.textContent=p.focus+"%";
  editNotes.value="";
  notesHistory.classList.add("hidden");
  notesHistoryList.innerHTML=p.events.map(e=>`• ${e.text}`).join("<br>")||"No history.";
  editModal.classList.remove("hidden");
}

editFocus.oninput=()=>editFocusValue.textContent=editFocus.value+"%";

toggleHistoryBtn.onclick=()=>{
  notesHistory.classList.toggle("hidden");
};

cancelEditBtn.onclick=()=>{
  editModal.classList.add("hidden");
  editingIndex=null;
};

saveEditBtn.onclick=()=>{
  const p=people[editingIndex];
  p.name=editNameInput.value||p.name;
  p.status=editStatusSelect.value;
  p.focus=clamp(+editFocus.value,0,100);

  if(editNotes.value.trim()){
    const analysis=interpretNotes(editNotes.value);
    p.focus=clamp(p.focus+analysis.focusDelta+analysis.activityBoost,0,100);
    p.risk=analysis.risk;
    p.nextMove=generateNextMove(p,analysis);
    p.events.push({text:editNotes.value,time:now()});
  }

  save(); render();
  editModal.classList.add("hidden");
  editingIndex=null;
};

/* INIT */
render();