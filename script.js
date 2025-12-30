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
  function analyzeNotes(rawText, person = null) {
    const raw = (rawText || "").trim();
    // normalize note for repetition detection
const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
    const t = raw.toLowerCase();
    // Patterns / lexicons
const positive = [
  "i love ",
  "i love her",
  "i love him",
  "i love you",
  "i really love ",
  "i care about ",
  "i miss her",
  "i miss him",
  "i miss you",
  "i feel close",
  "i feel connected",
  "i enjoy being with",
  "i enjoyed being with",
  "i feel comfortable",
  "i feel safe with",
  "i like her",
  "i like him",
  "i like you",
  "i liked her",
  "i liked him",
  "i liked you",
  "makes me happy",
  "makes me feel good",
  "i’m happy with",
  "i am happy with"
];

const hasNegation = /\b(not|don't|dont|never|no)\b/.test(t);
const hasPositiveWord = positive.some(w => t.includes(w));
const negatedPositive = hasNegation && hasPositiveWord;
// external confirmation (stronger than self-affirmation)
const externalLovePatterns = [
  "she said she loves me",
  "she told me she loves me",
  "she said she loves me too",
  "she told me she loves me too"
];

const isExternalLove = externalLovePatterns.some(p => t.includes(p));
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
    const posCount = hasNegation
  ? 0
  : positive.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);
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

if (isBetrayal) {
  delta -= 18;
} else if (directRejection) {
  delta -= 12;
} else if (negatedPositive) {
  delta -= 5;
} else if (severity === 2 && negCount > posCount) {
  delta -= 8;
} else if (severity === 1 && negCount > posCount) {
  delta -= 5;
}

  // positive reward (controlled by system)
let reward = 0;

if (
  !negatedPositive &&
  (posCount > negCount || isExternalLove) &&
  activityBoost === 0 &&
  person
) {
  const phrase = normalizeText(raw);

  // system decides reward based on history
  reward = evaluatePositiveReward(person, phrase);

  // external confirmation gets a guaranteed minimum
  if (isExternalLove) {
    reward = Math.max(reward, 4);
  }
}

delta += reward;


    // sentiment nudges
    delta += sentiment;

    // apply activity influence
    if (activityBoost > 0) {
      // scale activity to delta but prioritize activity value
      delta = clamp(Math.round((activityBoost * 0.9) + (delta * 0.4)), -20, 20);
    } else {
      delta = clamp(Math.round(delta), -20, 20);
    }
    // STEP 4: repetition dampener (prevents emotional stacking)
if (posCount > 0 && !negatedPositive && !activityBoost) {
  delta = Math.round(delta * 0.5);
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
  // ================== POSITIVE PHRASE MEMORY ==================
function normalizeText(t) {
  return t.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function isSameLocalDay(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return d1.toDateString() === d2.toDateString();
}

function evaluatePositiveReward(person, phrase) {
  const today = new Date();

  const history = (person.notesHistory || [])
    .filter(n => n.delta > 0)
    .map(n => ({
      phrase: normalizeText(n.text),
      time: new Date(n.time)
    }));

  const samePhraseToday = history.some(
    h => h.phrase === phrase && isSameLocalDay(h.time, today)
  );

  if (samePhraseToday) {
    return 0; // no reward same day
  }

  const samePhraseBefore = history.some(h => h.phrase === phrase);

  if (samePhraseBefore) {
    return 1; // reduced reward on later days
  }

  return 3; // full reward first time ever
}

  // ---------- NEXT MOVE POOLS ----------
  const POOLS = {

  betrayal: [
    "What happened broke trust, not just feelings. The healthiest move now is to step back completely, stop initiating contact, and protect your emotional space while you regain balance and clarity.",
    "Betrayal requires distance, not discussion. Avoid long emotional conversations or explanations and focus instead on rebuilding your routine and self-respect.",
    "Right now, silence is not weakness — it is strength. Let time and space reveal whether accountability and genuine change exist without you asking for it.",
    "Do not rush forgiveness or reconciliation. Trust is rebuilt slowly through consistent behavior, not apologies or promises made in emotional moments.",
    "Step away from emotional access. If remorse is real, it will show through actions over time, not through pressure or guilt-driven communication.",
    "Protect your dignity by choosing calm distance over emotional bargaining. Chasing clarity after betrayal only deepens the wound.",
    "This is a moment to choose yourself. Reinvest energy into your health, goals, and stability before making any decisions about the relationship.",
    "Avoid replaying the pain in conversations. Closure often comes from stepping forward, not looking backward.",
    "Let her feel the absence of your presence rather than the weight of your emotions. Consequences create clarity.",
    "You are allowed to pause everything. Healing and self-respect come before reconciliation."
  ],

  rejection: [
    "She communicated a boundary. The strongest response is to accept it calmly, without trying to change her mind or seek further explanation.",
    "Rejection is painful, but pushing against it will only damage your self-respect. Step back and allow yourself time to reset emotionally.",
    "Do not negotiate attraction or interest. Reduce contact and redirect your focus toward yourself and your goals.",
    "Let go gracefully. Your dignity now matters more than winning her approval.",
    "Avoid emotional speeches or justifications. Acceptance is more attractive than resistance.",
    "Give space fully, not partially. Half-steps keep you emotionally stuck.",
    "Use this moment to regain balance and confidence rather than replaying what went wrong.",
    "Clarity comes when effort stops being forced and emotions are allowed to settle naturally.",
    "Pull back and observe life outside this connection. Perspective grows with distance.",
    "Rejection is information — use it to realign, not to self-blame."
  ],

  distance: [
    "Her energy has reduced. The best move now is to match that energy rather than compensate for it with extra effort.",
    "Reduce how often you initiate contact and allow space to see whether interest returns naturally.",
    "Silence for a short period can reveal intent more clearly than repeated check-ins or questions.",
    "Keep responses warm but brief. Avoid emotional explanations or reassurance-seeking messages.",
    "Let consistency, not words, guide your next decision.",
    "Step back slightly and focus on your own routine while observing her behavior.",
    "Do not chase mixed signals. Clarity comes from watching actions over time.",
    "Give space without resentment. Calm detachment creates balance.",
    "Avoid overthinking. Distance often resolves itself when pressure is removed.",
    "Let her meet you at your level instead of lowering your standards."
  ],

  positive: [
    "Things are moving in a good direction. Keep your energy relaxed and confident rather than trying to accelerate the pace.",
    "Suggest something simple and low-pressure that allows connection to grow naturally.",
    "Enjoy the interaction without attaching heavy expectations to every moment.",
    "Consistency matters more than intensity. Small, steady actions build attraction.",
    "Stay present and grounded instead of planning too far ahead.",
    "Let the connection breathe. Attraction grows in calm environments.",
    "Avoid over-communicating or over-analyzing positive signs.",
    "Continue showing interest while maintaining independence.",
    "Confidence shows through patience and emotional control.",
    "Allow things to unfold without forcing outcomes."
  ],

  conflict: [
    "There is emotional tension here. The healthiest step is to pause and avoid escalating the situation further.",
    "Say less for now. Calm space often resolves more than continued discussion.",
    "Let emotions cool before attempting to revisit the issue.",
    "Do not try to win the argument. Focus on stabilizing emotions first.",
    "Avoid long emotional texts — they often increase misunderstanding.",
    "Step away temporarily and revisit the conversation when clarity returns.",
    "Protect the connection by slowing things down.",
    "Resolution improves when both sides feel calm and respected.",
    "Give yourself time to reflect before responding.",
    "Emotional control now prevents regret later."
  ],

  activity: [
    "A real-life interaction has happened. Follow up naturally, without rushing emotional depth or commitment.",
    "Keep the tone warm and grounded rather than intense or demanding.",
    "Allow space between interactions to maintain attraction.",
    "Enjoy what happened without immediately defining it.",
    "Consistency after meeting matters more than excitement in the moment.",
    "Avoid replaying the interaction repeatedly in your mind.",
    "Let attraction grow between meetings, not through constant messaging.",
    "Follow up with ease, not pressure.",
    "Balance interest with independence.",
    "Let things settle naturally before planning the next step."
  ],

  default: [
    "Stay steady and observe patterns rather than reacting emotionally.",
    "Focus on your routine and maintain balance in your life.",
    "Avoid rushing decisions — clarity builds gradually.",
    "Let actions guide you more than assumptions.",
    "Patience creates better long-term outcomes.",
    "Keep emotions regulated and grounded.",
    "Do not force momentum where it doesn’t exist.",
    "Consistency beats urgency.",
    "Remain calm and self-focused.",
    "Allow time to reveal true intent."
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
  // ===== Dashboard visual state =====
const dashboard = document.querySelector(".dashboard");
if (dashboard) {
  dashboard.classList.remove("has-focus", "no-focus");
  dashboard.classList.add(focusCandidate ? "has-focus" : "no-focus");
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
        const analysis = analyzeNotes(quick, p);

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
      const analysis = analyzeNotes(noteText, p);
      // ===== REPETITION DAMPENER (EDIT ONLY) =====
const normalized = noteText.toLowerCase().replace(/\s+/g, " ").trim();
const recentNotes = (p.notesHistory || [])
  .slice(-3)
  .map(n => n.text.toLowerCase().replace(/\s+/g, " ").trim());

const isRepeat = recentNotes.includes(normalized);
if (isRepeat) {
  analysis.delta = 0;
}
let newFocus = clamp(Math.round(p.focus + analysis.delta), 0, 100);

if (p.trustLock) {
  newFocus = Math.min(newFocus, 35);
}

if (newFocus > 95 && analysis.activityBoost < 20) {
  newFocus = Math.min(newFocus, 95);
}

p.focus = newFocus;
// =========================================

      // If betrayal in edit, lock
      if (analysis.signals && analysis.signals.includes("betrayal")) {
        p.trustLock = true;
      }


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