/* =========================
   Rizz Web — Version 2.4 (Smart Notes v4)
   - Edit Intelligence: event storage, advice generator
   - Auto-apply default ON
   - Focus hard-to-100% rule applied to auto-applies
   ========================= */

/* ---------- Core UI elements ---------- */
const form = document.getElementById("addForm");
const list = document.getElementById("peopleList");

const dashFocus = document.getElementById("dashFocus");
const dashPause = document.getElementById("dashPause");
const dashAction = document.getElementById("dashAction");

const focusValueEl = document.getElementById("focusValue");
const focusInput = form.querySelector('[name="focus"]');

let focus = 0;
let people = JSON.parse(localStorage.getItem("rizz_people")) || [];
let editingIndex = null;
let selectedStatus = "crush";

/* ---------- Small helpers ---------- */
function $id(id){ try { return document.getElementById(id); } catch(e){ return null; } }
function esc(s){ return String(s||"").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

/* ---------- UI: status + focus controls ---------- */
document.querySelectorAll(".status-buttons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".status-buttons button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    selectedStatus = btn.dataset.status;
  };
});
const defaultBtn = document.querySelector('[data-status="crush"]');
if(defaultBtn) defaultBtn.classList.add("active");

document.getElementById("plus").onclick = () => { focus = Math.min(100, focus + 10); updateFocusUI(); };
document.getElementById("minus").onclick = () => { focus = Math.max(0, focus - 10); updateFocusUI(); };
function updateFocusUI(){ if(focusValueEl) focusValueEl.textContent = focus + "%"; if(focusInput) focusInput.value = focus; }

/* ---------- NEXT MOVE (unchanged) ---------- */
const NEXT_MOVES = {
  dating: { high: ["Plan a quality date this week","Deep conversation about direction","Discuss future goals"], mid: ["Keep consistency without pressure","Check in emotionally","Casual call or voice note"], low: ["Give space today","Respond but don’t push","Focus on yourself today"] },
  crush: { high: ["Flirt confidently","Compliment her vibe","Suggest a casual meet"], mid: ["Light teasing","Keep mystery","Casual check-in"], low: ["Pull back slightly","Observe from distance","Minimal interaction"] },
  pause: ["Do nothing today","No contact","Reset emotional energy","Focus on yourself"]
};
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function getNextMove(p){
  if(!p) return "Stay steady.";
  if(p.status === "pause" || parseInt(p.focus,10) <= 20) return pickRandom(NEXT_MOVES.pause);
  if(p.status === "dating"){ if(p.focus >= 80) return pickRandom(NEXT_MOVES.dating.high); if(p.focus >= 40) return pickRandom(NEXT_MOVES.dating.mid); return pickRandom(NEXT_MOVES.dating.low); }
  if(p.status === "crush"){ if(p.focus >= 60) return pickRandom(NEXT_MOVES.crush.high); if(p.focus >= 30) return pickRandom(NEXT_MOVES.crush.mid); return pickRandom(NEXT_MOVES.crush.low); }
  return "Stay steady.";
}

/* =========================
   Smart Notes v4 — event engine & helpers
   - appendEvent(person, text, delta, meta)
   - computeNoteDeltaV4(notes, person)
   - generateAdvice(person, event)
   ========================= */

/* small configuration */
const SMART_MAX_DELTA = 30;
const SMART_MIN_APPLY_THRESHOLD = 3;

/* seed weights & modifiers (kept compact, extended in engine) */
const ACTION_SEEDS = {
  "call": 10, "audio call": 10, "video call": 12, "voice note": 6, "text": 6, "message": 6, "reply": 5,
  "met": 15, "kiss": 20, "hug": 10, "sext": 14, "gift": 12, "help": 10,
  "ignore": -12, "no reply": -8, "left on read": -10, "argue": -15, "cheat": -40,
  "made plans": 12, "cancelled plans": -8, "met parents": 25, "apologize": 8, "compliment": 6
};
const MODIFIERS = { intensity: {"long":1.25,"short":0.8,"deep":1.3,"twice":1.25,"again":1.15}, time: {"today":1.05,"yesterday":1.03,"last night":1.02}, medium: {"audio":1.05,"video":1.08,"in person":1.1} };
const NEUTRAL_WORDS = new Set(["cool","ok","okay","fine","nice","k","thanks","thx","lol","haha"]);

