/* =========================
   script.js — Rizz Web v2.4 (Full)
   Notes Authority — Clean rebuild
   ========================= */

/* ---------- Safe DOM-ready wrapper ---------- */
document.addEventListener("DOMContentLoaded", () => {

  /* ---------- ELEMENTS ---------- */
  const form = document.getElementById("addForm");
  const list = document.getElementById("peopleList");

  const dashFocus = document.getElementById("dashFocus");
  const dashPause = document.getElementById("dashPause");
  const dashAction = document.getElementById("dashAction");

  const focusValueEl = document.getElementById("focusValue");
  const focusInput = form.querySelector('[name="focus"]');
  const statusInput = form.querySelector('[name="status"]');

  // Edit modal
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

  /* ---------- UTIL ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nowISO = () => new Date().toISOString();
  const saveStorage = () => localStorage.setItem("rizz_people", JSON.stringify(people));
  const escapeHtml = s => {
    if (s === undefined || s === null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  };

  /* ---------- UI INIT (status buttons + default) ---------- */
  document.querySelectorAll(".status-buttons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".status-buttons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (statusInput) statusInput.value = btn.dataset.status;
    });
  });
  const defaultStatusBtn = document.querySelector('[data-status="crush"]');
  if (defaultStatusBtn) defaultStatusBtn.classList.add("active");

  /* ---------- Focus + / - on add form ---------- */
  const plusBtn = document.getElementById("plus");
  const minusBtn = document.getElementById("minus");
  if (plusBtn) plusBtn.addEventListener("click", () => { focus = clamp(focus + 10, 0, 100); updateFocusUI(); });
  if (minusBtn) minusBtn.addEventListener("click", () => { focus = clamp(focus - 10, 0, 100); updateFocusUI(); });

  function updateFocusUI() {
    if (focusValueEl) focusValueEl.textContent = focus + "%";
    if (focusInput) focusInput.value = focus;
  }

  /* ---------- Notes Intelligence (advanced) ---------- */
  function analyzeNotes(rawText) {
    const raw = (rawText || "").trim();
    const t = raw.toLowerCase();
    if (!t) return { delta: 0, signals: [], tags: [], severity: 0, activityBoost: 0, reason: "" };

    // lexicons
    const positive = ["love","liked","enjoyed","happy","comfortable","close","connected","vibed","we vibed","we clicked"];
    const negative = ["ignore","ignored","no reply","doesn't reply","does not reply","didn't reply","dry","hate","hates","not love","does not love","doesn't love","rejected","left on read","ghost","ghosted","argue","fight","mad","hurt"];
    const activityMap = [
      { kws:["we had sex","made love","had sex","we slept"], v:20, tag:"sex" },
      { kws:["met parents","introduced to my parents","introduced to her parents","introduced to family"], v:18, tag:"introduced" },
      { kws:["slept over","spent the night","overnight"], v:15, tag:"overnight" },
      { kws:["trip","travel","vacation","went away"], v:12, tag:"trip" },
      { kws:["kiss","kissed"], v:8, tag:"kiss" },
      { kws:["date","met up","hung out","coffee","dinner"], v:6, tag:"date" }
    ];

    // counts
    const posCount = positive.reduce((acc,w)=>acc + (t.includes(w) ? 1 : 0), 0);
    const negCount = negative.reduce((acc,w)=>acc + (t.includes(w) ? 1 : 0), 0);

    // direct rejection detection (phrases)
    const rejectionPatterns = [
      /she (told|said|told me) .*does not love/i,
      /she (told|said|told me) .*doesn't love/i,
      /\bdoes not love me\b/,
      /\bdoesn't love me\b/,
      /\bis not in love\b/,
      /\bisn't in love\b/
    ];
    const directRejection = rejectionPatterns.some(rx => rx.test(raw));

    // severity
    let severity = 0;
    if (directRejection) severity = 3;
    else if (negCount >= 2) severity = 2;
    else if (negCount === 1) severity = 1;
    else if (posCount >= 2) severity = 1;

    // activity detection (largest matched)
    let activityBoost = 0;
    const activityTags = [];
    activityMap.forEach(a => {
      if (a.kws.some(k => t.includes(k))) {
        activityBoost = Math.max(activityBoost, a.v);
        activityTags.push(a.tag);
      }
    });

    // sentiment micro score
    const sentiment = clamp(posCount - negCount, -3, 3);

    // base delta
    let delta = 0;
    if (severity === 3) delta -= 12;
    else if (severity === 2) delta -= 8;
    else if (severity === 1 && negCount > posCount) delta -= 5;

    if (posCount > negCount && activityBoost === 0) delta += Math.min(6, posCount * 2);

    delta += sentiment * 1;

    // combine with activity boost (activity dominates positive)
    if (activityBoost > 0) {
      delta = clamp(Math.round((activityBoost * 0.9) + (delta * 0.4)), -20, 20);
    } else {
      delta = clamp(Math.round(delta), -20, 20);
    }

    // signals array
    const signals = [];
    if (activityTags.length) signals.push(...activityTags);
    if (directRejection) signals.push("rejection");
    if (negCount > posCount && !directRejection) signals.push("distance");
    if (posCount > negCount) signals.push("positive");
    if (t.includes("argue") || t.includes("fight")) signals.push("conflict");

    const reasonParts = [];
    if (activityTags.length) reasonParts.push("activity:" + activityTags.join(","));
    if (directRejection) reasonParts.push("direct rejection");
    if (negCount) reasonParts.push("neg words:" + negCount);
    if (posCount) reasonParts.push("pos words:" + posCount);

    return { delta, signals, tags: signals, severity, activityBoost, reason: reasonParts.join(" | ") };
  }

  /* ---------- Next Move Engine (history aware) ---------- */
  const ADVICE_POOLS = {
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

    let pool = ADVICE_POOLS.default;
    if (analysis.signals.includes("rejection")) pool = ADVICE_POOLS.rejection;
    else if (analysis.signals.includes("distance")) pool = ADVICE_POOLS.distance;
    else if (analysis.signals.includes("positive")) pool = ADVICE_POOLS.positive;
    else if (analysis.signals.includes("conflict")) pool = ADVICE_POOLS.conflict;
    else if (analysis.signals.some(s => ["sex","overnight","trip","kiss","date","introduced"].includes(s))) pool = ADVICE_POOLS.activity;

    let candidate = pool.find(item => !person.adviceHistory.includes(item));
    if (!candidate) candidate = pool[Math.floor(Math.random() * pool.length)];

    person.adviceHistory.push(candidate);
    if (person.adviceHistory.length > 10) person.adviceHistory.shift();

    return candidate;
  }

  /* ---------- Rendering ---------- */
  function render() {
    list.innerHTML = "";

    // glow set: top two by focus (>=60)
    const glowNames = new Set(people.filter(p => p.focus >= 60).sort((a,b) => b.focus - a.focus).slice(0,2).map(p => p.name));

    people.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "person";
      card.dataset.index = i;

      if (p.status === "pause") card.classList.add("paused");
      if (glowNames.has(p.name) && p.status !== "pause") card.classList.add("glow");

      const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";

      const nextMoveSafe = escapeHtml(p.nextMove || "Stay steady.");
      card.innerHTML = `
        <strong>${escapeHtml(p.name)}</strong>
        <span class="sub">${escapeHtml(p.status)}</span>

        <div class="focus-bar" aria-hidden="true">
          <div class="focus-fill" style="width:${p.focus}%"></div>
        </div>
        <div class="sub">${p.focus}% focus</div>

        ${reminderHtml}

        <div class="advice"><strong>Next Move:</strong> ${nextMoveSafe}</div>

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

  /* ---------- Dashboard logic ---------- */
  function updateDashboard() {
    if (!people.length) {
      if (dashFocus) dashFocus.textContent = "—";
      if (dashPause) dashPause.textContent = "—";
      if (dashAction) dashAction.textContent = "Add someone to begin.";
      return;
    }

    const riskPerson = people.find(p => p.risk);
    const focusCandidate = people.filter(p => !p.risk && p.focus >= 60).sort((a,b)=>b.focus-a.focus)[0] || null;
    const pauseList = people.filter(p => p.status === "pause");

    if (dashFocus) dashFocus.textContent = focusCandidate ? focusCandidate.name : "—";
    if (dashPause) dashPause.textContent = pauseList.length ? pauseList.map(x => x.name).join(", ") : "—";
    if (dashAction) dashAction.textContent = (riskPerson && riskPerson.nextMove) || (focusCandidate && focusCandidate.nextMove) || "Stay steady.";
  }

  /* ---------- Add person ---------- */
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
        risk: false
      };

      // quick note handling (apply by default)
      const quick = form.quickNote ? (form.quickNote.value || "").trim() : "";
      if (quick) {
        const analysis = analyzeNotes(quick);
        // compute new focus: emotion delta + activityBoost logic
        let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);
        // protective rule: notes-only shouldn't force >95 without major activity
        if (newFocus > 95 && analysis.activityBoost < 20) newFocus = Math.min(newFocus, 95);
        p.focus = newFocus;
        p.risk = analysis.signals.includes("rejection") || analysis.signals.includes("distance");
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

  /* ---------- Event delegation for Edit / Remove buttons ---------- */
  list.addEventListener("click", e => {
    const editBtn = e.target.closest(".edit-btn");
    const removeBtn = e.target.closest(".remove-btn");
    if (editBtn) {
      const idx = parseInt(editBtn.dataset.index, 10);
      if (!Number.isNaN(idx)) openEdit(idx);
      return;
    }
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.index, 10);
      if (!Number.isNaN(idx)) { people.splice(idx, 1); saveStorage(); render(); }
      return;
    }
  });

  /* ---------- Open Edit ---------- */
  function openEdit(i) {
    editingIndex = i;
    const p = people[i];
    if (!p) return;

    editName.value = p.name || "";
    editStatus.value = p.status || "crush";
    editFocus.value = p.focus || 0;
    editFocusValue.textContent = (p.focus || 0) + "%";
    editNotes.value = "";
    if (autoNotes) autoNotes.checked = true;

    // show modal
    if (editModal) editModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  /* ---------- Edit modal controls ---------- */
  if (editFocus && editFocusValue) {
    editFocus.addEventListener("input", () => {
      editFocusValue.textContent = editFocus.value + "%";
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      closeEdit();
    });
  }

  function closeEdit() {
    if (editModal) editModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingIndex = null;
  }

  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", () => {
      if (editingIndex === null) return;
      const p = people[editingIndex];
      if (!p) return;

      p.name = (editName.value || "").trim() || p.name;
      p.status = editStatus.value || p.status;
      p.focus = clamp(parseInt(editFocus.value, 10) || 0, 0, 100);

      // notes processing on save (if provided and autoNotes checked)
      const noteText = (editNotes.value || "").trim();
      const apply = autoNotes ? !!autoNotes.checked : true;
      if (noteText && apply) {
        const analysis = analyzeNotes(noteText);
        // apply delta and activity rules
        let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);
        if (newFocus > 95 && analysis.activityBoost < 20) newFocus = Math.min(newFocus, 95);
        p.focus = newFocus;

        p.risk = analysis.signals.includes("rejection") || analysis.signals.includes("distance");
        p.nextMove = generateNextMove(p, analysis);

        p.notesHistory = p.notesHistory || [];
        p.notesHistory.push({ text: noteText, time: nowISO(), delta: analysis.delta, analysis });
        // clear edit notes for UX
        editNotes.value = "";
      }

      saveStorage();
      render();
      closeEdit();
    });
  }

  /* ---------- View notes history (modal fallback alert) ---------- */
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      if (editingIndex === null) return alert("Open a person to view history.");
      const p = people[editingIndex];
      if (!p) return;
      if (!p.notesHistory || p.notesHistory.length === 0) return alert("No notes yet.");

      // build a readable list (reverse chrono)
      const items = p.notesHistory.slice().reverse().map(it => {
        const dt = new Date(it.time).toLocaleString();
        const d = (typeof it.delta === "number") ? (it.delta > 0 ? `(+${it.delta}%)` : `(${it.delta}%)`) : "";
        const txt = it.text.length > 160 ? it.text.slice(0,160) + "…" : it.text;
        return `• ${txt} ${d}\n  ${dt}`;
      });
      // show with simple prompt/alert
      alert(items.join("\n\n"));
    });
  }

  /* ---------- Remove all (dev helper) ---------- */
  // window.rizz_clear = () => { people = []; saveStorage(); render(); };

  /* ---------- Init render & focus UI ---------- */
  updateFocusUI();
  render();

  /* ---------- Expose debugging object ---------- */
  window.rizz = {
    people,
    analyzeNotes,
    generateNextMove: (p, a) => { return (function(person, analysis){ person.adviceHistory = person.adviceHistory || []; let pool = ADVICE_POOLS.default; if (analysis.signals.includes("rejection")) pool = ADVICE_POOLS.rejection; else if (analysis.signals.includes("distance")) pool = ADVICE_POOLS.distance; else if (analysis.signals.includes("positive")) pool = ADVICE_POOLS.positive; else if (analysis.signals.includes("conflict")) pool = ADVICE_POOLS.conflict; else if (analysis.signals.some(s => ["sex","overnight","trip","kiss","date","introduced"].includes(s))) pool = ADVICE_POOLS.activity; let candidate = pool.find(item => !person.adviceHistory.includes(item)); if (!candidate) candidate = pool[Math.floor(Math.random()*pool.length)]; person.adviceHistory.push(candidate); if (person.adviceHistory.length>10) person.adviceHistory.shift(); return candidate; })(p,a); },
    saveStorage,
    render
  };

}); // DOMContentLoaded end