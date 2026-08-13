// Outcomes Review Tool — shared logic for index.html, add.html, and reconcile.html
// Data lives in Supabase (table: outcomes), not localStorage.

// Supabase connection — config.js (loaded before this file) sets window.SUPABASE_CONFIG.
const supabaseClient =
  window.supabase && window.SUPABASE_CONFIG
    ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key)
    : null;

if (!supabaseClient) {
  console.error("Supabase client not initialized — check that config.js is loaded before script.js.");
}

// The "table" a record is in (Needs Follow-up vs Completed) is really just
// its status column value. These are the two values the status check
// constraint allows.
const STATUS = {
  followup: "needs_follow_up",
  completed: "completed",
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Classification -> Type reference list, from "Outcomes renamed headers.xls"
// (the shelter's full outcome taxonomy — not guest data).
const OUTCOME_TAXONOMY = {
  "Abuse": [
    "Successful linkage and ongoing services w/Victim's Services",
    "Successful linkage and ongoing services with Anger Management Counseling",
    "Successful linkage and ongoing services with DV Counseling",
  ],
  "Benefits": [
    "Attend Stand Down for Veterans",
    "Obtain Government Cell Phone",
    "Obtain Link Card/SNAP",
    "Obtain medical card/Medicaid",
    "Obtain Medicare",
    "Obtain pension/401(k)/non-SS retirement funds",
    "Obtain Reduced Fare ID from RTA",
    "Obtain SS Retirement benefits",
    "Obtain SSDI benefits",
    "Obtain SSI benefits",
    "Obtain TANF",
    "Obtain Unemployment benefits",
    "Obtain VA Benefits",
    "Obtain WIC",
  ],
  "Children's Services": [
    "Complete School Enrollment",
    "Obtain non-subsidized child care",
    "Obtain school bus transportation for children",
    "Obtain services with Big Brothers/Big Sisters",
    "Obtain subsidized child care",
    "Obtain visitation with children",
    "Successful enrollment in youth program",
  ],
  "CHP Housing Only": [
    "Maintain Housing for 6 Months",
    "Maintain Housing for 12 Months",
    "Maintain Housing for 18 Months",
    "Maintain Housing for 24 Months",
  ],
  "Education": [
    "Obtain degree/diploma",
    "Obtain GED",
    "Obtain scholarship/financial assistance for education",
    "Successful completion of Waubonsee Employment Skills Program",
  ],
  "Employment": [
    "Complete certification program",
    "Complete interviewing seminar",
    "Complete resume workshop",
    "Maintain employment for more than 90 days",
    "Obtain employment authorization document",
    "Obtain employment related license/certification",
    "Obtain FT employment",
    "Obtain promotion/raise at work",
    "Obtain PT employment",
    "Obtain temp/seasonal employment",
    "Successfully complete employment skills program",
  ],
  "Financial": [
    "Complete annual income tax return(s)",
    "Complete consumer credit counseling classes",
    "Create and maintain a budget for three months",
    "Establish a payment plan on bills/fines",
    "Establish checking account",
    "Establish savings account",
    "Improve credit score",
    "Meet an established savings goal",
    "Obtain Child Support",
    "Obtain Rental/Utility Assistance",
    "Obtain/Refinance loan on non-predatory terms",
    "Pay bills on time for more than one month",
    "Pay off court fines",
  ],
  "Harm Reduction": [
    "Abstinence from drug of choice for 30 days",
    "Reach predetermined harm reduction milestone",
  ],
  "Housing": [
    "Move into housing situation with friends/family",
    "Obtain appropriate housing through linkage to other residential program",
    "Obtain emergency housing at other OES program",
    "Obtain home",
    "Obtain housing at assisted living facility/nursing home",
    "Obtain non-subsidized rental housing",
    "Obtain Permanent Supportive Housing",
    "Obtain subsidized rental Housing",
    "Obtain transitional housing at Lifesprings program",
    "Obtain transitional housing at Mutual Ground program",
    "Obtain transitional housing at TLC Program",
    "Maintain Housing for 6 Months",
    "Maintain Housing for 12 Months",
    "Maintain Housing for 18 Months",
    "Maintain Housing for 24 Months",
  ],
  "Identification": [
    "Obtain birth certificate",
    "Obtain DD214 (veterans identification document)",
    "Obtain driver's license",
    "Obtain necessary immigration documentation",
    "Obtain Social Security card",
    "Obtain State Disabled Person ID",
    "Obtain State ID",
    "Obtain Voter's Registration card",
  ],
  "Legal": [
    "Resolve civil legal issue",
    "Resolve criminal legal issue",
    "Successful Linkage to Legal Services",
  ],
  "Life Skills": [
    "Learned cleaning life skill",
    "Learned cooking life skill",
    "Learned interpersonal/coping life skills",
    "Learned self-care life skill",
  ],
  "Mental Health": [
    "Admission to residential psychiatric program",
    "Attended necessary psychiatric appointment",
    "Demonstrated ability to continuously self-administer psych medication",
    "Demonstrated increased self-coping skills to manage mental health",
    "Demonstrated necessary self-coping skills to manage mental health crisis",
    "Maintained counseling appointments for 60 days or until completion",
    "Obtain individual or group counseling with Out-Patient Mental Health Treatment",
    "Obtained counseling services through Intensive Stabilization Program",
    "Obtained individual/group counseling services w/AID",
    "Obtained individual/group counseling services w/Crisis Intervention worker through Crisis Line",
    "Obtained individual/group counseling services w/Gateway",
    "Obtained individual/group counseling services w/Samaritan Interfaith Counseling",
    "Obtained monthly medications for more than one month",
  ],
  "Physical Health": [
    "Access specialty care at Cook County Hospital",
    "Obtain access to specialty care provider",
    "Obtain eyeglasses",
    "Obtain meds through prescription assistance program",
    "Obtain necessary dental procedure",
    "Obtain necessary medical procedure",
    "Obtain necessary prescription medication",
    "Successfully completed medication regime for recovery from acute illness",
    "Successfully managed chronic illness for minimum of 30 days",
  ],
  "Substance Abuse": [
    "Admission to half-way house program",
    "Admission to in-patient program",
    "Attend individual/group weekly for more for 30 days.",
    "Complete SA treatment plan",
    "Maintain sobriety for 30 days",
    "Successful linkage and ongoing services with Breaking Free",
    "Successful linkage and ongoing services with Gateway",
    "Successful linkage and ongoing services with out-patient program",
    "Successful linkage to detox program",
    "Successful linkage with support group for 30 days",
  ],
  "Support Systems": [
    "Attend Stand Down for Veterans",
    "Establish connection with faith community and attend regularly for more than one month",
    "Re-establish positive relationship with immediate family member.",
  ],
  "Transportation": [
    "Learned to use public transportation system",
    "Obtain and successfully utilize RIK",
    "Obtain car insurance",
    "Obtain current vehicle registration and plates",
    "Obtain long-distance transportation for significant event",
    "Obtain monthly bus pass",
    "Obtain Reduced Fare ID from RTA",
    "Obtain vehicle",
    "Set up  and follow through with alternative transportation plan for 30 days",
  ],
};

function classificationOptionsHtml(selected) {
  const classifications = Object.keys(OUTCOME_TAXONOMY);
  let html = `<option value="">-- Select --</option>`;
  if (selected && !classifications.includes(selected)) {
    html += `<option value="${escapeAttr(selected)}" selected>${escapeHtml(selected)}</option>`;
  }
  classifications.forEach((c) => {
    html += `<option value="${escapeAttr(c)}"${c === selected ? " selected" : ""}>${escapeHtml(c)}</option>`;
  });
  return html;
}

function typeOptionsHtml(classification, selected) {
  const types = OUTCOME_TAXONOMY[classification] || [];
  let html = `<option value="">-- Select --</option>`;
  if (selected && !types.includes(selected)) {
    html += `<option value="${escapeAttr(selected)}" selected>${escapeHtml(selected)}</option>`;
  }
  types.forEach((t) => {
    html += `<option value="${escapeAttr(t)}"${t === selected ? " selected" : ""}>${escapeHtml(t)}</option>`;
  });
  return html;
}

// Leftmost column in both tables -- shows a dismissible "worth a look"
// badge when a reconciliation upload has flagged this record as a
// possible match (see runReconcileComparison), and/or a possible-duplicate
// indicator when another record in the tool shares the same Guest ID,
// Classification, and Type (see computeDuplicateIds). Neither one moves,
// merges, or deletes anything on its own -- both are just a heads-up.
function flagCellHtml(r, isDuplicate) {
  const parts = [];
  if (r.possibleMatch) {
    parts.push(
      `<button class="flag-btn" data-id="${r.id}" title="Possible match found in a reconciliation report — click to dismiss">${ICONS.magnifier}</button>`
    );
  }
  if (isDuplicate) {
    parts.push(
      `<span class="duplicate-flag" title="Same Guest ID, Classification, and Type already logged elsewhere in the tool — worth checking for a duplicate">${ICONS.duplicate}</span>`
    );
  }
  if (parts.length === 0) return `<td class="flag-cell"></td>`;
  return `<td class="flag-cell">${parts.join("")}</td>`;
}

// Small inline icons for buttons -- stroke="currentColor" so each one
// automatically matches its button's text color (blue, red, neutral).
const ICONS = {
  check: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><polyline points="3 8.5 6.5 12 13 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  undo: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4v3.5h3.5M4.4 6.8a5 5 0 1 1-0.4 3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pencil: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M11 2.3l2.7 2.7-8 8-3.4 0.9 0.9-3.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M6 4V2.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6V4M4.5 4l.6 9a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  magnifier: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="9.5" y1="9.5" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  duplicate: `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.3 10V3.8a.5.5 0 01.5-.5H10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
};

// ---------- Supabase data layer ----------
// Maps between the app's internal field names (used throughout the render/
// edit code below, unchanged from the localStorage version) and the
// outcomes table's column names.

function mapFromDb(row) {
  return {
    id: row.id,
    status: row.status,
    guestId: row.guest_id || "",
    guest: row.guest_name || "",
    classification: row.classification || "",
    type: row.type || "",
    date: row.date_identified || "",
    caseManager: row.case_manager || "",
    sourceSnippet: row.source_email || "",
    notes: row.notes || "",
    possibleMatch: !!row.possible_match,
    nextActionDate: row.next_action_date || "",
    createdAt: row.created_at || "",
  };
}

function mapToDb(record) {
  return {
    guest_id: record.guestId || null,
    guest_name: record.guest || "",
    classification: record.classification || "",
    type: record.type || "",
    date_identified: record.date || null,
    case_manager: record.caseManager || null,
    source_email: record.sourceSnippet || null,
    notes: record.notes || null,
    possible_match: !!record.possibleMatch,
    next_action_date: record.nextActionDate || null,
  };
}

async function fetchRecordsByStatus(status) {
  const { data, error } = await supabaseClient
    .from("outcomes")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Failed to load outcomes:", error);
    return [];
  }
  return data.map(mapFromDb);
}

