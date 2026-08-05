// Outcomes Review Tool — shared logic for index.html and add.html
// Data is stored in the browser's localStorage (per-browser, local to this machine).

const STORAGE_KEYS = {
  completed: "outcomesTool_completed",
  followup: "outcomesTool_followup",
};

function loadRecords(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    return [];
  }
}

function saveRecords(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
}

function makeId() {
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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

// ---------- index.html: the two tables ----------

let editingFollowupId = null;
let editingCompletedId = null;

function renderFollowup() {
  const tableEl = document.getElementById("followup-table");
  if (!tableEl) return;
  const records = loadRecords(STORAGE_KEYS.followup);
  const tbody = tableEl.querySelector("tbody");
  const emptyEl = document.getElementById("followup-empty");
  const countEl = document.getElementById("followup-count");
  if (countEl) countEl.textContent = records.length;
  tbody.innerHTML = "";

  if (records.length === 0) {
    tableEl.closest(".table-scroll").style.display = "none";
    emptyEl.style.display = "block";
    return;
  }
  tableEl.closest(".table-scroll").style.display = "block";
  emptyEl.style.display = "none";

  records.forEach((r) => {
    const tr = document.createElement("tr");
    if (editingFollowupId === r.id) {
      tr.innerHTML = `
        <td><input type="text" data-field="guestId" value="${escapeAttr(r.guestId)}"></td>
        <td><input type="text" data-field="guest" value="${escapeAttr(r.guest)}"></td>
        <td><select data-field="classification" class="classification-select">${classificationOptionsHtml(r.classification)}</select></td>
        <td><select data-field="type" class="type-select">${typeOptionsHtml(r.classification, r.type)}</select></td>
        <td><input type="date" data-field="date" value="${escapeAttr(r.date)}"></td>
        <td><input type="text" data-field="caseManager" value="${escapeAttr(r.caseManager)}"></td>
        <td><textarea data-field="sourceSnippet">${escapeHtml(r.sourceSnippet)}</textarea></td>
        <td><textarea data-field="notes">${escapeHtml(r.notes)}</textarea></td>
        <td class="actions">
          <button class="save-btn btn-primary" data-id="${r.id}">Save</button>
          <button class="cancel-btn" data-id="${r.id}">Cancel</button>
        </td>`;
    } else {
      tr.innerHTML = `
        <td><span class="id-tag">${escapeHtml(r.guestId)}</span></td>
        <td>${escapeHtml(r.guest)}</td>
        <td><span class="badge">${escapeHtml(r.classification)}</span></td>
        <td>${escapeHtml(r.type)}</td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.caseManager)}</td>
        <td class="truncate" title="${escapeAttr(r.sourceSnippet)}">${escapeHtml(r.sourceSnippet)}</td>
        <td class="truncate" title="${escapeAttr(r.notes)}">${escapeHtml(r.notes)}</td>
        <td class="actions">
          <button class="complete-btn" data-id="${r.id}">Move to Completed</button>
          <button class="edit-btn" data-id="${r.id}">Edit</button>
          <button class="delete-btn" data-id="${r.id}">Delete</button>
        </td>`;
    }
    tbody.appendChild(tr);
  });
}

function renderCompleted() {
  const tableEl = document.getElementById("completed-table");
  if (!tableEl) return;
  const records = loadRecords(STORAGE_KEYS.completed);
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

  records.forEach((r) => {
    const tr = document.createElement("tr");
    if (editingCompletedId === r.id) {
      tr.innerHTML = `
        <td><input type="text" data-field="guestId" value="${escapeAttr(r.guestId)}"></td>
        <td><input type="text" data-field="guest" value="${escapeAttr(r.guest)}"></td>
        <td><select data-field="classification" class="classification-select">${classificationOptionsHtml(r.classification)}</select></td>
        <td><select data-field="type" class="type-select">${typeOptionsHtml(r.classification, r.type)}</select></td>
        <td><input type="date" data-field="date" value="${escapeAttr(r.date)}"></td>
        <td><input type="text" data-field="caseManager" value="${escapeAttr(r.caseManager)}"></td>
        <td><textarea data-field="sourceSnippet">${escapeHtml(r.sourceSnippet)}</textarea></td>
        <td><textarea data-field="notes">${escapeHtml(r.notes)}</textarea></td>
        <td class="checkbox-cell">&mdash;</td>
        <td class="actions">
          <button class="save-btn btn-primary" data-id="${r.id}">Save</button>
          <button class="cancel-btn" data-id="${r.id}">Cancel</button>
        </td>`;
    } else {
      tr.innerHTML = `
        <td><span class="id-tag">${escapeHtml(r.guestId)}</span></td>
        <td>${escapeHtml(r.guest)}</td>
        <td><span class="badge">${escapeHtml(r.classification)}</span></td>
        <td>${escapeHtml(r.type)}</td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.caseManager)}</td>
        <td class="truncate" title="${escapeAttr(r.sourceSnippet)}">${escapeHtml(r.sourceSnippet)}</td>
        <td class="truncate" title="${escapeAttr(r.notes)}">${escapeHtml(r.notes)}</td>
        <td class="checkbox-cell">
          <input type="checkbox" class="verified-checkbox" data-id="${r.id}">
        </td>
        <td class="actions">
          <button class="revert-btn" data-id="${r.id}">Move to Follow-up</button>
          <button class="edit-btn" data-id="${r.id}">Edit</button>
          <button class="delete-btn" data-id="${r.id}">Delete</button>
        </td>`;
    }
    tbody.appendChild(tr);
  });
}

function readRowInputs(tr) {
  const fields = {};
  tr.querySelectorAll("[data-field]").forEach((el) => {
    fields[el.dataset.field] = el.value;
  });
  return fields;
}

function wireFollowupTable() {
  const tableEl = document.getElementById("followup-table");
  if (!tableEl) return;
  const tbody = tableEl.querySelector("tbody");

  tbody.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("edit-btn")) {
      editingFollowupId = id;
      renderFollowup();
    } else if (e.target.classList.contains("cancel-btn")) {
      editingFollowupId = null;
      renderFollowup();
    } else if (e.target.classList.contains("save-btn")) {
      const records = loadRecords(STORAGE_KEYS.followup);
      const idx = records.findIndex((r) => r.id === id);
      if (idx !== -1) {
        const fields = readRowInputs(e.target.closest("tr"));
        records[idx] = { ...records[idx], ...fields };
        saveRecords(STORAGE_KEYS.followup, records);
      }
      editingFollowupId = null;
      renderFollowup();
    } else if (e.target.classList.contains("delete-btn")) {
      if (!confirm("Delete this follow-up record? This can't be undone.")) return;
      const records = loadRecords(STORAGE_KEYS.followup).filter((r) => r.id !== id);
      saveRecords(STORAGE_KEYS.followup, records);
      renderFollowup();
    } else if (e.target.classList.contains("complete-btn")) {
      const followups = loadRecords(STORAGE_KEYS.followup);
      const idx = followups.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const [record] = followups.splice(idx, 1);
      saveRecords(STORAGE_KEYS.followup, followups);

      const completed = loadRecords(STORAGE_KEYS.completed);
      completed.push({ ...record, verified: false });
      saveRecords(STORAGE_KEYS.completed, completed);

      renderFollowup();
      renderCompleted();
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

  tbody.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("edit-btn")) {
      editingCompletedId = id;
      renderCompleted();
    } else if (e.target.classList.contains("cancel-btn")) {
      editingCompletedId = null;
      renderCompleted();
    } else if (e.target.classList.contains("save-btn")) {
      const records = loadRecords(STORAGE_KEYS.completed);
      const idx = records.findIndex((r) => r.id === id);
      if (idx !== -1) {
        const fields = readRowInputs(e.target.closest("tr"));
        records[idx] = { ...records[idx], ...fields };
        saveRecords(STORAGE_KEYS.completed, records);
      }
      editingCompletedId = null;
      renderCompleted();
    } else if (e.target.classList.contains("delete-btn")) {
      if (!confirm("Delete this completed record? This can't be undone.")) return;
      const records = loadRecords(STORAGE_KEYS.completed).filter((r) => r.id !== id);
      saveRecords(STORAGE_KEYS.completed, records);
      renderCompleted();
    } else if (e.target.classList.contains("revert-btn")) {
      const completed = loadRecords(STORAGE_KEYS.completed);
      const idx = completed.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const [record] = completed.splice(idx, 1);
      saveRecords(STORAGE_KEYS.completed, completed);

      delete record.verified;
      const followups = loadRecords(STORAGE_KEYS.followup);
      followups.push(record);
      saveRecords(STORAGE_KEYS.followup, followups);

      renderCompleted();
      renderFollowup();
    }
  });

  tbody.addEventListener("change", (e) => {
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
    const records = loadRecords(STORAGE_KEYS.completed).filter((r) => r.id !== id);
    saveRecords(STORAGE_KEYS.completed, records);
    renderCompleted();
  });
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const record = {
      id: makeId(),
      guestId: data.get("guestId").trim(),
      guest: data.get("guest").trim(),
      classification: data.get("classification").trim(),
      type: data.get("type").trim(),
      date: data.get("date"),
      caseManager: data.get("caseManager").trim(),
      sourceSnippet: data.get("sourceSnippet").trim(),
      notes: data.get("notes").trim(),
    };

    const table = data.get("table");
    if (table === "completed") {
      record.verified = false;
      const records = loadRecords(STORAGE_KEYS.completed);
      records.push(record);
      saveRecords(STORAGE_KEYS.completed, records);
    } else {
      const records = loadRecords(STORAGE_KEYS.followup);
      records.push(record);
      saveRecords(STORAGE_KEYS.followup, records);
    }

    window.location.href = "index.html";
  });
}

// ---------- init ----------

document.addEventListener("DOMContentLoaded", () => {
  wireFollowupTable();
  wireCompletedTable();
  renderFollowup();
  renderCompleted();
  wireAddForm();
});