/* text normalization & tokenization */
function normalizeText(s){ return String(s||"").toLowerCase().replace(/[\u2019’]/g,"'").replace(/[.,;!?:()]/g," "); }
function simpleStem(w){ if(!w) return w; let s=w.replace(/[^a-z0-9]/gi,""); if(s.length<=3) return s; const endings=["ing","ed","ly","es","s","er"]; for(let e of endings) if(s.endsWith(e) && s.length-e.length>=3) return s.slice(0,-e.length); return s; }
function tokenize(text){
  const keep = ["she initiated","i initiated","no reply","left on read","met parents","made plans","cancelled plans","video call","audio call","voice note","sent money"];
  let t = text;
  keep.forEach(p=> t = t.replace(new RegExp(escapeRegExp(p),"gi"), p.replace(/\s+/g,"__")));
  const raw = t.split(/\s+/).filter(Boolean).map(tok=>tok.replace(/__/g," "));
  return raw;
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }

/* find base matches */
function findBaseMatches(tokens, text){
  const found = {};
  const joined = tokens.join(" ");
  Object.keys(ACTION_SEEDS).forEach(key=>{
    const re = new RegExp("\\b"+escapeRegExp(key)+"\\b","i");
    if(re.test(joined)){ found[key] = (found[key]||0) + 1; }
  });
  // stem-based partial match fallback
  tokens.forEach(tok=>{
    const st = simpleStem(tok);
    if(!st || st.length<3) return;
    Object.keys(ACTION_SEEDS).forEach(key=>{
      if(key.includes(st) && !found[key]) found[key] = (found[key]||0) + 0.6;
    });
  });
  return found;
}

/* compute modifier multiplier */
function computeModifierMultiplier(tokens){
  let mult = 1.0;
  tokens.forEach(tok=>{
    Object.keys(MODIFIERS.intensity).forEach(k=>{ if(tok.includes(k)) mult *= MODIFIERS.intensity[k]; });
    Object.keys(MODIFIERS.time).forEach(k=>{ if(tok.includes(k)) mult *= MODIFIERS.time[k]; });
    Object.keys(MODIFIERS.medium).forEach(k=>{ if(tok.includes(k)) mult *= MODIFIERS.medium[k]; });
  });
  return mult;
}

/* direction bonus */
function computeDirectionBonus(text){
  let bonus = 0;
  if(/\bshe initiated\b/i.test(text)) bonus += 8;
  if(/\bi initiated\b/i.test(text)) bonus += 4;
  return bonus;
}

/* neutral-only test */
function containsOnlyNeutralWords(tokens){
  const meaningful = tokens.filter(t => !NEUTRAL_WORDS.has(t));
  return meaningful.length === 0;
}