async function insertRecord(record) {
  const { data, error } = await supabaseClient
    .from("outcomes")
    .insert({ ...mapToDb(record), status: record.status })
    .select()
    .single();
  if (error) {
    console.error("Failed to add outcome:", error);
    alert("Couldn't save that outcome. Check the console for details.");
    return null;
  }
  return mapFromDb(data);
}

async function updateRecord(id, fields) {
  const { error } = await supabaseClient.from("outcomes").update(fields).eq("id", id);
  if (error) {
    console.error("Failed to update outcome:", error);
    alert("Couldn't save that change. Check the console for details.");
    return false;
  }
  return true;
}

async function deleteRecord(id) {
  const { error } = await supabaseClient.from("outcomes").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete outcome:", error);
    alert("Couldn't delete that record. Check the console for details.");
    return false;
  }
  return true;
}

// ---------- current user (no real auth - just remembers a name per browser
// so the activity log below has a "by" to attach to each entry) ----------

const CURRENT_USER_KEY = "outcomesCurrentUser";

function getCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

function promptForCurrentUser() {
  const name = (prompt("Your name — logged against records you delete or mark as documented in HMIS:", getCurrentUser()) || "").trim();
  if (name) localStorage.setItem(CURRENT_USER_KEY, name);
  return getCurrentUser();
}

