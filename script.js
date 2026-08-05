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
        <td><input type="text" data-field="classification" value="${escapeAttr(r.classification)}"></td>
        <td><input type="text" data-field="type" value="${escapeAttr(r.type)}"></td>
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
          <button class="complete-btn" data-id="${r.id}">Mark Complete</button>
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
        <td><input type="text" data-field="classification" value="${escapeAttr(r.classification)}"></td>
        <td><input type="text" data-field="type" value="${escapeAttr(r.type)}"></td>
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
    }
  });

  tbody.addEventListener("change", (e) => {
    if (!e.target.classList.contains("verified-checkbox")) return;
    const id = e.target.dataset.id;
    if (!e.target.checked) return;
    if (!confirm("Mark as verified in the spreadsheet and remove it from this list?")) {
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
