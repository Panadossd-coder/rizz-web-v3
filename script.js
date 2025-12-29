/* =========================
   script.js — Rizz Web v2.4 (Fixed)
   Notes Authority — UI + Glow fixes
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- DOM ---------- */
  const form = document.getElementById("addForm");
  const list = document.getElementById("peopleList");

  const dashFocus = document.getElementById("dashFocus");
  const dashPause = document.getElementById("dashPause");
  const dashAction = document.getElementById("dashAction");

  const focusValueEl = document.getElementById("focusValue");
  const focusInput = form.querySelector('[name="focus"]');
  const statusInput = form.querySelector('[name="status"]');

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

  /* ---------- state ---------- */
  let focus = 0;
  let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
  let editingIndex = null;

  /* utility */
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const nowISO = () => new Date().toISOString();
  const saveStorage = () => localStorage.setItem("rizz_people", JSON.stringify(people));
  const escapeHtml = s => (s===undefined||s===null) ? "" : String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  /* status buttons */
  document.querySelectorAll(".status-buttons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".status-buttons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (statusInput) statusInput.value = btn.dataset.status;
    });
  });
  const defaultBtn = document.querySelector('[data-status="crush"]');
  if (defaultBtn) defaultBtn.classList.add("active");

  /* plus/minus */
  const plusBtn = document.getElementById("plus");
  const minusBtn = document.getElementById("minus");
  if (plusBtn) plusBtn.addEventListener("click", () => { focus = clamp(focus + 10, 0, 100); updateFocusUI(); });
  if (minusBtn) minusBtn.addEventListener("click", () => { focus = clamp(focus - 10, 0, 100); updateFocusUI(); });

  function updateFocusUI(){ if (focusValueEl) focusValueEl.textContent = focus + "%"; if (focusInput) focusInput.value = focus; }
  updateFocusUI();

  /* ========== NOTES INTELLIGENCE (kept from v2.4) ========== */
  function analyzeNotes(rawText){
    const raw = (rawText||"").trim();
    const t = raw.toLowerCase();
    if (!t) return { delta:0, signals:[], tags:[], severity:0, activityBoost:0, reason:"" };
// ===== BETRAYAL DETECTION (HARD OVERRIDE) =====
const betrayalPatterns = [
  "cheated",
  "cheating",
  "slept with someone else",
  "was seeing another guy",
  "was seeing another man",
  "was seeing someone else",
  "had another boyfriend",
  "had another man",
  "betrayed me"
];

const isBetrayal = betrayalPatterns.some(p => t.includes(p));

if (isBetrayal) {
  return {
    delta: -18,
    signals: ["betrayal"],
    tags: ["betrayal"],
    severity: 4,
    activityBoost: 0,
    reason: "trust betrayal detected"
  };
}
    const positive = ["love","liked","enjoyed","happy","comfortable","close","connected","vibed"];
    const negative = ["ignore","ignored","no reply","doesn't reply","does not reply","didn't reply","dry","hate","hates","not love","does not love","doesn't love","rejected","ghost","ghosted","argue","fight","hurt"];
    const activityMap = [
      { kws:["we had sex","made love","had sex","we slept"], v:20, tag:"sex" },
      { kws:["met parents","introduced to my parents","introduced to her parents","introduced to family"], v:18, tag:"introduced" },
      { kws:["slept over","spent the night","overnight"], v:15, tag:"overnight" },
      { kws:["trip","travel","vacation","went away"], v:12, tag:"trip" },
      { kws:["kiss","kissed"], v:8, tag:"kiss" },
      { kws:["date","met up","hung out","coffee","dinner"], v:6, tag:"date" }
    ];

    const posCount = positive.reduce((s,w)=>s + (t.includes(w)?1:0),0);
    const negCount = negative.reduce((s,w)=>s + (t.includes(w)?1:0),0);

    const rejectionPatterns = [
      /she (told|said) .*does not love/i,
      /she (told|said) .*doesn't love/i,
      /\bdoes not love me\b/,
      /\bdoesn't love me\b/,
      /\bis not in love\b/,
      /\bisn't in love\b/
    ];
    const directRejection = rejectionPatterns.some(rx => rx.test(raw));

    let severity = 0;
    if (directRejection) severity = 3;
    else if (negCount >= 2) severity = 2;
    else if (negCount === 1) severity = 1;
    else if (posCount >= 2) severity = 1;

    let activityBoost = 0;
    const activityTags = [];
    activityMap.forEach(a=>{ if (a.kws.some(k=>t.includes(k))){ activityBoost = Math.max(activityBoost,a.v); activityTags.push(a.tag); }});

    const sentiment = clamp(posCount - negCount, -3, 3);

    let delta = 0;
    if (severity === 3) delta -= 12;
    else if (severity === 2) delta -= 8;
    else if (severity === 1 && negCount > posCount) delta -= 5;
    if (posCount > negCount && activityBoost === 0) delta += Math.min(6, posCount * 2);
    delta += sentiment * 1;

    if (activityBoost > 0) delta = clamp(Math.round((activityBoost * 0.9) + (delta * 0.4)), -20, 20);
    else delta = clamp(Math.round(delta), -20, 20);

    const signals = [];
    if (activityTags.length) signals.push(...activityTags);
    if (directRejection) signals.push("rejection");
    if (negCount > posCount && !directRejection) signals.push("distance");
    if (posCount > negCount) signals.push("positive");
    if (t.includes("argue")||t.includes("fight")) signals.push("conflict");

    const reason = [];
    if (activityTags.length) reason.push("activity:"+activityTags.join(","));
    if (directRejection) reason.push("direct rejection");
    if (negCount) reason.push("neg words:"+negCount);
    if (posCount) reason.push("pos words:"+posCount);

    return { delta, signals, tags: signals, severity, activityBoost, reason: reason.join(" | ") };
  }

  /* ========== NEXT MOVE (history-aware) ========== */
  const POOLS = {
    rejection: [
      "That was a clear boundary. Accept it with dignity — do not beg or plead. Pull back now; take at least a week of low contact and focus on yourself. If she reconsiders, let it be on her terms.",
      "Direct rejection hurts. Protect your energy: pause initiating contact, lean on friends, and rebuild your routine. Avoid long messages asking for reasons.",
      "This is firm. Give yourself space and stop trying to change her mind. Work on small personal wins for the next 7–14 days before re-engaging (only if she shows consistent effort)."
    ],
    distance: [
      "Signals show distance. Reduce initiation for 48–72 hours and send one calm check-in afterwards if needed. Keep tone light and avoid emotional heavy messages.",
      "She’s pulling away. Match energy: short, warm replies, no chasing. Observe for 3 days; consistent effort should follow if she's interested.",
      "Give space and focus on your own routine. If she reaches out, respond warmly but briefly — don’t re-run the whole emotional conversation."
    ],
    positive: [
      "Momentum is good. Reinforce it with a casual plan (coffee, short date) and keep things confident and light — no heavy 'future' talk yet.",
      "You're moving forward. Suggest a low-pressure meet and enjoy the moment; small consistent actions beat long declarations."
    ],
    conflict: [
      "Conflict detected. Avoid escalation — apologize briefly if you were at fault, then suggest cooling off and talking when both are calm.",
      "Take a step back to cool the situation. Clear, short, values-driven messages work better than long emotional texts right now."
    ],
    activity: [
      "Physical closeness happened — follow up gently within 24–48 hours, leaning on warmth and light plans, not pressure.",
      "A shared moment opens chance for deeper connection. Suggest a relaxed plan that builds trust rather than moving too fast."
    ],
    default: [
      "Stay steady: small, consistent contact wins. Avoid heavy emotional messages and let time reveal real effort.",
      "Observe and keep composing yourself. Calm confidence attracts more than chasing."
    ]
  };

  function generateNextMove(person, analysis) {
    person.adviceHistory = person.adviceHistory || [];
    let pool = POOLS.default;
    if (analysis.signals.includes("rejection")) pool = POOLS.rejection;
    else if (analysis.signals.includes("distance")) pool = POOLS.distance;
    else if (analysis.signals.includes("positive")) pool = POOLS.positive;
    else if (analysis.signals.includes("conflict")) pool = POOLS.conflict;
    else if (analysis.signals.some(s=>["sex","overnight","trip","kiss","date","introduced"].includes(s))) pool = POOLS.activity;

    let candidate = pool.find(x => !person.adviceHistory.includes(x));
    if (!candidate) candidate = pool[Math.floor(Math.random()*pool.length)];

    person.adviceHistory.push(candidate);
    if (person.adviceHistory.length > 10) person.adviceHistory.shift();

    return candidate;
  }

  /* ========== RENDER ========== */
  function render() {
    list.innerHTML = "";

    // glow logic: top two by focus >= 60
    const glowSet = new Set(people.filter(p => p.focus >= 60).sort((a,b)=>b.focus-a.focus).slice(0,2).map(p=>p.name));

    people.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "person";
      card.dataset.index = i;

      // paused detection: either status === 'pause' OR focus <= 20 (auto-pause)
      const isPaused = (p.status === "pause") || (p.focus <= 20);
      if (isPaused) card.classList.add("paused");
      else if (p.focus <= 20) card.classList.add("low-focus");

      // glow if high focus and not paused
      if (!isPaused && glowSet.has(p.name)) card.classList.add("glow");

      const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";

      card.innerHTML = `
        <strong>${escapeHtml(p.name)}</strong>
        <span class="sub">${escapeHtml(p.status)}</span>

        <div class="focus-bar" aria-hidden="true">
          <div class="focus-fill" style="width:${p.focus}%"></div>
        </div>
        <div class="sub">${p.focus}% focus</div>

        ${p.activityIcon ? `<div class="sub" style="margin-top:8px;">${escapeHtml(p.activityIcon)} ${escapeHtml(p.activityLabel||"")}</div>` : "" }

        ${reminderHtml}

        <div class="advice"><strong>Next Move:</strong> ${escapeHtml(p.nextMove || "Stay steady.")}</div>

        <div class="card-actions">
          <button class="edit-btn" data-index="${i}" type="button">Edit</button>
          <button class="remove-btn" data-index="${i}" type="button">Remove</button>
        </div>
      `;
      list.appendChild(card);
    });

    updateDashboard();
    saveStorage();
  }

  /* ========== DASHBOARD ========== */
  function updateDashboard(){
    if (!people.length) {
      if (dashFocus) dashFocus.textContent = "—";
      if (dashPause) dashPause.textContent = "—";
      if (dashAction) dashAction.textContent = "Add someone to begin.";
      return;
    }

    // focus candidate = highest focus >= 60
    const focusCandidate = people.filter(p=>p.focus>=60).sort((a,b)=>b.focus-a.focus)[0] || null;
    const pausedList = people.filter(p => p.status === "pause" || p.focus <= 20);

    if (dashFocus) dashFocus.textContent = focusCandidate ? focusCandidate.name : "—";
    if (dashPause) dashPause.textContent = pausedList.length ? pausedList.map(x=>x.name).join(", ") : "—";
    if (dashAction) dashAction.textContent = focusCandidate ? focusCandidate.nextMove : "Observe and keep composing yourself. Calm confidence attracts more than chasing.";
  }

  /* ========== ADD PERSON ========== */
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = (form.name.value || "").trim();
      if (!name) return;

      const p = {
        name,
        status: statusInput ? statusInput.value : "crush",
        focus: focus || 0,
        reminder: form.reminder ? (form.reminder.value || "").trim() : "",
        nextMove: "Stay steady.",
        notesHistory: [],
        adviceHistory: [],
        activityIcon: "",
        activityLabel: ""
      };

      // quick note
      const quick = form.quickNote ? (form.quickNote.value || "").trim() : "";
      if (quick) {
        const analysis = analyzeNotes(quick);
        let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);
        if (newFocus > 95 && analysis.activityBoost < 20) newFocus = Math.min(newFocus, 95);
        // ===== BETRAYAL FOCUS CAP =====