function ensureCurrentUser() {
  return getCurrentUser() || promptForCurrentUser() || "Unknown";
}

function wireCurrentUserButton() {
  const btn = document.getElementById("current-user-btn");
  if (!btn) return;
  const render = () => {
    const name = getCurrentUser();
    btn.textContent = name ? `Logged as ${name}` : "Set your name";
  };
  btn.addEventListener("click", () => {
    promptForCurrentUser();
    render();
  });
  render();
}

// Snapshots a record into outcomes_log before it's removed from `outcomes`
// (by either a real delete or "documented in HMIS" - both call
// deleteRecord). A logging failure is reported but doesn't block the
// delete itself; losing the log entry is better than blocking the action
// the user actually asked for.
async function logOutcomeAction(record, action, reason) {
  const { data, error } = await supabaseClient
    .from("outcomes_log")
    .insert({
      outcome_id: record.id,
      action,
      reason: reason || null,
      by_name: ensureCurrentUser(),
      guest_id: record.guestId || null,
      guest_name: record.guest || null,
      classification: record.classification || null,
      type: record.type || null,
      status: record.status || null,
      date_identified: record.date || null,
      case_manager: record.caseManager || null,
      source_email: record.sourceSnippet || null,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed to write outcomes_log entry:", error);
    return null;
  }
  return data.id;
}

// Removes a just-created log entry when its delete is undone within the
// undo window - an undone delete never really happened, so it shouldn't
// stay in an "append-only" log of actions that did.
async function retractLogEntry(logId) {
  if (!logId) return;
  const { error } = await supabaseClient.from("outcomes_log").delete().eq("id", logId);
  if (error) console.error("Failed to retract outcomes_log entry:", error);
}

async function fetchRecordById(id) {
  const { data: row, error } = await supabaseClient.from("outcomes").select("*").eq("id", id).single();
  if (error || !row) {
    console.error("Couldn't find that record:", error);
    return null;
  }
  return mapFromDb(row);
}

// ---------- index.html: the two tables ----------

let editingFollowupId = null;
let editingCompletedId = null;

// Column counts for each table's main row -- used as the colspan on the
// full-width Source Email / Notes rows below it, so those rows span every
// column instead of one.
const FOLLOWUP_COLSPAN = 9; // flag, ID, Guest, Classification, Type, Date, Follow-up Due, Case Manager, Actions
const COMPLETED_COLSPAN = 9; // + Documented in HMIS

// Follow-ups with a Next Action Date further out than this stay off the
// dashboard (collapsed into a "later" count) until they're within this
// many days of being due -- keeps far-off items from cluttering the list
// the case manager actually needs to work today. A record with no date
// set is always shown; there's nothing to wait on.
const FOLLOWUP_HORIZON_DAYS = 14;

function isDueSoon(record) {
  if (!record.nextActionDate) return true;
  const horizon = new Date();
  horizon.setHours(0, 0, 0, 0);
  horizon.setDate(horizon.getDate() + FOLLOWUP_HORIZON_DAYS);
  return new Date(record.nextActionDate + "T00:00:00") <= horizon;
}

// Toggled by the "+N later" button in the Needs Follow-up card header.
// Resets to false (hide later items) on every page load.
let showAllFollowups = false;

// Set by each table's "Sort by" dropdown. Defaults to newest-added-first
// (Chris's preference) - sortRecords() re-sorts client-side regardless of
// what order fetchRecordsByStatus's own query returns, so this doesn't need
// to match that query's order. Resets on every page load, same as
// showAllFollowups above.
let followupSortValue = "added_desc";
let completedSortValue = "added_desc";

// Maps a dropdown value's field portion (the part before the last "_") to
// the record field it sorts on.
const SORT_FIELDS = {
  added: "createdAt",
  date: "date",
  id: "guestId",
  name: "guest",
  followup: "nextActionDate",
};

// Missing values (empty string / null) sort first -- for dates that reads
// as "least specified first"; for Follow-up Due it also matches isDueSoon's
// treatment of no date set as already due. Otherwise a plain string compare
// works: ISO dates ("YYYY-MM-DD") sort correctly as strings, and Guest IDs
// get numeric-aware comparison so "9" sorts before "10".
function compareValues(a, b) {
  const aEmpty = a === "" || a == null;
  const bEmpty = b === "" || b == null;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

// sortValue is a dropdown value like "date_desc" or "id_asc" -- the field
// name never itself contains an underscore, so splitting on the last one
// separates it from the asc/desc suffix cleanly.
function sortRecords(records, sortValue) {
  if (!sortValue) return records;
  const separatorIndex = sortValue.lastIndexOf("_");
  const fieldKey = sortValue.slice(0, separatorIndex);
  const direction = sortValue.slice(separatorIndex + 1);
  const field = SORT_FIELDS[fieldKey];
  if (!field) return records;
  const sorted = [...records].sort((a, b) => compareValues(a[field], b[field]));
  return direction === "desc" ? sorted.reverse() : sorted;
}

// Builds the <td> for a full-width detail row (Source Email / Notes) that
// runs beneath a record's main row. Read-only shows a scrollable snippet
// like the old table cell did; editing mode swaps in a full-width textarea.
function detailCellHtml(label, fieldName, value, editing, colspan) {
  const body = editing
    ? `<textarea data-field="${fieldName}" class="detail-textarea">${escapeHtml(value)}</textarea>`
    : `<div class="cell-scroll" title="${escapeAttr(value)}">${escapeHtml(value)}</div>`;
  return `<td class="detail-cell" colspan="${colspan}"><span class="detail-label">${escapeHtml(label)}</span>${body}</td>`;
}

// Set right before a render call to briefly flash the row matching this
// id in that table's accent color -- confirms a move/add landed, rather
// than the list just silently re-rendering. Consumed (cleared) on use.
let highlightId = null;
const HIGHLIGHT_STORAGE_KEY = "outcomesTool_highlight";

function flashRow(tr, colorVar) {
  tr.style.backgroundColor = `var(${colorVar})`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tr.style.backgroundColor = "";
    });
  });
}

