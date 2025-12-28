/* ============================
   RIZZ WEB — VERSION 2.4
   NOTES AUTHORITY ENGINE
   FULL SCRIPT (CLEAN REBUILD)
============================ */

/* ============================
   STORAGE
============================ */
const STORAGE_KEY = "rizz_v24_people";
let people = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editingIndex = null;

/* ============================
   UTILITIES
============================ */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

/* ============================
   NOTES INTELLIGENCE
============================ */
function analyzeNotes(text) {
  const t = text.toLowerCase();
  let delta = 0;
  let tags = [];

  // POSITIVE
  if (t.includes("called me")) { delta += 15; tags.push("call"); }
  if (t.includes("we talked")) { delta += 10; }
  if (t.includes("she loves me")) { delta += 20; }
  if (t.includes("kiss")) { delta += 20; tags.push("kiss"); }
  if (t.includes("met")) { delta += 15; }

  // NEGATIVE
  if (t.includes("ignored")) { delta -= 10; }
  if (t.includes("does not love")) { delta -= 15; }
  if (t.includes("hates me")) { delta -= 20; }
  if (t.includes("blocked")) { delta -= 25; }

  // EMOTIONAL STATES
  if (t.includes("confused")) tags.push("confused");
  if (t.includes("distance")) tags.push("distance");
  if (t.includes("busy")) tags.push("busy");

  return { delta, tags };
}

/* ============================
   NEXT MOVE ENGINE
============================ */
function generateNextMove(person, tags) {
  const f = person.focus;
  const s = person.status;

  // Pause logic
  if (s === "pause") {
    return "Step back fully. No initiating. Let silence reset emotional balance and observe reactions calmly.";
  }

  // Low focus
  if (f < 20) {
    return "Do nothing for now. Focus on yourself and avoid emotional chasing. Let attraction breathe.";
  }

  // Medium focus
  if (f < 50) {
    if (tags.includes("distance") || tags.includes("busy")) {
      return "Reduce pressure. Keep light contact only. Give space and allow curiosity to rebuild naturally.";
    }
    return "Stay present but relaxed. Light humor or casual check-ins only. No deep talks yet.";
  }

  // High focus
  if (f < 80) {
    if (tags.includes("call") || tags.includes("kiss")) {
      return "Follow up naturally within 24–48 hours. Suggest a calm plan that continues the momentum without rushing.";
    }
    return "Increase warmth gradually. Suggest something simple that builds shared time and comfort.";
  }

  // Very high focus
  return "Strong position. Maintain calm confidence. Lead gently with plans while staying emotionally grounded.";
}

/* ============================
   DASHBOARD
============================ */
function updateDashboard() {
  const focusEl = document.getElementById("dashFocus");
  const pauseEl = document.getElementById("dashPause");
  const actionEl = document.getElementById("dashAction");

  const focused = people.filter(p => p.focus >= 20 && p.status !== "pause");
  const paused = people.filter(p => p.status === "pause");

  focusEl.textContent = focused[0]?.name || "—";
  pauseEl.textContent = paused[0]?.name || "—";

  if (focused[0]) {
    actionEl.textContent = focused[0].nextMove;
  } else {
    actionEl.textContent = "Add someone to begin.";
  }
}

/* ============================
   RENDER PEOPLE
============================ */
function renderPeople() {
  const list = document.getElementById("peopleList");
  list.innerHTML = "";

  people.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "person" + (p.status === "pause" ? " pause" : "");

    if (p.focus >= 20) card.classList.add("high-focus");

    card.innerHTML = `
      <div class="name">${p.name}</div>
      <div class="focus">${p.focus}% focus</div>
      <div class="next"><b>Next Move:</b> ${p.nextMove}</div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button onclick="editPerson(${i})">Edit</button>
        <button onclick="removePerson(${i})">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });

  updateDashboard();
}

/* ============================
   ADD PERSON
============================ */
document.getElementById("addForm").addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  const person = {
    name,
    status: "crush",
    focus: 0,
    notesHistory: [],
    nextMove: "Observe and stay balanced."
  };

  people.push(person);
  save();
  renderPeople();
  e.target.reset();
});

/* ============================
   EDIT PERSON
============================ */
function editPerson(index) {
  editingIndex = index;
  const p = people[index];

  document.getElementById("editName").value = p.name;
  document.getElementById("editStatus").value = p.status;
  document.getElementById("editFocus").value = p.focus;
  document.getElementById("editFocusValue").textContent = p.focus + "%";
  document.getElementById("editNotes").value = "";

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEdit() {
  document.getElementById("editModal").classList.add("hidden");
  editingIndex = null;
}

document.getElementById("editFocus").addEventListener("input", e => {
  document.getElementById("editFocusValue").textContent = e.target.value + "%";
});

/* ============================
   SAVE EDIT
============================ */
function saveEdit() {
  if (editingIndex === null) return;

  const p = people[editingIndex];
  p.name = document.getElementById("editName").value.trim();
  p.status = document.getElementById("editStatus").value;
  p.focus = parseInt(document.getElementById("editFocus").value);

  const notes = document.getElementById("editNotes").value.trim();
  const auto = document.getElementById("autoNotes").checked;

  if (notes && auto) {
    const analysis = analyzeNotes(notes);
    p.focus = clamp(p.focus + analysis.delta, 0, 100);
    p.nextMove = generateNextMove(p, analysis.tags);

    p.notesHistory.unshift({
      text: notes,
      delta: analysis.delta,
      time: new Date().toLocaleString()
    });
  }

  save();
  closeEdit();
  renderPeople();
}

/* ============================
   REMOVE PERSON
============================ */
function removePerson(index) {
  people.splice(index, 1);
  save();
  renderPeople();
}

/* ============================
   INIT
============================ */
renderPeople();