if (
  p.notesHistory &&
  p.notesHistory.some(n => n.analysis && n.analysis.tags?.includes("betrayal"))
) {
  newFocus = Math.min(newFocus, 45);
}
        p.focus = newFocus;

        // if activity tag exists, set a simple icon / label for card
        if (analysis.signals.some(s => ["kiss","date","overnight","trip","sex","introduced"].includes(s))) {
          p.activityIcon = "⏰";
          p.activityLabel = analysis.signals.join(", ");
        }

        p.nextMove = generateNextMove(p, analysis);
        p.notesHistory.push({ text: quick, time: nowISO(), delta: analysis.delta, analysis });
        form.quickNote.value = "";
      }

      people.push(p);
      saveStorage();
      render();
      form.reset();
      focus = 0;
      updateFocusUI();
    });
  }

  /* ========== EVENT DELEGATION ========== */
  list.addEventListener("click", e => {
    const editBtn = e.target.closest(".edit-btn");
    const removeBtn = e.target.closest(".remove-btn");
    if (editBtn) {
      const idx = parseInt(editBtn.dataset.index, 10);
      if (!isNaN(idx)) openEdit(idx);
      return;
    }
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.index, 10);
      if (!isNaN(idx)) { people.splice(idx,1); saveStorage(); render(); }
      return;
    }
  });

  /* ========== EDIT ---------- */
  function openEdit(i){
    editingIndex = i;
    const p = people[i];
    if (!p) return;

    editName.value = p.name || "";
    editStatus.value = p.status || "crush";
    editFocus.value = p.focus || 0;
    editFocusValue.textContent = (p.focus || 0) + "%";
    editNotes.value = "";
    if (autoNotes) autoNotes.checked = true;

    if (editModal) editModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  if (editFocus && editFocusValue) {
    editFocus.addEventListener("input", ()=> editFocusValue.textContent = editFocus.value + "%");
  }

  if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => closeEdit());

  function closeEdit(){ if (editModal) editModal.classList.add("hidden"); document.body.style.overflow = ""; editingIndex = null; }

  if (saveEditBtn) saveEditBtn.addEventListener("click", () => {
    if (editingIndex === null) return;
    const p = people[editingIndex];
    if (!p) return;

    p.name = (editName.value || "").trim() || p.name;
    p.status = editStatus.value || p.status;
    p.focus = clamp(parseInt(editFocus.value,10) || 0, 0, 100);

    const noteText = (editNotes.value || "").trim();
    const apply = autoNotes ? !!autoNotes.checked : true;
    if (noteText && apply) {
      const analysis = analyzeNotes(noteText);
      let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);
      if (newFocus > 95 && analysis.activityBoost < 20) newFocus = Math.min(newFocus, 95);
      p.focus = newFocus;

      if (analysis.signals.some(s => ["kiss","date","overnight","trip","sex","introduced"].includes(s))) {
        p.activityIcon = "⏰";
        p.activityLabel = analysis.signals.join(", ");
      }

      p.nextMove = generateNextMove(p, analysis);
      p.notesHistory = p.notesHistory || [];
      p.notesHistory.push({ text: noteText, time: nowISO(), delta: analysis.delta, analysis });
      editNotes.value = "";
    }

    saveStorage();
    render();
    closeEdit();
  });

  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      if (editingIndex === null) return alert("Open a person to view history.");
      const p = people[editingIndex];
      if (!p) return;
      if (!p.notesHistory || p.notesHistory.length === 0) return alert("No notes yet.");
      const items = p.notesHistory.slice().reverse().map(it => {
        const dt = new Date(it.time).toLocaleString();
        const d = (typeof it.delta === "number") ? (it.delta>0?`(+${it.delta}%)`:`(${it.delta}%)`) : "";
        const txt = it.text.length > 140 ? it.text.slice(0,140) + "…" : it.text;
        return `• ${txt} ${d}\n  ${dt}`;
      });
      alert(items.join("\n\n"));
    });
  }

  /* init */
  render();

  /* expose */
  window.rizz = { people, analyzeNotes, render, saveStorage };
});