// Flags records that could be the same outcome as another record already
// sitting in either table (same guest, Classification/Type either matching
// or blank on one side - see outcomesMightMatch) -- most often the same
// outcome logged twice from separate email batches (e.g. a "still working
// on it" email logged to Needs Follow-up, then a later "done" email logged
// fresh to Completed instead of the first one moving). Purely a heads-up,
// like the reconciliation flag -- nothing merges or gets deleted
// automatically. Records missing an identifier (both Guest ID and Guest
// Name blank) are skipped - nothing to match them on. O(n^2) pairwise
// comparison, not a hash lookup, because "blank matches anything" isn't
// expressible as exact key equality; fine at the scale this table runs at.
function computeDuplicateIds(records) {
  const withIdentifier = records.filter((r) => guestIdentifier(r.guestId, r.guest));
  const duplicateIds = new Set();
  for (let i = 0; i < withIdentifier.length; i++) {
    for (let j = i + 1; j < withIdentifier.length; j++) {
      const a = withIdentifier[i];
      const b = withIdentifier[j];
      if (outcomesMightMatch(
        { guestId: a.guestId, guestName: a.guest, classification: a.classification, type: a.type },
        { guestId: b.guestId, guestName: b.guest, classification: b.classification, type: b.type },
      )) {
        duplicateIds.add(String(a.id));
        duplicateIds.add(String(b.id));
      }
    }
  }
  return duplicateIds;
}

async function renderFollowup() {
  const tableEl = document.getElementById("followup-table");
  if (!tableEl) return;
  const [allRecords, completedRecords] = await Promise.all([
    fetchRecordsByStatus(STATUS.followup),
    fetchRecordsByStatus(STATUS.completed),
  ]);
  const duplicateIds = computeDuplicateIds([...allRecords, ...completedRecords]);
  const laterRecords = allRecords.filter((r) => !isDueSoon(r));
  const records = sortRecords(showAllFollowups ? allRecords : allRecords.filter(isDueSoon), followupSortValue);
  const tbody = tableEl.querySelector("tbody");
  const emptyEl = document.getElementById("followup-empty");
  const emptyTextEl = document.getElementById("followup-empty-text");
  const countEl = document.getElementById("followup-count");
  const laterToggle = document.getElementById("followup-later-toggle");
  if (countEl) countEl.textContent = records.length;
  tbody.innerHTML = "";

  if (laterToggle) {
    if (laterRecords.length === 0) {
      laterToggle.style.display = "none";
    } else {
      laterToggle.style.display = "inline";
      laterToggle.textContent = showAllFollowups
        ? `Hide ${laterRecords.length} not due for ${FOLLOWUP_HORIZON_DAYS}+ days`
        : `+${laterRecords.length} more not due for ${FOLLOWUP_HORIZON_DAYS}+ days — Show`;
    }
  }

  if (records.length === 0) {
    tableEl.closest(".table-scroll").style.display = "none";
    emptyEl.style.display = "block";
    if (emptyTextEl) {
      emptyTextEl.textContent =
        allRecords.length === 0
          ? "No follow-ups yet."
          : `All caught up — ${laterRecords.length} follow-up(s) not due for ${FOLLOWUP_HORIZON_DAYS}+ days.`;
    }
    return;
  }
  tableEl.closest(".table-scroll").style.display = "block";
  emptyEl.style.display = "none";

  records.forEach((r, i) => {
    const groupClass = i % 2 === 0 ? "row-group-odd" : "row-group-even";
    const editing = editingFollowupId === String(r.id);
    const flagHtml = flagCellHtml(r, duplicateIds.has(String(r.id)));

    const tr = document.createElement("tr");
    tr.className = groupClass;
    tr.dataset.recordId = r.id;
    if (editing) {
      tr.innerHTML = `
        ${flagHtml}
        <td><input type="text" data-field="guestId" value="${escapeAttr(r.guestId)}"></td>
        <td><input type="text" data-field="guest" value="${escapeAttr(r.guest)}"></td>
        <td><select data-field="classification" class="classification-select">${classificationOptionsHtml(r.classification)}</select></td>
        <td><select data-field="type" class="type-select">${typeOptionsHtml(r.classification, r.type)}</select></td>
        <td><input type="date" data-field="date" value="${escapeAttr(r.date)}"></td>
        <td><input type="date" data-field="nextActionDate" value="${escapeAttr(r.nextActionDate)}"></td>
        <td><input type="text" data-field="caseManager" value="${escapeAttr(r.caseManager)}"></td>
        <td class="actions">
          <button class="save-btn btn-primary" data-id="${r.id}">${ICONS.check}Save</button>
          <button class="cancel-btn" data-id="${r.id}">${ICONS.x}Cancel</button>
        </td>`;
    } else {
      tr.innerHTML = `
        ${flagHtml}
        <td><span class="id-tag">${escapeHtml(r.guestId)}</span></td>
        <td>${escapeHtml(r.guest)}</td>
        <td><span class="badge">${escapeHtml(r.classification)}</span></td>
        <td><span class="type-text">${escapeHtml(r.type)}</span></td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.nextActionDate)}</td>
        <td>${escapeHtml(r.caseManager)}</td>
        <td class="actions">
          <button class="complete-btn" data-id="${r.id}">${ICONS.check}Move to Completed</button>
          <button class="edit-btn" data-id="${r.id}">${ICONS.pencil}Edit</button>
          <button class="delete-btn" data-id="${r.id}">${ICONS.trash}Delete</button>
        </td>`;
    }
    tbody.appendChild(tr);

    const sourceTr = document.createElement("tr");
    sourceTr.className = `detail-row ${groupClass}`;
    sourceTr.dataset.recordId = r.id;
    sourceTr.innerHTML = detailCellHtml("Source Email", "sourceSnippet", r.sourceSnippet, editing, FOLLOWUP_COLSPAN);
    tbody.appendChild(sourceTr);

    const notesTr = document.createElement("tr");
    notesTr.className = `detail-row record-end ${groupClass}`;
    notesTr.dataset.recordId = r.id;
    notesTr.innerHTML = detailCellHtml("Follow-up Notes", "notes", r.notes, editing, FOLLOWUP_COLSPAN);
    tbody.appendChild(notesTr);

    // Grabbing any of the record's three rows (main + Source Email + Notes)
    // should start the drag, not just the top one - a client record reads
    // as one unit even though it's three <tr>s. Only when not editing, same
    // as before.
    if (!editing) {
      [tr, sourceTr, notesTr].forEach((rowEl) => {
        rowEl.draggable = true;
        rowEl.dataset.dragId = r.id;
      });
    }

    if (highlightId === String(r.id)) {
      flashRow(tr, "--row-hover-red");
      flashRow(sourceTr, "--row-hover-red");
      flashRow(notesTr, "--row-hover-red");
      highlightId = null;
    }
  });
}