/* compute delta (V4) */
function computeNoteDeltaV4(notes, person){
  if(!notes) return 0;
  const text = normalizeText(notes);
  const tokens = tokenize(text);
  if(tokens.length===0) return 0;
  if(containsOnlyNeutralWords(tokens)) return 0;

  const baseMatches = findBaseMatches(tokens, text);
  if(Object.keys(baseMatches).length===0){
    // fallback: simple hashtag matches
    const tagMatch = (text.match(/#\w+/g) || []).length;
    if(tagMatch===0) return 0;
  }

  const modMult = computeModifierMultiplier(tokens);
  const dirBonus = computeDirectionBonus(text);

  let total = 0;
  Object.keys(baseMatches).forEach(key=>{
    const seedWeight = ACTION_SEEDS[key] || 0;
    const count = baseMatches[key] || 1;
    const repMult = Math.max(0.35, 1 - 0.25 * (count - 1));
    total += Math.round(seedWeight * repMult * modMult);
  });

  total += dirBonus;

  const numMatch = text.match(/\b(\d+)\s*(x|times?)\b/gi) || text.match(/\b(twice|thrice)\b/gi);
  if(numMatch && numMatch.length) total = Math.round(total * Math.min(1 + numMatch.length * 0.2, 2.0));

  if(person && person.status === "dating" && total > 0) total = Math.round(total * 0.6);
  if(person && person.status === "pause" && total > 0) total = Math.round(total * 0.25);

  if(total > SMART_MAX_DELTA) total = SMART_MAX_DELTA;
  if(total < -SMART_MAX_DELTA) total = -SMART_MAX_DELTA;

  return total;
}

/* appendEvent: stores event in person.events and updates summary */
function appendEvent(person, text, delta, meta){
  if(!person.events) person.events = [];
  const ev = {
    id: "evt_" + Date.now(),
    text: text,
    timestamp: new Date().toISOString(),
    delta: delta || 0,
    meta: meta || {}
  };
  person.events.unshift(ev); // newest first
  // keep last 50 events max
  if(person.events.length > 50) person.events.length = 50;

  // update simple summary: counts of ignored/declared/meet/call
  const summary = person.summary || { keyFacts: [], lastEventAt: null, mostLikelyState: "" };
  summary.lastEventAt = ev.timestamp;

  // rebuild keyFacts by scanning events for frequent seeds
  const facts = {};
  (person.events || []).forEach(e=>{
    const t = (e.text || "").toLowerCase();
    Object.keys(ACTION_SEEDS).forEach(k=>{
      if(t.includes(k)){
        facts[k] = (facts[k]||0) + 1;
      }
    });
  });
  // create key facts top-3
  const sorted = Object.keys(facts).sort((a,b)=>facts[b]-facts[a]).slice(0,4);
  summary.keyFacts = sorted;
  // rough mostLikelyState inference
  const ignoredCount = (summary.keyFacts.includes("ignore") || summary.keyFacts.includes("no reply") || summary.keyFacts.includes("left on read")) ? facts["ignore"] || facts["no reply"] || facts["left on read"] || 0 : 0;
  if(ignoredCount >= 2) summary.mostLikelyState = "cooling";
  else summary.mostLikelyState = person.focus >= 70 ? "warming" : "steady";

  person.summary = summary;
}

/* format suggestion label */
function formatSuggestion(delta){ if(!delta || delta===0) return "Suggested: —"; return delta>0 ? `Suggested: +${delta}` : `Suggested: ${delta}`; }

/* generateAdvice: simple mapping rules -> returns three advice items */
function generateAdvice(person, eventText, toneBias){
  const delta = computeNoteDeltaV4(eventText, person);
  const suggestions = [];

  // determine primary signals
  const t = (eventText||"").toLowerCase();
  const hasIgnore = /\b(no reply|ignore|ignored|left on read|ghost)\b/i.test(t);
  const hasDeclaration = /\b(i love|i love you|i like you|i love her|i love him)\b/i.test(t);
  const hasMeet = /\b(met|meet|hang out|dinner|lunch|date)\b/i.test(t);

  // Supportive
  if(hasDeclaration && hasIgnore){
    suggestions.push({
      tone: "Supportive",
      text: "I'm sorry you had that moment — give her space for now. Send a calm check-in in 2–4 days: 'Hey, hope you're okay — just checking in. I care about you.'",
      confidence: 88,
      reason: "declaration met with silence -> support + space"
    });
  } else if(hasMeet){
    suggestions.push({
      tone: "Supportive",
      text: "Nice — keep it warm. Follow up with a casual thank-you and ask a light question about when you can meet again.",
      confidence: 80,
      reason: "in-person meet -> positive momentum"
    });
  } else if(hasIgnore){
    suggestions.push({
      tone: "Supportive",
      text: "She didn't respond — step back a bit and preserve your energy. Consider a short, friendly message later or wait.",
      confidence: 82,
      reason: "ignored -> lower engagement"
    });
  } else {
    suggestions.push({ tone: "Supportive", text: "Keep it light and consistent — short messages, friendly check-ins.", confidence: 70, reason: "general positive suggestion" });
  }

  // Strategic
  if(hasDeclaration && hasIgnore){
    suggestions.push({
      tone: "Strategic",
      text: "Pause and reset. If you must message, send one clear message in 48–72 hours: 'I like you, I need honest communication. If not, say so.'",
      confidence: 74,
      reason: "boundary setting after ignored declaration"
    });
  } else if(hasIgnore && person.focus >= 60){
    suggestions.push({
      tone: "Strategic",
      text: "You've invested a lot — consider a direct message asking for clarity, then reduce contact if ignored again.",
      confidence: 68,
      reason: "high focus + ignored -> escalate clarity"
    });
  } else {
    suggestions.push({ tone: "Strategic", text: "Keep consistency and small tests of investment. Let her invest too.", confidence: 60, reason: "general strategy" });
  }

  // Playful
  if(hasDeclaration && hasIgnore){
    suggestions.push({ tone: "Playful", text: "Light tease: 'You owe me a reply and a story 😂' — but only if you're fine risking a playful tone.", confidence: 50, reason: "low-confidence playful alternative" });
  } else if(hasMeet){
    suggestions.push({ tone: "Playful", text: "Send a playful memory about the meet, keep it flirty and short.", confidence: 60, reason: "keep momentum playfully" });
  } else {
    suggestions.push({ tone: "Playful", text: "Send something light: a small meme or fun sticker to keep mood airy.", confidence: 50, reason: "low-commitment engagement" });
  }

  // apply toneBias preference: reorder suggestions so preferred tone is first (if present)
  if(toneBias){
    const idx = suggestions.findIndex(s => s.tone.toLowerCase() === toneBias.toLowerCase());
    if(idx > 0){
      const item = suggestions.splice(idx,1)[0];
      suggestions.unshift(item);
    }
  }

  // ensure we return exactly 3 suggestions (pad if needed)
  while(suggestions.length < 3) suggestions.push({tone:"Supportive", text:"Keep it steady and be yourself.", confidence:50, reason:"fallback"});

  return suggestions.slice(0,3);
}

/* =========================
   RENDER (safe) + Dashboard
   ========================= */
function escapeHtml(s){ return esc(s); }

function updateDashboard(){
  if(!people.length){
    if(dashFocus) dashFocus.textContent = "—";
    if(dashPause) dashPause.textContent = "—";
    if(dashAction) dashAction.textContent = "Add someone to begin.";
    return;
  }
  const paused = people.filter(p => parseInt(p.focus,10) <= 20);
  const candidates = people.filter(p => (p.status === "dating" && p.focus >= 80) || (p.status === "crush" && p.focus >= 60)).sort((a,b)=>b.focus-a.focus).slice(0,2);
  if(dashFocus) dashFocus.textContent = candidates.length ? candidates.map(p=>p.name).join(", ") : "—";
  if(dashPause) dashPause.textContent = paused.length ? paused.map(p=>p.name).join(", ") : "—";
  if(dashAction) dashAction.textContent = candidates.length ? `${candidates[0].nextMove} — ${candidates[0].name}` : "Stay steady.";
}

function render(){
  if(!list) return;
  list.innerHTML = "";
  const glowSet = new Set(people.filter(p => (p.status === "dating" && p.focus >= 80) || (p.status === "crush" && p.focus >= 60)).sort((a,b)=>b.focus-a.focus).slice(0,2).map(p=>p.name));
  people.forEach((p,i)=>{
    const card = document.createElement("div");
    card.className = `card person ${ (parseInt(p.focus,10) <= 20) ? "paused" : (glowSet.has(p.name) ? "glow" : "") }`;
    const reminderHtml = p.reminder ? `<div class="reminder">⏰ ${escapeHtml(p.reminder)}</div>` : "";
    card.innerHTML = `
      <strong>${escapeHtml(p.name)}</strong>
      <span class="sub">${escapeHtml(p.status)}</span>
      <div class="focus-bar" aria-hidden="true"><div class="focus-fill" style="width:${escapeHtml(p.focus)}%"></div></div>
      <div class="sub">${escapeHtml(p.focus)}% focus</div>
      ${reminderHtml}
      <div class="advice"><strong>Next Move:</strong> ${escapeHtml(p.nextMove)}</div>
      <div class="card-actions">
        <button type="button" onclick="openEdit(${i})">Edit</button>
        <button type="button" onclick="removePerson(${i})">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });
  updateDashboard();
}

/* =========================
   ADD person
   ========================= */
form.onsubmit = e => {
  e.preventDefault();
  const name = (form.name && form.name.value || "").trim();
  if(!name) return;
  const p = {
    name,
    status: selectedStatus,
    focus,
    notes: (form.notes && form.notes.value) ? form.notes.value.trim() : "",
    reminder: (form.reminder && form.reminder.value) ? form.reminder.value.trim() : "",
    nextMove: "",
    events: [],
    summary: { keyFacts: [], lastEventAt: null, mostLikelyState: "" }
  };
  p.nextMove = getNextMove(p);
  people.push(p);
  save();
  render();
  form.reset();
  focus = 0;
  updateFocusUI();
  document.querySelectorAll(".status-buttons button").forEach(b=>b.classList.remove("active"));
  if(defaultBtn) defaultBtn.classList.add("active");
  selectedStatus = "crush";
};

/* =========================
   EDIT modal wiring
   ========================= */
const editModal = $id("editModal");
const editNameInput = $id("editNameInput");
const editStatusSelect = $id("editStatusSelect");
const editFocus = $id("editFocus");
const editFocusValue = $id("editFocusValue");
const editNotesEl = $id("editNotes");
const smartSuggestionEl = $id("smartSuggestion");
const applySmartNotesEl = $id("applySmartNotes");
const summaryFactsEl = $id("summaryFacts");
const summaryStateEl = $id("summaryState");
const timelineListEl = $id("timelineList");
const adviceListEl = $id("adviceList");
const toneSelectEl = $id("toneSelect");

function openEdit(i){
  editingIndex = i;
  const p = people[i];
  if(editNameInput) editNameInput.value = p.name || "";
  if(editStatusSelect) editStatusSelect.value = p.status || "crush";
  if(editFocus) editFocus.value = p.focus || 0;
  if(editFocusValue) editFocusValue.textContent = (p.focus||0) + "%";
  if(editNotesEl) editNotesEl.value = p.notes || "";
  if(applySmartNotesEl) applySmartNotesEl.checked = true;
  // suggestion
  const delta = computeNoteDeltaV4(p.notes || "", p);
  if(smartSuggestionEl) smartSuggestionEl.textContent = formatSuggestion(delta);
  // populate profile summary & timeline & advice
  populateSummary(p);
  populateTimeline(p);
  populateAdvice(p, p.notes || "");
  if(editModal){ editModal.classList.remove("hidden"); editModal.setAttribute("aria-hidden","false"); }
  document.body.style.overflow = "hidden";
}

if(editFocus){ editFocus.oninput = ()=>{ if(editFocusValue) editFocusValue.textContent = editFocus.value + "%"; } }

function populateSummary(p){
  if(!summaryFactsEl || !summaryStateEl) return;
  summaryFactsEl.textContent = (p.summary && p.summary.keyFacts && p.summary.keyFacts.length) ? p.summary.keyFacts.join(", ") : "—";
  summaryStateEl.textContent = (p.summary && p.summary.mostLikelyState) ? `State: ${p.summary.mostLikelyState}` : "";
}

function populateTimeline(p){
  if(!timelineListEl) return;
  const events = p.events || [];
  if(!events.length) { timelineListEl.textContent = "No events yet."; return; }
  timelineListEl.innerHTML = "";
  events.slice(0,8).forEach(ev=>{
    const el = document.createElement("div");
    el.className = "timeline-item";
    el.style.padding = "6px 0";
    el.innerHTML = `<div style="font-weight:700">${escapeHtml(ev.text)}</div><div style="font-size:12px;color:#9aa3ad">${new Date(ev.timestamp).toLocaleString()} • Δ ${ev.delta>=0? "+"+ev.delta:ev.delta}</div>`;
    timelineListEl.appendChild(el);
  });
}

function populateAdvice(p, notesText){
  if(!adviceListEl) return;
  const tone = toneSelectEl ? toneSelectEl.value : "supportive";
  const adv = generateAdvice(p, notesText, tone);
  adviceListEl.innerHTML = "";
  adv.forEach((a, idx)=>{
    const card = document.createElement("div");
    card.className = "advice-card";
    card.innerHTML = `<div><span class="tone">${escapeHtml(a.tone)}</span><span class="confidence">${a.confidence}%</span></div>
      <div style="margin-top:6px">${escapeHtml(a.text)}</div>
      <div style="margin-top:8px;font-size:12px;color:#9aa3ad">${escapeHtml(a.reason)}</div>
      <div style="margin-top:8px;display:flex;gap:8px;"><button style="flex:1" onclick="applyAdvice(${idx})">Use</button><button style="flex:1" onclick="feedbackAdvice(${idx}, true)">👍</button><button style="flex:1" onclick="feedbackAdvice(${idx}, false)">👎</button></div>
    `;
    adviceListEl.appendChild(card);
  });
}

/* applyAdvice: inject into editNotes box for quick use */
function applyAdvice(idx){
  if(!adviceListEl || editingIndex===null) return;
  const p = people[editingIndex];
  const notesText = editNotesEl ? (editNotesEl.value || "") : "";
  const adv = generateAdvice(p, notesText, toneSelectEl ? toneSelectEl.value : "supportive");
  if(!adv || !adv[idx]) return;
  if(editNotesEl) editNotesEl.value = adv[idx].text + (notesText ? "\n\n" + notesText : "");
  // update suggestion preview
  if(smartSuggestionEl) smartSuggestionEl.textContent = formatSuggestion(computeNoteDeltaV4(editNotesEl.value, p));
}

/* feedback stub (local adjustments can be implemented later) */
function feedbackAdvice(idx, positive){
  // store local feedback; for now we just console log and keep it local for future use
  console.log("Advice feedback:", { idx, positive, person: editingIndex });
  // visual confirmation (temporary)
  alert("Thanks — feedback saved locally.");
}

/* robust saveEdit with focus-hard-to-100% rule */
function closeEdit(){
  if(editModal) { editModal.classList.add("hidden"); editModal.setAttribute("aria-hidden","true"); }
  document.body.style.overflow = "";
  editingIndex = null;
}

function saveEdit(){
  try {
    if(editingIndex === null) return;
    const p = people[editingIndex];
    const newName = editNameInput ? (editNameInput.value || "").trim() : p.name;
    const newStatus = editStatusSelect ? (editStatusSelect.value || p.status) : p.status;
    const sliderVal = editFocus ? (parseInt(editFocus.value,10) || 0) : p.focus;
    const notesVal = editNotesEl ? (editNotesEl.value || "").trim() : (p.notes || "");
    const applySmart = applySmartNotesEl ? !!applySmartNotesEl.checked : true;
    // compute delta using v4 engine
    const delta = computeNoteDeltaV4(notesVal, { status: newStatus, focus: p.focus });
    // --- FOCUS HARD-TO-100% RULE ---
    // scale auto delta depending on current sliderVal (so higher focus => smaller gain)
    let finalFocus = sliderVal;
    if(applySmart && Math.abs(delta) >= SMART_MIN_APPLY_THRESHOLD){
      // multiplier decreases as sliderVal approaches 100
      const multiplier = Math.max(0.10, Math.pow(1 - (sliderVal / 100), 1.2)); // ranges ~1 -> 0.1
      const effectiveDelta = Math.round(delta * multiplier);
      finalFocus = finalFocus + effectiveDelta;
      // auto-applies cannot push beyond 95% (makes 100% hard to reach)
      if(finalFocus > 95 && delta > 0) finalFocus = 95;
    }
    // if not applying smart (manual only), allow slider to set 100
    finalFocus = Math.max(0, Math.min(100, finalFocus));
    // assign
    p.name = newName || p.name;
    p.status = newStatus;
    p.focus = finalFocus;
    p.notes = notesVal;
    p.nextMove = getNextMove(p);
    // record event if notes exist or delta applied
    if(notesVal){
      appendEvent(p, notesVal, delta, { applied: applySmart });
    }
    save();
    render();
  } catch(err){
    console.error("saveEdit error:", err);
  } finally {
    closeEdit(); // always close
  }
}

/* =========================
   Remove / save / init
   ========================= */
function removePerson(i){ people.splice(i,1); save(); render(); }
function save(){ try{ localStorage.setItem("rizz_people", JSON.stringify(people)); } catch(e){ console.error("save error", e); } }

/* initialization */
updateFocusUI();
render();