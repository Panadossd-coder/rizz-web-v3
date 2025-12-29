/* =========================
   script.js — Rizz Web v2.4
   Notes Authority — Full JS (with Betrayal Lock)
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  // ---------- DOM ----------
  const form = document.getElementById("addForm");
  const list = document.getElementById("peopleList");

  const dashFocus = document.getElementById("dashFocus");
  const dashPause = document.getElementById("dashPause");
  const dashAction = document.getElementById("dashAction");

  const focusValueEl = document.getElementById("focusValue");
  const focusInput = form ? form.querySelector('[name="focus"]') : null;
  const statusInput = form ? form.querySelector('[name="status"]') : null;

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

  // ---------- state ----------
  let focus = 0;
  let people = [];
  try {
    people = JSON.parse(localStorage.getItem("rizz_people")) || [];
    if (!Array.isArray(people)) people = [];
  } catch (e) {
    people = [];
  }
  let editingIndex = null;

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nowISO = () => new Date().toISOString();
  const saveStorage = () => localStorage.setItem("rizz_people", JSON.stringify(people));
  const escapeHtml = s => (s === undefined || s === null) ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ---------- UI init ----------
  // status button group
  const statusButtons = document.querySelectorAll(".status-buttons button");
  statusButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      statusButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (statusInput) statusInput.value = btn.dataset.status || "crush";
    });
  });
  const defaultBtn = document.querySelector('[data-status="crush"]');
  if (defaultBtn) defaultBtn.classList.add("active");

  // plus / minus
  const plusBtn = document.getElementById("plus");
  const minusBtn = document.getElementById("minus");
  if (plusBtn) plusBtn.addEventListener("click", () => { focus = clamp(focus + 10, 0, 100); updateFocusUI(); });
  if (minusBtn) minusBtn.addEventListener("click", () => { focus = clamp(focus - 10, 0, 100); updateFocusUI(); });

  function updateFocusUI() {
    if (focusValueEl) focusValueEl.textContent = focus + "%";
    if (focusInput) focusInput.value = focus;
  }
  updateFocusUI();

  // ---------- NOTES INTELLIGENCE ----------
  // This function returns: { delta, signals:[], tags:[], severity, activityBoost, reason }
  function analyzeNotes(rawText) {
    const raw = (rawText || "").trim();
    const t = raw.toLowerCase();
    if (!t) return { delta: 0, signals: [], tags: [], severity: 0, activityBoost: 0, reason: "" };

    // Patterns / lexicons
    const positive = ["love", "liked", "enjoyed", "happy", "comfortable", "close", "connected", "vibed", "loves", "loved"];
    const negative = ["ignore", "ignored", "no reply", "doesn't reply", "does not reply", "didn't reply", "dry", "hate", "hates", "not love", "does not love", "doesn't love", "rejected", "ghost", "ghosted", "argue", "fight", "cheat", "cheated", "cheating", "betray", "betrayed"];
    const activityMap = [
      { kws: ["we had sex", "made love", "had sex", "we slept"], v: 20, tag: "sex" },
      { kws: ["met parents", "introduced to my parents", "introduced to her parents", "introduced to family"], v: 18, tag: "introduced" },
      { kws: ["slept over", "spent the night", "overnight"], v: 15, tag: "overnight" },
      { kws: ["trip", "travel", "vacation", "went away"], v: 12, tag: "trip" },
      { kws: ["kiss", "kissed"], v: 8, tag: "kiss" },
      { kws: ["date", "met up", "hung out", "coffee", "dinner"], v: 6, tag: "date" },
      { kws: ["call", "called", "voice call"], v: 4, tag: "call" },
      { kws: ["texted", "messaged", "replied"], v: 2, tag: "message" }
    ];

    // Betrayal detection: specific phrases
    const betrayalPatterns = [
      "cheat", "cheated", "cheating",
      "slept with someone else",
      "was seeing another",
      "was seeing someone else",
      "had another boyfriend",
      "had another man",
      "betrayed me",
      "she cheated on me",
      "she cheated"
    ];

    const isBetrayal = betrayalPatterns.some(pat => t.includes(pat));

    // quick counts
    const posCount = positive.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);
    const negCount = negative.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);

    // direct rejection patterns
    const rejectionPatterns = [
      /she (told|said).*(does not love|doesn't love|does not love me|doesn't love me)/i,
      /\bdoes not love me\b/i,
      /\bdoesn't love me\b/i,
      /\bis not in love\b/i,
      /\bisn't in love\b/i
    ];
    const directRejection = rejectionPatterns.some(rx => rx.test(raw));

    // severity: betrayal > rejection > negative
    let severity = 0;
    if (isBetrayal) severity = 4;
    else if (directRejection) severity = 3;
    else if (negCount >= 2) severity = 2;
    else if (negCount === 1) severity = 1;
    else if (posCount >= 2) severity = 1;

    // activity detection
    let activityBoost = 0;
    const activityTags = [];
    activityMap.forEach(a => {
      if (a.kws.some(k => t.includes(k))) {
        activityBoost = Math.max(activityBoost, a.v);
        activityTags.push(a.tag);
      }
    });

    // sentiment baseline
    const sentiment = clamp(posCount - negCount, -5, 5);

    // delta calculation rules:
    // betrayal => strong negative delta
    // rejection => negative
    // activity gives boost (positive)
    let delta = 0;
    if (isBetrayal) delta -= 18;
    else if (directRejection) delta -= 12;
    else if (severity === 2 && negCount > posCount) delta -= 8;
    else if (severity === 1 && negCount > posCount) delta -= 5;

    // positive words can increase a bit
    if (posCount > negCount && activityBoost === 0) delta += Math.min(8, posCount * 2);

    // sentiment nudges
    delta += sentiment;

    // apply activity influence
    if (activityBoost > 0) {
      // scale activity to delta but prioritize activity value
      delta = clamp(Math.round((activityBoost * 0.9) + (delta * 0.4)), -20, 20);
    } else {
      delta = clamp(Math.round(delta), -20, 20);
    }

    // Compose signals
    const signals = [];
    if (isBetrayal) signals.push("betrayal");
    if (directRejection) signals.push("rejection");
    if (activityTags.length) signals.push(...activityTags);
    if (negCount > posCount && !isBetrayal && !directRejection) signals.push("distance");
    if (posCount > negCount) signals.push("positive");
    if (t.includes("argue") || t.includes("fight")) signals.push("conflict");

    const reason = [
      ...(activityTags.length ? ["activity:" + activityTags.join(",")] : []),
      ...(isBetrayal ? ["trust betrayal detected"] : []),
      ...(directRejection ? ["direct rejection"] : []),
      ...(negCount ? ["neg words:" + negCount] : []),
      ...(posCount ? ["pos words:" + posCount] : [])
    ].join(" | ");

    return { delta, signals, tags: signals, severity, activityBoost, reason };
  }

  // ---------- NEXT MOVE POOLS ----------
  const POOLS = {
  betrayal: [
    "Betrayal detected. This requires distance and dignity. Pause initiating contact, protect your energy, and rebuild personal routine. If she shows consistent remorse and effort over time, reassess later.",
    "Trust has been broken. Do not beg or chase. Step back for at least 2 weeks, focus on yourself, and only re-engage if consistent respectful effort appears.",
    "This is serious — prioritize your boundaries. Avoid emotional confrontations in text; meet only if you feel safe and there are sincere accountable actions.",
    "Respect yourself enough to stop explaining pain to someone who caused it. Step back and let silence do the work.",
    "Cheating breaks trust, not just feelings. Do not rush forgiveness — consistency over time is the only proof that matters.",
    "Right now, distance is strength. Reclaim your time, your focus, and your emotional stability.",
    "You don’t need closure conversations. You need clarity — and clarity comes from stepping away.",
    "Pause emotional access completely. If accountability is real, it will show without pressure.",
    "Choose dignity over attachment. No chasing, no arguments, no emotional bargaining."
  ],

  rejection: [
    "That was a clear boundary. Accept it with dignity — do not beg. Reduce contact for a while and focus on small personal wins.",
    "Direct rejection hurts. Protect your energy: pause initiating contact, lean on friends, rebuild routine. Avoid long messages asking for reasons.",
    "Give space and stop trying to change her mind. Re-engage only if she shows consistent effort.",
    "Accept the boundary without drama. Pull back gracefully and protect your self-worth.",
    "Don’t try to convince someone who has already decided. Let your absence speak.",
    "Rejection is information, not a challenge. Redirect energy into your own growth.",
    "Give space fully, not halfway. Anything forced will backfire.",
    "Stop emotional investment and regain balance before deciding any next step."
  ],

  distance: [
    "Signals show distance. Reduce initiation for 48–72 hours and send one calm check-in afterwards if needed. Keep tone light and avoid heavy messages.",
    "She’s pulling away. Match energy: short, warm replies, no chasing.",
    "Give space and focus on your routine. If she reaches out, respond warmly but briefly.",
    "Match her energy instead of compensating for it.",
    "Silence for a short period can reveal intent better than questions.",
    "Keep responses calm and brief.",
    "Let consistency guide your next move."
  ],

  positive: [
    "Momentum is good. Reinforce with a casual plan and keep things confident and light.",
    "You're moving forward. Suggest a low-pressure meet and enjoy the moment.",
    "Things are moving well. Stay relaxed and avoid over-planning.",
    "Build attraction through presence, not pressure.",
    "Let things unfold naturally."
  ],

  conflict: [
    "Conflict detected. Avoid escalation — apologize briefly if needed.",
    "Step away from the argument before it escalates.",
    "Say less, not more.",
    "Let emotions settle before discussing anything important."
  ],

  activity: [
    "Physical closeness happened — follow up gently within 24–48 hours.",
    "A shared moment opens chance for deeper connection.",
    "Follow up warmly, but don’t rush emotional depth.",
    "Consistency beats intensity after real-life interaction."
  ],

  default: [
    "Stay steady: small, consistent contact wins.",
    "Observe and keep composing yourself.",
    "Calm confidence attracts more than chasing."
  ]
};
  // ---------- NEXT MOVE GENERATOR ----------
  function generateNextMove(person, analysis) {
    person.adviceHistory = person.adviceHistory || [];
    let pool = POOLS.default;

    if (!analysis || !Array.isArray(analysis.signals)) analysis = { signals: [] };

    if (analysis.signals.includes("betrayal")) pool = POOLS.betrayal;
    else if (analysis.signals.includes("rejection")) pool = POOLS.rejection;
    else if (analysis.signals.includes("distance")) pool = POOLS.distance;
    else if (analysis.signals.includes("positive")) pool = POOLS.positive;
    else if (analysis.signals.includes("conflict")) pool = POOLS.conflict;
    else if (analysis.signals.some(s => ["sex", "overnight", "trip", "kiss", "date", "introduced"].includes(s))) pool = POOLS.activity;
    else pool = POOLS.default;

    // prefer advice not recently used for this person
    let candidate = pool.find(msg => !person.adviceHistory.includes(msg));
    if (!candidate) candidate = pool[Math.floor(Math.random() * pool.length)];

    person.adviceHistory.push(candidate);
    if (person.adviceHistory.length > 12) person.adviceHistory.shift();
    return candidate;
  }

  // ---------- RENDER ----------
  function render() {
    if (!list) return;
    list.innerHTML = "";

    // glow logic: top two by focus >= 60 (but exclude trustLock)
    const glowCandidates = people
      .filter(p => !p.trustLock && p.status !== "pause")
      .sort((a, b) => b.focus - a.focus)
      .filter(p => p.focus >= 60)
      .slice(0, 2)
      .map(p => p.name);
    const glowSet = new Set(glowCandidates);

    people.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "person";
      card.dataset.index = i;

      // paused detection: either status === 'pause' OR focus <= 20
      const isPaused = (p.status === "pause") || (p.focus <= 20);
      if (isPaused) card.classList.add("paused");
      else if (p.focus <= 20) card.classList.add("low-focus");

      // glow if high focus and not trustLocked
      if (!isPaused && !p.trustLock && glowSet.has(p.name)) card.classList.add("glow");

      const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";

      const activityHtml = p.activityIcon ? `<div class="sub" style="margin-top:8px;">${escapeHtml(p.activityIcon)} ${escapeHtml(p.activityLabel || "")}</div>` : "";

      card.innerHTML = `
        <strong>${escapeHtml(p.name)}</strong>
        <span class="sub">${escapeHtml(p.status)}</span>

        <div class="focus-bar" aria-hidden="true">
          <div class="focus-fill" style="width:${clamp(p.focus, 0, 100)}%"></div>
        </div>
        <div class="sub">${escapeHtml(Math.round(p.focus))}% focus</div>

        ${activityHtml}
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

  // ---------- DASHBOARD ----------
  function updateDashboard() {
    if (!dashFocus || !dashPause || !dashAction) return;

    if (!people.length) {
      dashFocus.textContent = "—";
      dashPause.textContent = "—";
      dashAction.textContent = "Add someone to begin.";
      return;
    }

    // focus candidate = highest focus >= 60 and not trustLocked
    const focusCandidate = people.filter(p => !p.trustLock && p.focus >= 60).sort((a, b) => b.focus - a.focus)[0] || null;
    const pausedList = people.filter(p => p.status === "pause" || p.focus <= 20);

    dashFocus.textContent = focusCandidate ? focusCandidate.name : "—";
    dashPause.textContent = pausedList.length ? pausedList.map(x => x.name).join(", ") : "—";
    dashAction.textContent = focusCandidate ? focusCandidate.nextMove : "Observe and keep composing yourself. Calm confidence attracts more than chasing.";
  }

  // ---------- ADD PERSON ----------
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = (form.name.value || "").trim();
      if (!name) return alert("Name is required.");

      const p = {
        name,
        status: statusInput ? statusInput.value : "crush",
        focus: focus || 0,
        reminder: form.reminder ? (form.reminder.value || "").trim() : "",
        nextMove: "Stay steady.",
        notesHistory: [],
        adviceHistory: [],
        activityIcon: "",
        activityLabel: "",
        trustLock: false // default
      };

      // quick note processing
      const quick = form.quickNote ? (form.quickNote.value || "").trim() : "";
      if (quick) {
        const analysis = analyzeNotes(quick);

        // betrayal triggers trust lock
        if (analysis.signals && analysis.signals.includes("betrayal")) {
          p.trustLock = true;
        }

        // compute new focus (respect trustLock cap)
        let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);
        if (p.trustLock) newFocus = Math.min(newFocus, 35); // cap for betrayal
        if (newFocus > 95 && analysis.activityBoost < 20) newFocus = Math.min(newFocus, 95);
        p.focus = newFocus;

        // activity unlocks trust if real
        if (analysis.signals && analysis.signals.some(s => ["sex", "overnight", "trip", "kiss", "date", "introduced"].includes(s))) {
          p.activityIcon = "⏰";
          p.activityLabel = analysis.signals.join(", ");
          // unlocking trust only when activity present
          p.trustLock = false;
        }

        p.nextMove = generateNextMove(p, analysis);
        p.notesHistory.push({ text: quick, time: nowISO(), delta: analysis.delta, analysis });
        if (form.quickNote) form.quickNote.value = "";
      }

      people.push(p);
      saveStorage();
      render();

      // reset form and focus
      form.reset();
      focus = 0;
      updateFocusUI();
    });
  }

  // ---------- DELEGATED LISTENERS ----------
  if (list) {
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
        if (!isNaN(idx)) {
          if (confirm("Remove this person?")) {
            people.splice(idx, 1);
            saveStorage();
            render();
          }
        }
        return;
      }
    });
  }

  // ---------- EDIT ----------
  function openEdit(i) {
    editingIndex = i;
    const p = people[i];
    if (!p) return alert("Person not found.");

    if (editName) editName.value = p.name || "";
    if (editStatus) editStatus.value = p.status || "crush";
    if (editFocus) editFocus.value = p.focus || 0;
    if (editFocusValue) editFocusValue.textContent = (p.focus || 0) + "%";
    if (editNotes) editNotes.value = "";

    if (autoNotes) autoNotes.checked = true;

    if (editModal) editModal.classList.remove("hidden");
    // prevent body scroll while modal open
    document.body.style.overflow = "hidden";
  }

  function closeEdit() {
    if (editModal) editModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingIndex = null;
  }

  // slider live sync
  if (editFocus && editFocusValue) {
    editFocus.addEventListener("input", () => {
      editFocusValue.textContent = editFocus.value + "%";
    });
  }

  if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => closeEdit());

  if (saveEditBtn) saveEditBtn.addEventListener("click", () => {
    if (editingIndex === null) return;
    const p = people[editingIndex];
    if (!p) return;

    p.name = (editName.value || "").trim() || p.name;
    p.status = editStatus.value || p.status;
    p.focus = clamp(parseInt(editFocus.value, 10) || 0, 0, 100);

    const noteText = (editNotes.value || "").trim();
    const apply = autoNotes ? !!autoNotes.checked : true;
    if (noteText && apply) {
      const analysis = analyzeNotes(noteText);

      // If betrayal in edit, lock
      if (analysis.signals && analysis.signals.includes("betrayal")) {
        p.trustLock = true;
      }

      let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);
      if (p.trustLock) newFocus = Math.min(newFocus, 35);
      if (newFocus > 95 && analysis.activityBoost < 20) newFocus = Math.min(newFocus, 95);
      p.focus = newFocus;

      if (analysis.signals && analysis.signals.some(s => ["sex", "overnight", "trip", "kiss", "date", "introduced"].includes(s))) {
        p.activityIcon = "⏰";
        p.activityLabel = analysis.signals.join(", ");
        p.trustLock = false; // unlock when actual activity present
      }

      p.nextMove = generateNextMove(p, analysis);
      p.notesHistory = p.notesHistory || [];
      p.notesHistory.push({ text: noteText, time: nowISO(), delta: analysis.delta, analysis });
      editNotes.value = "";
    }

    // always compute final nextMove if none
    if (!p.nextMove) p.nextMove = generateNextMove(p, { signals: [] });

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
        const d = (typeof it.delta === "number") ? (it.delta > 0 ? `(+${it.delta}%)` : `(${it.delta}%)`) : "";
        const txt = it.text.length > 140 ? it.text.slice(0, 140) + "…" : it.text;
        return `• ${txt} ${d}\n  ${dt}`;
      });
      // Use a simple modal-style alert for now
      alert(items.join("\n\n"));
    });
  }

  // ---------- INIT ----------
  render();

  // expose for debugging
  window.rizz = { people, analyzeNotes, render, saveStorage };

  // small safety: react to storage changes in other tabs
  window.addEventListener("storage", () => {
    try {
      const remote = JSON.parse(localStorage.getItem("rizz_people")) || [];
      if (Array.isArray(remote)) {
        people = remote;
        render();
      }
    } catch (e) { /* ignore parse errors */ }
  });
});