async function renderCompleted() {
  const tableEl = document.getElementById("completed-table");
  if (!tableEl) return;
  const [fetchedRecords, followupRecords] = await Promise.all([
    fetchRecordsByStatus(STATUS.completed),
    fetchRecordsByStatus(STATUS.followup),
  ]);
  const duplicateIds = computeDuplicateIds([...fetchedRecords, ...followupRecords]);
  const records = sortRecords(fetchedRecords, completedSortValue);
  const tbody = tableEl.querySelector("tbody");
  const emptyEl = document.getElementById("completed-empty");
  const countEl = document.getElementById("completed-count");
  if (countEl) countEl.textContent = records.length;
  tbody.innerHTML = "";

  if (records.length === 0) {
    tableEl.closest(".table-scroll").style.display = "none";
    emptyEl.style.display = "block";
    return;
  }
  tableEl.closest(".table-scroll").style.display = "block";
  emptyEl.style.display = "none";

  records.forEach((r, i) => {
    const groupClass = i % 2 === 0 ? "row-group-odd" : "row-group-even";
    const editing = editingCompletedId === String(r.id);
    const flagHtml = flagCellHtml(r, duplicateIds.has(String(r.id)));

    const tr = document.createElement("tr");
    tr.className = groupClass;
    tr.dataset.recordId = r.id;
    if (editing) {
      tr.innerHTML = `
        ${flagHtml}
        <td><input type="text" data-field="guestId" value="${escapeAttr(r.guestId)}"></td>
        <td><input type="text" data-field="guest" value="${escapeAttr(r.guest)}"></td>
        <td><select data-field="classification" class="classification-select">${classificationOptionsHtml(r.classification)}</select></td>
        <td><select data-field="type" class="type-select">${typeOptionsHtml(r.classification, r.type)}</select></td>
        <td><input type="date" data-field="date" value="${escapeAttr(r.date)}"></td>
        <td><input type="text" data-field="caseManager" value="${escapeAttr(r.caseManager)}"></td>
        <td class="checkbox-cell">&mdash;</td>
        <td class="actions">
          <button class="save-btn btn-primary" data-id="${r.id}">${ICONS.check}Save</button>
          <button class="cancel-btn" data-id="${r.id}">${ICONS.x}Cancel</button>
        </td>`;
    } else {
      tr.innerHTML = `
        ${flagHtml}
        <td><span class="id-tag">${escapeHtml(r.guestId)}</span></td>
        <td>${escapeHtml(r.guest)}</td>
        <td><span class="badge">${escapeHtml(r.classification)}</span></td>
        <td><span class="type-text">${escapeHtml(r.type)}</span></td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.caseManager)}</td>
        <td class="checkbox-cell">
          <input type="checkbox" class="verified-checkbox" data-id="${r.id}">
        </td>
        <td class="actions">
          <button class="revert-btn" data-id="${r.id}">${ICONS.undo}Move to Follow-up</button>
          <button class="edit-btn" data-id="${r.id}">${ICONS.pencil}Edit</button>
          <button class="delete-btn" data-id="${r.id}">${ICONS.trash}Delete</button>
        </td>`;
    }
    tbody.appendChild(tr);

    const sourceTr = document.createElement("tr");
    sourceTr.className = `detail-row ${groupClass}`;
    sourceTr.dataset.recordId = r.id;
    sourceTr.innerHTML = detailCellHtml("Source Email", "sourceSnippet", r.sourceSnippet, editing, COMPLETED_COLSPAN);
    tbody.appendChild(sourceTr);

    const notesTr = document.createElement("tr");
    notesTr.className = `detail-row record-end ${groupClass}`;
    notesTr.dataset.recordId = r.id;
    notesTr.innerHTML = detailCellHtml("Notes", "notes", r.notes, editing, COMPLETED_COLSPAN);
    tbody.appendChild(notesTr);

    // Grabbing any of the record's three rows (main + Source Email + Notes)
    // should start the drag, not just the top one - a client record reads
    // as one unit even though it's three <tr>s. Only when not editing, same
    // as before.
    if (!editing) {
      [tr, sourceTr, notesTr].forEach((rowEl) => {
        rowEl.draggable = true;
        rowEl.dataset.dragId = r.id;
      });
    }

    if (highlightId === String(r.id)) {
      flashRow(tr, "--row-hover-blue");
      flashRow(sourceTr, "--row-hover-blue");
      flashRow(notesTr, "--row-hover-blue");
      highlightId = null;
    }
  });
}

// Re-fetches and redraws both tables -- used after any mutation, since a
// record moving between statuses (or being added/deleted) can affect
// either table's contents.
async function renderAll() {
  await Promise.all([renderFollowup(), renderCompleted()]);
}

// A record's main row, Source Email row, and Notes row are separate <tr>s,
// so plain CSS :hover only lights up whichever one the pointer happens to
// be over. Track the hovered record's id and toggle .group-hover on every
// row sharing it, so mousing over any part of a record highlights all
// three rows together.
function wireRecordGroupHover(tbody) {
  let activeId = null;
  function setActive(id) {
    if (id === activeId) return;
    if (activeId) {
      tbody.querySelectorAll(`tr[data-record-id="${activeId}"]`).forEach((tr) => tr.classList.remove("group-hover"));
    }
    activeId = id;
    if (activeId) {
      tbody.querySelectorAll(`tr[data-record-id="${activeId}"]`).forEach((tr) => tr.classList.add("group-hover"));
    }
  }
  tbody.addEventListener("mouseover", (e) => {
    const tr = e.target.closest("tr[data-record-id]");
    setActive(tr ? tr.dataset.recordId : null);
  });
  tbody.addEventListener("mouseleave", () => setActive(null));
}

