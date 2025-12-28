/* =========================
   Rizz Web — Version 2.4
   Notes Authority (Clean)
   ========================= */

/* ---------- ELEMENTS ---------- */
const form = document.getElementById("addForm");
const list = document.getElementById("peopleList");

const dashFocus = document.getElementById("dashFocus");
const dashPause = document.getElementById("dashPause");
const dashAction = document.getElementById("dashAction");

const focusValueEl = document.getElementById("focusValue");
const focusInput = form.querySelector('[name="focus"]');
const statusInput = form.querySelector('[name="status"]');

/* EDIT MODAL */
const editModal = document.getElementById("editModal");
const editName = document.getElementById("editName");
const editStatus = document.getElementById("editStatus");
const editFocus = document.getElementById("editFocus");
const editFocusValue = document.getElementById("editFocusValue");
const editNotes = document.getElementById("editNotes");
const autoNotes = document.getElementById("autoNotes");

const saveEditBtn = document.getElementById("saveEdit");
const cancelEditBtn = document.getElementById("cancelEdit");
const viewHistoryBtn = document.getElementById("viewHistory");

/* ---------- STATE ---------- */
let focus = 0;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
let editingIndex = null;

/* =========================
   STATUS BUTTONS
   ========================= */
document.querySelectorAll(".status-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".status-buttons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    statusInput.value = btn.dataset.status;
  });
});

document.querySelector('[data-status="crush"]').classList.add("active");

/* =========================
   FOCUS CONTROLS (+ / -)
   ========================= */
document.getElementById("plus").onclick = () => {
  focus = Math.min(100, focus + 10);
  updateFocusUI();
};

document.getElementById("minus").onclick = () => {
  focus = Math.max(0, focus - 10);
  updateFocusUI();
};

function updateFocusUI() {
  focusValueEl.textContent = focus + "%";
  focusInput.value = focus;
}

/* =========================
   NOTES INTELLIGENCE
   ========================= */
function analyzeNotes(text) {
  const t = text.toLowerCase();

  let delta = 0;
  let signals = [];

  const rules = [
    { keys: ["kiss", "hug", "cuddle"], d: 20, tag: "physical closeness" },
    { keys: ["call", "talked", "voice"], d: 10, tag: "communication" },
    { keys: ["date", "met", "hangout"], d: 15, tag: "quality time" },
    { keys: ["ignored", "no reply", "dry"], d: -10, tag: "distance" },
    { keys: ["argue", "fight", "mad"], d: -15, tag: "conflict" },
    { keys: ["miss", "love", "care"], d: 5, tag: "emotional expression" }
  ];

  rules.forEach(r => {
    if (r.keys.some(k => t.includes(k))) {
      delta += r.d;
      signals.push(r.tag);
    }
  });

  delta = Math.max(-20, Math.min(20, delta));

  return { delta, signals };
}

/* =========================
   NEXT MOVE ENGINE
   ========================= */
function generateNextMove(p, signals = []) {
  const pool = [];

  if (p.status === "pause") {
    return "Step back fully. No contact. Reset emotional balance.";
  }

  if (signals.includes("physical closeness")) {
    pool.push(
      "Let the moment breathe. Follow up calmly within 24–48 hours.",
      "Keep confidence steady. Don’t rush escalation."
    );
  }

  if (signals.includes("distance")) {
    pool.push(
      "Pull back slightly. Let her space reveal interest.",
      "Avoid chasing. Focus on your routine."
    );
  }

  if (signals.includes("communication")) {
    pool.push(
      "Maintain rhythm. Light check-in, no pressure.",
      "Use warmth, not intensity."
    );
  }

  if (!pool.length) {
    pool.push(
      "Observe and stay balanced.",
      "Let things flow naturally. Calm confidence builds attraction."
    );
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/* =========================
   ADD PERSON
   ========================= */
form.onsubmit = e => {
  e.preventDefault();

  const name = form.name.value.trim();
  if (!name) return;

  const p = {
    name,
    status: statusInput.value,
    focus,
    nextMove: "Observe and stay balanced.",
    notesHistory: []
  };

  people.push(p);
  save();
  render();

  form.reset();
  focus = 0;
  updateFocusUI();
};

/* =========================
   EDIT MODAL
   ========================= */
function openEdit(i) {
  editingIndex = i;
  const p = people[i];

  editName.value = p.name;
  editStatus.value = p.status;
  editFocus.value = p.focus;
  editFocusValue.textContent = p.focus + "%";
  editNotes.value = "";

  editModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

editFocus.oninput = () => {
  editFocusValue.textContent = editFocus.value + "%";
};

cancelEditBtn.onclick = closeEdit;

function closeEdit() {
  editModal.classList.add("hidden");
  document.body.style.overflow = "";
  editingIndex = null;
}

saveEditBtn.onclick = () => {
  if (editingIndex === null) return;

  const p = people[editingIndex];
  p.name = editName.value.trim();
  p.status = editStatus.value;
  p.focus = parseInt(editFocus.value, 10);

  if (autoNotes.checked && editNotes.value.trim()) {
    const analysis = analyzeNotes(editNotes.value);
    p.focus = Math.max(0, Math.min(100, p.focus + analysis.delta));
    p.nextMove = generateNextMove(p, analysis.signals);

    p.notesHistory.push({
      text: editNotes.value,
      delta: analysis.delta,
      time: new Date().toLocaleString()
    });

    editNotes.value = "";
  }

  save();
  render();
  closeEdit();
};

viewHistoryBtn.onclick = () => {
  if (editingIndex === null) return;
  const p = people[editingIndex];
  alert(
    p.notesHistory.length
      ? p.notesHistory.map(n => `• ${n.text} (${n.delta > 0 ? "+" : ""}${n.delta}%)`).join("\n\n")
      : "No notes yet."
  );
};

/* =========================
   RENDER
   ========================= */
function render() {
  list.innerHTML = "";

  people.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "person";

    if (p.status === "pause") card.classList.add("paused");
    if (p.focus >= 70) card.classList.add("glow");

    card.innerHTML = `
      <strong>${p.name}</strong>
      <span class="sub">${p.status}</span>

      <div class="focus-bar">
        <div class="focus-fill" style="width:${p.focus}%"></div>
      </div>
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
   DASHBOARD
   ========================= */
function updateDashboard() {
  if (!people.length) {
    dashFocus.textContent = "—";
    dashPause.textContent = "—";
    dashAction.textContent = "Add someone to begin.";
    return;
  }

  const focusPerson = people.filter(p => p.focus >= 70).sort((a,b)=>b.focus-a.focus)[0];
  const paused = people.filter(p => p.status === "pause");

  dashFocus.textContent = focusPerson ? focusPerson.name : "—";
  dashPause.textContent = paused.length ? paused.map(p=>p.name).join(", ") : "—";
  dashAction.textContent = focusPerson ? focusPerson.nextMove : "Observe and stay balanced.";
}

/* =========================
   REMOVE / SAVE
   ========================= */
function removePerson(i) {
  people.splice(i, 1);
  save();
  render();
}

function save() {
  localStorage.setItem("rizz_people", JSON.stringify(people));
}

/* INIT */
updateFocusUI();
render();