// A record now spans three rows (main row + Source Email row + Notes row),
// so its data-field inputs are no longer all inside one <tr>. Gather them
// by matching every row tagged with this record's id instead.
function readRecordInputs(tbody, id) {
  const fields = {};
  tbody.querySelectorAll(`tr[data-record-id="${id}"] [data-field]`).forEach((el) => {
    fields[el.dataset.field] = el.value;
  });
  return fields;
}

// Shared move logic -- used by both the row buttons and drag-and-drop.
async function moveToCompleted(id) {
  const ok = await updateRecord(id, { status: STATUS.completed });
  if (!ok) return;
  highlightId = String(id);
  await renderAll();
}

async function moveToFollowup(id) {
  const ok = await updateRecord(id, { status: STATUS.followup });
  if (!ok) return;
  highlightId = String(id);
  await renderAll();
}

// Dismiss a reconciliation possible-match flag -- purely visual, doesn't
// touch anything else about the record.
async function dismissPossibleMatch(id) {
  const ok = await updateRecord(id, { possible_match: false });
  if (!ok) return;
  await renderAll();
}

// ---------- delete with undo ----------

let pendingDelete = null; // { record, timeoutId }
const UNDO_WINDOW_MS = 7000;

function getToastEl() {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  return toast;
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.remove("visible");
}

function showUndoToast(message, onUndo) {
  const toast = getToastEl();
  toast.innerHTML = `<span></span><button class="undo-btn" type="button">Undo</button>`;
  toast.querySelector("span").textContent = message;
  toast.classList.add("visible");
  toast.querySelector(".undo-btn").onclick = () => {
    toast.classList.remove("visible");
    onUndo();
  };
}

// Returns the trimmed reason text, "" if left blank, or null if the user
// cancelled (in which case the delete itself is aborted - this prompt is
// the only confirmation step on the delete path, there's no separate
// confirm() dialog).
function promptDeleteReason() {
  const input = prompt("Why is this being deleted? (optional)");
  if (input === null) return null;
  return input.trim();
}

async function deleteWithUndo(id, reason) {
  const record = await fetchRecordById(id);
  if (!record) return;

  const logId = await logOutcomeAction(record, "deleted", reason);

  const ok = await deleteRecord(id);
  if (!ok) {
    await retractLogEntry(logId);
    return;
  }
  await renderAll();

  if (pendingDelete) clearTimeout(pendingDelete.timeoutId);

  const timeoutId = setTimeout(() => {
    pendingDelete = null;
    hideToast();
  }, UNDO_WINDOW_MS);

  pendingDelete = { record, logId, timeoutId };

  showUndoToast(`Deleted ${record.guest || "record"}`, async () => {
    clearTimeout(pendingDelete.timeoutId);
    await retractLogEntry(pendingDelete.logId);
    const restored = await insertRecord(pendingDelete.record);
    if (restored) {
      highlightId = String(restored.id);
      await renderAll();
    }
    pendingDelete = null;
  });
}

function wireFollowupLaterToggle() {
  const laterToggle = document.getElementById("followup-later-toggle");
  if (!laterToggle) return;
  laterToggle.addEventListener("click", async () => {
    showAllFollowups = !showAllFollowups;
    await renderFollowup();
  });
}

function wireSortControls() {
  const followupSort = document.getElementById("followup-sort");
  if (followupSort) {
    followupSort.addEventListener("change", async () => {
      followupSortValue = followupSort.value;
      await renderFollowup();
    });
  }

  const completedSort = document.getElementById("completed-sort");
  if (completedSort) {
    completedSort.addEventListener("change", async () => {
      completedSortValue = completedSort.value;
      await renderCompleted();
    });
  }
}

function wireFollowupTable() {
  const tableEl = document.getElementById("followup-table");
  if (!tableEl) return;
  const tbody = tableEl.querySelector("tbody");
  wireRecordGroupHover(tbody);

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    const id = btn && btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("edit-btn")) {
      editingFollowupId = id;
      await renderFollowup();
    } else if (btn.classList.contains("cancel-btn")) {
      editingFollowupId = null;
      await renderFollowup();
    } else if (btn.classList.contains("save-btn")) {
      const fields = readRecordInputs(tbody, id);
      await updateRecord(id, mapToDb(fields));
      editingFollowupId = null;
      await renderFollowup();
    } else if (btn.classList.contains("delete-btn")) {
      const reason = promptDeleteReason();
      if (reason === null) return;
      await deleteWithUndo(id, reason);
    } else if (btn.classList.contains("complete-btn")) {
      await moveToCompleted(id);
    } else if (btn.classList.contains("flag-btn")) {
      await dismissPossibleMatch(id);
    }
  });

  tbody.addEventListener("change", (e) => {
    if (!e.target.classList.contains("classification-select")) return;
    const typeSelect = e.target.closest("tr").querySelector(".type-select");
    if (typeSelect) typeSelect.innerHTML = typeOptionsHtml(e.target.value, "");
  });
}

function wireCompletedTable() {
  const tableEl = document.getElementById("completed-table");
  if (!tableEl) return;
  const tbody = tableEl.querySelector("tbody");
  wireRecordGroupHover(tbody);

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    const id = btn && btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("edit-btn")) {
      editingCompletedId = id;
      await renderCompleted();
    } else if (btn.classList.contains("cancel-btn")) {
      editingCompletedId = null;
      await renderCompleted();
    } else if (btn.classList.contains("save-btn")) {
      const fields = readRecordInputs(tbody, id);
      await updateRecord(id, mapToDb(fields));
      editingCompletedId = null;
      await renderCompleted();
    } else if (btn.classList.contains("delete-btn")) {
      const reason = promptDeleteReason();
      if (reason === null) return;
      await deleteWithUndo(id, reason);
    } else if (btn.classList.contains("revert-btn")) {
      await moveToFollowup(id);
    } else if (btn.classList.contains("flag-btn")) {
      await dismissPossibleMatch(id);
    }
  });

  tbody.addEventListener("change", async (e) => {
    if (e.target.classList.contains("classification-select")) {
      const typeSelect = e.target.closest("tr").querySelector(".type-select");
      if (typeSelect) typeSelect.innerHTML = typeOptionsHtml(e.target.value, "");
      return;
    }

    if (!e.target.classList.contains("verified-checkbox")) return;
    const id = e.target.dataset.id;
    if (!e.target.checked) return;
    if (!confirm("Mark as documented in HMIS and remove it from this list?")) {
      e.target.checked = false;
      return;
    }
    const record = await fetchRecordById(id);
    if (!record) {
      e.target.checked = false;
      return;
    }
    await logOutcomeAction(record, "documented_in_hmis", null);
    const ok = await deleteRecord(id);
    if (ok) await renderCompleted();
  });
}

// ---------- drag and drop between the two tables ----------

function wireDragAndDrop() {
  const followupTbody = document.querySelector("#followup-table tbody");
  const completedTbody = document.querySelector("#completed-table tbody");
  const followupSection = document.getElementById("followup-section");
  const completedSection = document.getElementById("completed-section");
  if (!followupTbody || !completedTbody || !followupSection || !completedSection) return;

  function handleDragStart(source) {
    return (e) => {
      const tr = e.target.closest("tr[draggable='true']");
      if (!tr) return;
      e.dataTransfer.setData("text/plain", JSON.stringify({ id: tr.dataset.dragId, source }));
      e.dataTransfer.effectAllowed = "move";
      // Dim the whole client record (main + Source Email + Notes rows), not
      // just whichever of the three was grabbed - all three share
      // data-record-id and read as one logical record.
      tr.parentElement
        .querySelectorAll(`tr[data-record-id="${tr.dataset.recordId}"]`)
        .forEach((rowEl) => rowEl.classList.add("dragging"));
    };
  }

  followupTbody.addEventListener("dragstart", handleDragStart("followup"));
  completedTbody.addEventListener("dragstart", handleDragStart("completed"));

  document.addEventListener("dragend", () => {
    document.querySelectorAll("tr.dragging").forEach((rowEl) => rowEl.classList.remove("dragging"));
  });

  function setupDropZone(sectionEl, expectedSource, onDrop) {
    sectionEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      sectionEl.classList.add("drop-target");
    });
    sectionEl.addEventListener("dragleave", (e) => {
      if (!sectionEl.contains(e.relatedTarget)) sectionEl.classList.remove("drop-target");
    });
    sectionEl.addEventListener("drop", (e) => {
      e.preventDefault();
      sectionEl.classList.remove("drop-target");
      let data;
      try {
        data = JSON.parse(e.dataTransfer.getData("text/plain"));
      } catch (err) {
        return;
      }
      if (!data || data.source !== expectedSource) return;
      onDrop(data.id);
    });
  }

  setupDropZone(completedSection, "followup", moveToCompleted);
  setupDropZone(followupSection, "completed", moveToFollowup);
}

// ---------- add.html: the add-record form ----------

function wireAddForm() {
  const form = document.getElementById("add-form");
  if (!form) return;

  const dateInput = form.querySelector('[name="date"]');
  if (dateInput && !dateInput.value) {
    dateInput.valueAsDate = new Date();
  }

  const classificationSelect = form.querySelector('[name="classification"]');
  const typeSelect = form.querySelector('[name="type"]');
  if (classificationSelect && typeSelect) {
    classificationSelect.innerHTML = classificationOptionsHtml("");
    typeSelect.innerHTML = typeOptionsHtml("", "");
    classificationSelect.addEventListener("change", () => {
      typeSelect.innerHTML = typeOptionsHtml(classificationSelect.value, "");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const table = data.get("table");
    const record = {
      guestId: data.get("guestId").trim(),
      guest: data.get("guest").trim(),
      classification: data.get("classification").trim(),
      type: data.get("type").trim(),
      date: data.get("date"),
      nextActionDate: data.get("nextActionDate"),
      caseManager: data.get("caseManager").trim(),
      sourceSnippet: data.get("sourceSnippet").trim(),
      notes: data.get("notes").trim(),
      status: table === "completed" ? STATUS.completed : STATUS.followup,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const inserted = await insertRecord(record);

    if (submitBtn) submitBtn.disabled = false;
    if (!inserted) return; // insertRecord already alerted on failure

    sessionStorage.setItem(HIGHLIGHT_STORAGE_KEY, String(inserted.id));
    window.location.href = "index.html";
  });
}

// ---------- reconcile.html: compare against an external report ----------

// Minimal CSV parser -- handles quoted fields, escaped "" quotes, commas
// inside quotes, and both \n and \r\n line endings. Good enough for a
// simple exported report; not a full RFC 4180 implementation.
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function findColumnIndex(headers, candidates) {
  const normalized = headers.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Guest ID is often blank (many source emails only give a name, no ID
// number - see extraction-rules.md 1a), so an ID-only identifier would miss
// most real duplicates. Fall back to guest name only when ID is blank,
// rather than treating them as two independent signals, so a record with
// an ID always matches on that ID and never accidentally collides with a
// same-named different guest who happens to lack one. Returns "" if
// neither is present - nothing to identify the guest by at all.
function guestIdentifier(guestId, guestName) {
  const id = String(guestId ?? "").trim().toLowerCase();
  if (id) return `id:${id}`;
  const name = String(guestName ?? "").trim().toLowerCase();
  if (name) return `name:${name}`;
  return "";
}

// Classification/Type comparison where a blank value on EITHER side is a
// wildcard, not a mismatch. Our own extraction deliberately leaves
// Classification and/or Type blank when it isn't confident which exact
// taxonomy value applies (extraction-rules.md rule 4) - those are exactly
// the records most worth surfacing for review, so requiring exact equality
// would mean the most ambiguous outcomes could never be flagged as
// possible matches.
function fieldMatchesOrBlank(a, b) {
  const na = String(a ?? "").trim().toLowerCase();
  const nb = String(b ?? "").trim().toLowerCase();
  return !na || !nb || na === nb;
}

// True if two outcome-shaped records ({guestId, guestName, classification,
// type}) could plausibly be the same outcome: same guest identifier
// (required - no identifier on either side never matches), and
// Classification/Type each either blank on one side or equal on both.
function outcomesMightMatch(a, b) {
  const idA = guestIdentifier(a.guestId, a.guestName);
  const idB = guestIdentifier(b.guestId, b.guestName);
  if (!idA || idA !== idB) return false;
  return fieldMatchesOrBlank(a.classification, b.classification) && fieldMatchesOrBlank(a.type, b.type);
}

function wireReconcileForm() {
  const form = document.getElementById("reconcile-form");
  if (!form) return;

  const fileInput = document.getElementById("reconcile-file");
  const messageEl = document.getElementById("reconcile-message");
  const resultsSection = document.getElementById("reconcile-results-section");
  const resultsTbody = document.querySelector("#reconcile-table tbody");
  const countEl = document.getElementById("reconcile-count");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    messageEl.textContent = "";
    resultsSection.style.display = "none";

    const file = fileInput.files[0];
    if (!file) {
      messageEl.textContent = "Choose a file first.";
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
      messageEl.textContent =
        "That looks like an Excel file. Please open it and use “Save As” → CSV, then upload the .csv file instead.";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      runReconcileComparison(String(reader.result), messageEl, resultsSection, resultsTbody, countEl);
      fileInput.value = ""; // don't hold onto the file selection once processed
    };
    reader.onerror = () => {
      messageEl.textContent = "Couldn't read that file. Please try again.";
    };
    reader.readAsText(file);
  });
}

async function runReconcileComparison(csvText, messageEl, resultsSection, resultsTbody, countEl) {
  const rows = parseCsv(csvText).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (rows.length < 2) {
    messageEl.textContent = "That file doesn't have any data rows to compare.";
    return;
  }

  const headers = rows[0];
  const guestIdIdx = findColumnIndex(headers, ["guestid", "id"]);
  const guestNameIdx = findColumnIndex(headers, ["guestname", "name", "guest"]);
  const classificationIdx = findColumnIndex(headers, ["classification"]);
  const typeIdx = findColumnIndex(headers, ["type"]);

  if (classificationIdx === -1 || typeIdx === -1) {
    messageEl.textContent =
      "Couldn't find Classification / Type columns — check the header row matches those names.";
    return;
  }
  if (guestIdIdx === -1 && guestNameIdx === -1) {
    messageEl.textContent =
      "Couldn't find a Guest ID or Guest Name column — check the header row includes at least one.";
    return;
  }

  // Guest Name is a fallback identifier, same as guestIdentifier() uses for
  // the app's own records - a row with no ID and no name can't be matched
  // to anything, so it's skipped rather than colliding with every other
  // identifier-less row on Classification+Type alone. Classification/Type
  // are kept as given (blank or not) - outcomesMightMatch treats a blank on
  // either side as a wildcard rather than requiring exact equality.
  const reportRecords = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const guestId = guestIdIdx !== -1 ? r[guestIdIdx] : "";
    const guestName = guestNameIdx !== -1 ? r[guestNameIdx] : "";
    if (!guestId.trim() && !guestName.trim()) continue;
    reportRecords.push({ guestId, guestName, classification: r[classificationIdx], type: r[typeIdx] });
  }

  const [followups, completedRecords] = await Promise.all([
    fetchRecordsByStatus(STATUS.followup),
    fetchRecordsByStatus(STATUS.completed),
  ]);
  const all = [...followups, ...completedRecords];

  // Additive only - a reconciliation report may cover only part of the
  // outcomes universe (a date range, a partial HMIS export, a small test
  // file), so a record not mentioned in THIS upload doesn't mean "not a
  // match" - it may just mean "not in this particular report." Clearing
  // possible_match for everything not matched here would silently erase
  // real flags set by an earlier, more complete upload. Only ever set
  // possible_match to true for what matches; a wrongly-flagged record gets
  // cleared individually via its own dismiss button (dismissPossibleMatch),
  // not by a later upload superseding it in bulk.
  const matchedIds = [];
  const matches = [];
  all.forEach((r) => {
    const rec = { guestId: r.guestId, guestName: r.guest, classification: r.classification, type: r.type };
    if (reportRecords.some((rep) => outcomesMightMatch(rec, rep))) {
      matchedIds.push(r.id);
      matches.push({ ...r, sourceTable: r.status === STATUS.completed ? "Completed" : "Needs Follow-up" });
    }
  });

  if (matchedIds.length > 0) {
    await supabaseClient.from("outcomes").update({ possible_match: true }).in("id", matchedIds);
  }

  // No-op if the main tables aren't on this page (they're not, on
  // reconcile.html) -- both render functions guard on missing elements. The
  // flags are already persisted in Supabase regardless, so the main
  // Outcomes page will show them on next load.
  await renderAll();

  resultsTbody.innerHTML = "";
  countEl.textContent = matches.length;
  resultsSection.style.display = "block";

  if (matches.length === 0) {
    messageEl.textContent = "Compared against " + (rows.length - 1) + " report row(s) — no possible matches found.";
    return;
  }

  messageEl.textContent =
    "Compared against " + (rows.length - 1) + " report row(s) — flagged on the main Outcomes page too, marked with a ⚠.";

  matches.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge">${escapeHtml(r.sourceTable)}</span></td>
      <td><span class="id-tag">${escapeHtml(r.guestId)}</span></td>
      <td>${escapeHtml(r.guest)}</td>
      <td><span class="badge">${escapeHtml(r.classification)}</span></td>
      <td><span class="type-text">${escapeHtml(r.type)}</span></td>
      <td>${escapeHtml(r.date)}</td>`;
    resultsTbody.appendChild(tr);
  });
}

// ---------- init ----------

document.addEventListener("DOMContentLoaded", () => {
  const storedHighlight = sessionStorage.getItem(HIGHLIGHT_STORAGE_KEY);
  if (storedHighlight) {
    highlightId = storedHighlight;
    sessionStorage.removeItem(HIGHLIGHT_STORAGE_KEY);
  }

  wireCurrentUserButton();
  wireFollowupTable();
  wireCompletedTable();
  wireFollowupLaterToggle();
  wireSortControls();
  renderAll();
  wireAddForm();
  wireDragAndDrop();
  wireReconcileForm();
});
