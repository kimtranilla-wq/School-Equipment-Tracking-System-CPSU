"use strict";

// 1. Data
const STORAGE_KEYS = {
  equipment: "equipmentList",
  activities: "activityStack",
  maintenance: "maintenanceQueue"
};
const STATUSES = ["Available", "In Use", "Under Maintenance", "Lost"];
const CONDITIONS = ["New", "Good", "Fair", "Damaged"];
const sampleEquipment = [
  { id: "EQ001", name: "Dell Laptop", category: "Computer", brand: "Dell", serialNumber: "DL001", quantity: 10, purchaseDate: "2026-01-15", purchasePrice: 35000, location: "Computer Laboratory", assignedTo: "IT Department", status: "Available", condition: "Good" },
  { id: "EQ002", name: "Epson Projector", category: "Projector", brand: "Epson", serialNumber: "EP001", quantity: 5, purchaseDate: "2025-08-20", purchasePrice: 28000, location: "Room 201", assignedTo: "Faculty", status: "In Use", condition: "Good" },
  { id: "EQ003", name: "HP Printer", category: "Printer", brand: "HP", serialNumber: "HP001", quantity: 3, purchaseDate: "2025-04-11", purchasePrice: 12000, location: "Administration Office", assignedTo: "Administration", status: "Under Maintenance", condition: "Fair" },
  { id: "EQ004", name: "Lenovo Desktop", category: "Computer", brand: "Lenovo", serialNumber: "LN001", quantity: 8, purchaseDate: "2026-02-03", purchasePrice: 32000, location: "Computer Laboratory", assignedTo: "IT Department", status: "Available", condition: "New" },
  { id: "EQ005", name: "BenQ Projector", category: "Projector", brand: "BenQ", serialNumber: "BQ001", quantity: 2, purchaseDate: "2024-09-16", purchasePrice: 26000, location: "Room 202", assignedTo: "Faculty", status: "Lost", condition: "Damaged" }
];

function loadArray(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Could not load ${key} from LocalStorage.`, error);
    return fallback;
  }
}

let equipmentList = loadArray(STORAGE_KEYS.equipment, sampleEquipment.map(record => ({ ...record })));
let activityStack = loadArray(STORAGE_KEYS.activities, []);
let maintenanceQueue = loadArray(STORAGE_KEYS.maintenance, []);
let toastTimer;
let lastFocusedElement = null;

// 2. LocalStorage
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEYS.equipment, JSON.stringify(equipmentList));
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activityStack));
    localStorage.setItem(STORAGE_KEYS.maintenance, JSON.stringify(maintenanceQueue));
    return true;
  } catch (error) {
    console.error("Could not save application data.", error);
    showToast("Browser storage is unavailable. Changes may not persist after closing this page.", true);
    return false;
  }
}

if (localStorage.getItem(STORAGE_KEYS.maintenance) === null) {
  maintenanceQueue = equipmentList.filter(record => record.status === "Under Maintenance").map(record => record.id);
}
maintenanceQueue = maintenanceQueue.filter(id => equipmentList.some(record => record.id === id && record.status === "Under Maintenance"));
saveData();

// 3. Login
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
document.getElementById("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("loginError");
  if (username === "admin" && password === "admin123") {
    error.hidden = true;
    loginScreen.hidden = true;
    appShell.hidden = false;
    renderAll();
    showToast("Login successful.");
    document.querySelector("[data-page='dashboard']").focus();
  } else {
    error.hidden = false;
    document.getElementById("password").focus();
  }
});
document.getElementById("exitButton").addEventListener("click", () => showToast("You can close this browser tab to exit."));
document.getElementById("logoutButton").addEventListener("click", () => {
  appShell.hidden = true;
  loginScreen.hidden = false;
  document.getElementById("loginForm").reset();
  document.getElementById("loginError").hidden = true;
  document.getElementById("username").focus();
});

// 4. Dashboard
function quantityForStatus(status) {
  return equipmentList.reduce((total, record) => total + (record.status === status ? Number(record.quantity) : 0), 0);
}

function renderDashboard() {
  const metrics = [
    ["TOTAL EQUIPMENT", equipmentList.reduce((total, record) => total + Number(record.quantity), 0), "units across all records", "#638bb0"],
    ["AVAILABLE", quantityForStatus("Available"), "units ready to use", "#4d9a73"],
    ["IN USE", quantityForStatus("In Use"), "units assigned", "#5687b7"],
    ["UNDER MAINTENANCE", quantityForStatus("Under Maintenance"), "units being serviced", "#d3a047"],
    ["LOST", quantityForStatus("Lost"), "units reported lost", "#c66d6d"]
  ];
  document.getElementById("dashboardMetrics").innerHTML = metrics.map(([label, value, detail, accent]) => `<article class="metric-card" style="--metric-accent:${accent}"><span class="metric-label">${label}</span><div class="metric-value">${value}</div><span class="metric-detail">${detail}</span></article>`).join("");
  const newestFirst = [...equipmentList].reverse().slice(0, 5);
  document.getElementById("dashboardTable").innerHTML = renderTable(newestFirst, false, "No equipment records found.");
}

// 5. Equipment CRUD
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function statusClass(status) {
  return `status-${String(status).toLowerCase().replaceAll(" ", "-")}`;
}

function renderTable(records, includeActions = true, emptyMessage = "No equipment records found.") {
  if (records.length === 0) return `<div class="empty-state">${escapeHTML(emptyMessage)}</div>`;
  const columns = ["ID", "Name", "Category", "Brand", "Serial Number", "Quantity", "Location", "Assigned To", "Status", "Condition"];
  if (includeActions) columns.push("Actions");
  const header = columns.map(column => `<th scope="col">${column}</th>`).join("");
  const rows = records.map(record => `<tr>
    <td class="id-cell">${escapeHTML(record.id)}</td>
    <td class="item-cell"><strong>${escapeHTML(record.name)}</strong><small>${escapeHTML(record.purchaseDate || "No purchase date")}</small></td>
    <td>${escapeHTML(record.category)}</td><td>${escapeHTML(record.brand)}</td><td>${escapeHTML(record.serialNumber)}</td>
    <td>${escapeHTML(record.quantity)}</td><td>${escapeHTML(record.location)}</td><td>${escapeHTML(record.assignedTo)}</td>
    <td><span class="status-badge ${statusClass(record.status)}">${escapeHTML(record.status)}</span></td>
    <td><span class="condition-label">${escapeHTML(record.condition)}</span></td>
    ${includeActions ? `<td><div class="action-buttons"><button class="table-action" data-action="view" data-id="${escapeHTML(record.id)}">View</button><button class="table-action" data-action="edit" data-id="${escapeHTML(record.id)}">Edit</button><button class="table-action" data-action="status" data-id="${escapeHTML(record.id)}">Status</button><button class="table-action danger" data-action="delete" data-id="${escapeHTML(record.id)}">Delete</button></div></td>` : ""}
  </tr>`).join("");
  return `<table class="data-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

function equipmentFormMarkup(record = {}, editing = false) {
  const textField = (name, label, value = "", required = true, type = "text", extra = "") => `<label>${label}<input name="${name}" type="${type}" value="${escapeHTML(value)}" ${required ? "required" : ""} ${extra}></label>`;
  const selectField = (name, label, options, value) => `<label>${label}<select name="${name}" required>${options.map(option => `<option value="${escapeHTML(option)}" ${option === value ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}</select></label>`;
  return `<form class="equipment-form" data-equipment-form="${editing ? "edit" : "add"}" ${editing ? `data-edit-id="${escapeHTML(record.id)}"` : ""}>
    ${editing ? `<p class="form-section-title">Editing ${escapeHTML(record.id)} · ID cannot be changed</p>` : `<p class="form-section-title">Identification</p>`}
    ${editing ? `<div class="readonly-field"><label>Equipment ID<input value="${escapeHTML(record.id)}" readonly></label></div>` : textField("id", "Equipment ID", "", true, "text", "placeholder=\"e.g. EQ006\"")}
    ${textField("name", "Equipment name", record.name)}${textField("category", "Category", record.category)}${textField("brand", "Brand", record.brand)}${textField("serialNumber", "Serial number", record.serialNumber)}
    <p class="form-section-title">Purchase &amp; assignment</p>
    ${textField("quantity", "Quantity", record.quantity ?? "", true, "number", "min=\"1\" step=\"1\"")}${textField("purchaseDate", "Purchase date", record.purchaseDate, true, "date")}${textField("purchasePrice", "Purchase price", record.purchasePrice ?? "", true, "number", "min=\"0\" step=\"0.01\"")}
    ${textField("location", "Current location", record.location)}${textField("assignedTo", "Assigned to", record.assignedTo)}${selectField("status", "Status", STATUSES, record.status || "Available")}${selectField("condition", "Condition", CONDITIONS, record.condition || "Good")}
    <div class="form-actions"><button class="button button-quiet" type="reset">Clear form</button><button class="button button-outline" type="button" data-cancel-form>Cancel</button><button class="button button-primary" type="submit">${editing ? "Save changes" : "Save equipment"}</button></div>
  </form>`;
}

document.getElementById("addFormMount").innerHTML = equipmentFormMarkup();
document.addEventListener("submit", event => {
  const form = event.target.closest("[data-equipment-form]");
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const quantity = Number(values.quantity);
  const price = Number(values.purchasePrice);
  if (!Number.isInteger(quantity) || quantity <= 0) return showToast("Quantity must be a whole number greater than 0.", true);
  if (!Number.isFinite(price) || price < 0) return showToast("Purchase price cannot be negative.", true);
  if (!STATUSES.includes(values.status) || !CONDITIONS.includes(values.condition)) return showToast("Select a valid status and condition.", true);
  const editing = form.dataset.equipmentForm === "edit";
  if (!editing && equipmentList.some(record => record.id.toLowerCase() === values.id.trim().toLowerCase())) return showToast("Equipment ID must be unique.", true);
  const record = {
    id: editing ? form.dataset.editId : values.id.trim(), name: values.name.trim(), category: values.category.trim(), brand: values.brand.trim(),
    serialNumber: values.serialNumber.trim(), quantity, purchaseDate: values.purchaseDate, purchasePrice: price,
    location: values.location.trim(), assignedTo: values.assignedTo.trim(), status: values.status, condition: values.condition
  };
  if (editing) {
    const index = equipmentList.findIndex(item => item.id === form.dataset.editId);
    if (index < 0) return showToast("That equipment record no longer exists.", true);
    equipmentList[index] = record;
    addActivity(`Updated ${record.name} ${record.id}`);
    syncMaintenanceStatus(record);
    closeModal();
    showToast("Equipment updated successfully.");
  } else {
    equipmentList.push(record);
    addActivity(`Added ${record.name} ${record.id}`);
    syncMaintenanceStatus(record);
    form.reset();
    showToast("Equipment added successfully.");
  }
  saveData();
  renderAll();
  if (!editing) navigateTo("equipment");
});

// 6. Search
function linearSearch(keyword, records = equipmentList) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const matches = [];
  if (!normalizedKeyword) return matches;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const searchableValues = [record.id, record.name, record.category, record.serialNumber, record.location, record.status];
    for (let fieldIndex = 0; fieldIndex < searchableValues.length; fieldIndex += 1) {
      if (String(searchableValues[fieldIndex]).toLowerCase().includes(normalizedKeyword)) {
        matches.push(record);
        break;
      }
    }
  }
  return matches;
}

document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  const keyword = document.getElementById("searchInput").value;
  if (!keyword.trim()) {
    document.getElementById("searchFeedback").textContent = "Enter a keyword to search all equipment records.";
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  const matches = linearSearch(keyword);
  document.getElementById("searchFeedback").textContent = `Search Algorithm: Linear Search · ${matches.length} equipment record(s) found.`;
  document.getElementById("searchResults").innerHTML = renderTable(matches, true, "No matching equipment found.");
});
document.getElementById("clearSearch").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchFeedback").textContent = "Enter a keyword to search all equipment records.";
  document.getElementById("searchResults").innerHTML = "";
});

// 7. Sorting
function bubbleSort(records, field, direction = "asc") {
  const sorted = records.map(record => ({ ...record }));
  const multiplier = direction === "desc" ? -1 : 1;
  for (let end = sorted.length - 1; end > 0; end -= 1) {
    let swapped = false;
    for (let index = 0; index < end; index += 1) {
      let comparison;
      const left = sorted[index][field];
      const right = sorted[index + 1][field];
      if (typeof left === "number" && typeof right === "number") comparison = left - right;
      else comparison = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      if (comparison * multiplier > 0) {
        [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return sorted;
}

document.getElementById("sortForm").addEventListener("submit", event => {
  event.preventDefault();
  const field = document.getElementById("sortField").value;
  const direction = new FormData(event.currentTarget).get("sortDirection");
  const sorted = bubbleSort(equipmentList, field, direction);
  document.getElementById("sortFeedback").textContent = `Sorted using Bubble Sort · ${fieldLabel(field)} · ${direction === "asc" ? "Ascending" : "Descending"}.`;
  document.getElementById("sortResults").innerHTML = renderTable(sorted, true);
});

function fieldLabel(field) {
  return ({ id: "Equipment ID", name: "Equipment name", category: "Category", quantity: "Quantity", status: "Status", location: "Location" })[field] || field;
}

// 8. Stack
function pushActivity(message) {
  activityStack.push({ message, timestamp: new Date().toISOString() });
  if (activityStack.length > 200) activityStack.shift();
}
function popActivity() { return activityStack.pop() || null; }
function peekActivity() { return activityStack.length ? activityStack[activityStack.length - 1] : null; }
function addActivity(message) { pushActivity(message); }

// 9. Queue
function enqueueMaintenance(id) {
  if (!maintenanceQueue.includes(id)) maintenanceQueue.push(id);
}
function dequeueMaintenance() { return maintenanceQueue.shift() || null; }
function peekMaintenance() { return maintenanceQueue.length ? maintenanceQueue[0] : null; }

function syncMaintenanceStatus(record) {
  maintenanceQueue = maintenanceQueue.filter(id => id !== record.id);
  if (record.status === "Under Maintenance") enqueueMaintenance(record.id);
}

// 10. Binary Search Tree
class BSTNode {
  constructor(record) {
    this.id = record.id;
    this.record = record;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() { this.root = null; }
  insert(record) {
    const newNode = new BSTNode(record);
    if (!this.root) { this.root = newNode; return; }
    let current = this.root;
    while (true) {
      if (record.id.localeCompare(current.id, undefined, { numeric: true }) < 0) {
        if (!current.left) { current.left = newNode; return; }
        current = current.left;
      } else if (record.id.localeCompare(current.id, undefined, { numeric: true }) > 0) {
        if (!current.right) { current.right = newNode; return; }
        current = current.right;
      } else return;
    }
  }
  search(id) {
    let current = this.root;
    while (current) {
      const comparison = id.localeCompare(current.id, undefined, { numeric: true, sensitivity: "base" });
      if (comparison === 0) return current.record;
      current = comparison < 0 ? current.left : current.right;
    }
    return null;
  }
  inOrderTraversal() {
    const ids = [];
    const visit = node => {
      if (!node) return;
      visit(node.left);
      ids.push(node.id);
      visit(node.right);
    };
    visit(this.root);
    return ids;
  }
  branchSummary() {
    if (!this.root) return "";
    const parts = [];
    const visit = (node, depth) => {
      if (!node) return;
      if (node.left) parts.push(`${"  ".repeat(depth)}← ${node.left.id} (left of ${node.id})`);
      if (node.right) parts.push(`${"  ".repeat(depth)}→ ${node.right.id} (right of ${node.id})`);
      visit(node.left, depth + 1);
      visit(node.right, depth + 1);
    };
    visit(this.root, 0);
    return parts.join("<br>");
  }
}

function buildBST() {
  const tree = new BinarySearchTree();
  for (const record of equipmentList) tree.insert(record);
  return tree;
}

function binarySearchById(id) {
  const sortedById = bubbleSort(equipmentList, "id", "asc");
  let low = 0;
  let high = sortedById.length - 1;
  const target = id.trim().toLowerCase();
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const comparison = sortedById[middle].id.toLowerCase().localeCompare(target, undefined, { numeric: true });
    if (comparison === 0) return sortedById[middle];
    if (comparison < 0) low = middle + 1;
    else high = middle - 1;
  }
  return null;
}

document.getElementById("bstSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = document.getElementById("bstSearchInput").value.trim();
  const found = buildBST().search(id);
  const binaryFound = binarySearchById(id);
  document.getElementById("bstSearchResult").textContent = found ? `BST Search Result: ${found.id} · ${found.name}` : `BST Search Result: no equipment found for ${id}.`;
  document.getElementById("binarySearchResult").textContent = binaryFound ? `Binary Search Result: ${binaryFound.id} · ${binaryFound.name}` : `Binary Search Result: no equipment found for ${id}.`;
});

function renderBST() {
  const tree = buildBST();
  document.getElementById("bstRoot").textContent = tree.root ? `${tree.root.id} · ${tree.root.record.name}` : "Empty tree";
  document.getElementById("bstBranches").innerHTML = tree.branchSummary() || "Insert records to see left and right branches.";
  document.getElementById("bstTraversal").textContent = tree.inOrderTraversal().join(" → ") || "No equipment IDs";
}

document.getElementById("page-dsa").addEventListener("click", event => {
  const target = event.target.closest("[data-page='dsa']");
  if (target) renderBST();
});

// 11. Reports
function renderReports() {
  const statusCards = ["Total equipment", ...STATUSES];
  const statusValues = [equipmentList.reduce((total, record) => total + Number(record.quantity), 0), ...STATUSES.map(quantityForStatus)];
  const conditions = CONDITIONS.map(condition => ({ condition, quantity: equipmentList.reduce((total, record) => total + (record.condition === condition ? Number(record.quantity) : 0), 0) }));
  const statusMarkup = statusCards.map((label, index) => `<article class="report-card"><h3>${escapeHTML(label)}</h3><strong>${statusValues[index]}</strong><small>units</small></article>`).join("");
  const conditionMarkup = conditions.map(item => `<article class="report-card"><h3>${escapeHTML(item.condition)}</h3><strong>${item.quantity}</strong><small>units by condition</small></article>`).join("");
  document.getElementById("reportMetrics").innerHTML = statusMarkup + conditionMarkup;
  document.getElementById("reportTable").innerHTML = renderTable(equipmentList, false);
}
document.getElementById("printReportButton").addEventListener("click", () => window.print());

// 12. UI functions
const pageNames = { dashboard: "Dashboard", equipment: "Equipment", add: "Add equipment", search: "Search", sort: "Sort equipment", maintenance: "Maintenance queue", history: "Activity history", reports: "Reports", dsa: "DSA demonstration" };

function navigateTo(page) {
  if (!pageNames[page]) return;
  document.querySelectorAll(".page-section").forEach(section => { section.hidden = section.id !== `page-${page}`; });
  document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    const active = button.dataset.page === page;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.getElementById("currentPageName").textContent = pageNames[page];
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("menuButton").setAttribute("aria-expanded", "false");
  if (page === "dsa") renderBST();
  if (page === "maintenance") renderQueue();
  if (page === "history") renderHistory();
  if (page === "reports") renderReports();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => navigateTo(button.dataset.page)));
document.querySelectorAll("[data-page-link]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); navigateTo(link.dataset.pageLink); }));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigateTo(button.dataset.go)));

document.getElementById("menuButton").addEventListener("click", event => {
  const open = document.getElementById("sidebar").classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", event => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar.classList.contains("open") && !sidebar.contains(event.target) && !event.target.closest("#menuButton")) {
    sidebar.classList.remove("open");
    document.getElementById("menuButton").setAttribute("aria-expanded", "false");
  }
});

function renderAll() {
  renderDashboard();
  renderEquipment();
  renderQueue();
  renderHistory();
  renderReports();
  renderBST();
}

function renderEquipment(filter = "") {
  const records = filter ? linearSearch(filter) : equipmentList;
  document.getElementById("equipmentTable").innerHTML = renderTable(records, true);
  document.getElementById("equipmentCount").textContent = `${records.length} equipment record(s) · distinct records`;
}

document.getElementById("tableFilter").addEventListener("input", event => renderEquipment(event.currentTarget.value.trim()));

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const record = equipmentList.find(item => item.id === actionButton.dataset.id);
    if (!record) return;
    if (actionButton.dataset.action === "view") showDetails(record);
    if (actionButton.dataset.action === "edit") showEdit(record);
    if (actionButton.dataset.action === "status") showStatusEditor(record);
    if (actionButton.dataset.action === "delete") showDeleteConfirmation(record);
  }
  if (event.target.closest("[data-cancel-form]")) navigateTo("equipment");
});

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function openModal({ eyebrow = "EQUIPMENT", title, content, actions = [] }) {
  lastFocusedElement = document.activeElement;
  document.getElementById("modalEyebrow").textContent = eyebrow;
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalContent").innerHTML = content;
  document.getElementById("modalActions").innerHTML = actions.map(action => `<button class="button ${action.className}" type="button" data-modal-action="${action.action}">${action.label}</button>`).join("");
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.hidden = false;
  const focusTarget = backdrop.querySelector("input:not([readonly]), select, button");
  if (focusTarget) focusTarget.focus();
}

function closeModal() {
  document.getElementById("modalBackdrop").hidden = true;
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
}

document.getElementById("closeModalButton").addEventListener("click", closeModal);
document.getElementById("modalBackdrop").addEventListener("click", event => { if (event.target.id === "modalBackdrop") closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !document.getElementById("modalBackdrop").hidden) closeModal(); });

function showDetails(record) {
  const fields = [["Equipment ID", record.id], ["Equipment name", record.name], ["Category", record.category], ["Brand", record.brand], ["Serial number", record.serialNumber], ["Quantity", record.quantity], ["Purchase date", record.purchaseDate], ["Purchase price", formatCurrency(record.purchasePrice)], ["Current location", record.location], ["Assigned to", record.assignedTo], ["Status", record.status], ["Condition", record.condition]];
  openModal({ title: record.name, content: `<div id="modalDescription" class="detail-grid">${fields.map(([label, value]) => `<div class="detail-field"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></div>`).join("")}</div>`, actions: [{ action: "close", label: "Close", className: "button-outline" }] });
}

function showEdit(record) {
  openModal({ title: "Edit equipment", content: equipmentFormMarkup(record, true), actions: [] });
  const form = document.querySelector("#modalContent [data-equipment-form]");
  form.classList.add("modal-form");
  form.querySelectorAll(".form-section-title").forEach(title => { title.style.gridColumn = "1 / -1"; });
  form.querySelectorAll(".form-actions").forEach(actions => { actions.remove(); });
  document.getElementById("modalActions").innerHTML = `<button class="button button-quiet" type="button" data-modal-action="close">Cancel</button><button class="button button-primary" type="submit" form="${form.id = "editEquipmentForm"}">Save changes</button>`;
}

function showStatusEditor(record) {
  const statusOptions = STATUSES.map(status => `<option ${record.status === status ? "selected" : ""}>${status}</option>`).join("");
  const conditionOptions = CONDITIONS.map(condition => `<option ${record.condition === condition ? "selected" : ""}>${condition}</option>`).join("");
  openModal({ title: `Update status · ${record.id}`, content: `<form id="statusForm" class="modal-form" data-status-id="${escapeHTML(record.id)}"><label>Status<select name="status">${statusOptions}</select></label><label>Condition<select name="condition">${conditionOptions}</select></label></form>`, actions: [{ action: "close", label: "Cancel", className: "button-quiet" }, { action: "save-status", label: "Save status", className: "button-primary" }] });
}

function showDeleteConfirmation(record) {
  openModal({ eyebrow: "CONFIRM DELETE", title: "Delete equipment?", content: `<p id="modalDescription" class="confirm-copy">Are you sure you want to delete this equipment? <strong>${escapeHTML(record.name)} (${escapeHTML(record.id)})</strong> will be removed from the register.</p>`, actions: [{ action: "close", label: "Cancel", className: "button-quiet" }, { action: "delete-record", label: "Delete", className: "button-primary" }] });
  document.querySelector('[data-modal-action="delete-record"]').dataset.id = record.id;
}

document.getElementById("modalActions").addEventListener("click", event => {
  const button = event.target.closest("[data-modal-action]");
  if (!button) return;
  const action = button.dataset.modalAction;
  if (action === "close") closeModal();
  if (action === "delete-record") {
    const record = equipmentList.find(item => item.id === button.dataset.id);
    if (record) {
      equipmentList = equipmentList.filter(item => item.id !== record.id);
      maintenanceQueue = maintenanceQueue.filter(id => id !== record.id);
      addActivity(`Deleted ${record.name} ${record.id}`);
      saveData();
      renderAll();
      showToast("Equipment deleted successfully.");
    }
    closeModal();
  }
  if (action === "save-status") {
    const form = document.getElementById("statusForm");
    const record = equipmentList.find(item => item.id === form.dataset.statusId);
    if (!record) return closeModal();
    const values = new FormData(form);
    record.status = values.get("status");
    record.condition = values.get("condition");
    syncMaintenanceStatus(record);
    addActivity(`Updated status for ${record.name} ${record.id}`);
    saveData();
    renderAll();
    closeModal();
    showToast("Equipment status updated successfully.");
  }
});

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { style: "currency", currency: "PHP", maximumFractionDigits: 2 }) : "—";
}

// 13. Validation
document.addEventListener("click", event => {
  const modalAction = event.target.closest("[data-modal-action='close']");
  if (modalAction) closeModal();
});

// 14. Event listeners: queue and history controls
function renderQueue() {
  const select = document.getElementById("queueEquipmentSelect");
  const currentValue = select.value;
  const eligible = equipmentList.filter(record => record.status !== "Under Maintenance" && !maintenanceQueue.includes(record.id));
  select.innerHTML = eligible.length ? eligible.map(record => `<option value="${escapeHTML(record.id)}">${escapeHTML(record.id)} · ${escapeHTML(record.name)}</option>`).join("") : `<option value="">No eligible equipment</option>`;
  if (eligible.some(record => record.id === currentValue)) select.value = currentValue;
  document.getElementById("queueSize").textContent = `${maintenanceQueue.length} request${maintenanceQueue.length === 1 ? "" : "s"}`;
  const nextId = peekMaintenance();
  const next = equipmentList.find(record => record.id === nextId);
  document.getElementById("queuePeek").innerHTML = next ? `Next request (peek): <strong>${escapeHTML(next.id)} · ${escapeHTML(next.name)}</strong>` : "Next request (peek): queue is empty.";
  document.getElementById("queueList").innerHTML = maintenanceQueue.length ? maintenanceQueue.map((id, index) => {
    const record = equipmentList.find(item => item.id === id);
    return record ? `<article class="queue-row"><span class="queue-position">${String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHTML(record.id)} · ${escapeHTML(record.name)}</strong><small>${escapeHTML(record.category)} · ${escapeHTML(record.condition)} condition</small></span><span class="status-badge status-under-maintenance">${escapeHTML(record.status)}</span></article>` : "";
  }).join("") : `<div class="empty-state">The maintenance queue is empty.</div>`;
}

document.getElementById("enqueueButton").addEventListener("click", () => {
  const id = document.getElementById("queueEquipmentSelect").value;
  const record = equipmentList.find(item => item.id === id);
  if (!record) return showToast("There is no equipment available to add.", true);
  enqueueMaintenance(id);
  if (record.status !== "Under Maintenance") record.status = "Under Maintenance";
  record.condition = record.condition || "Good";
  addActivity(`Added ${record.id} to maintenance queue`);
  saveData();
  renderAll();
  showToast("Maintenance request added to the queue.");
});

document.getElementById("processQueueButton").addEventListener("click", () => {
  const id = dequeueMaintenance();
  if (!id) return showToast("The maintenance queue is empty.", true);
  const record = equipmentList.find(item => item.id === id);
  if (record && record.status === "Under Maintenance") record.status = "Available";
  addActivity(`Processed maintenance request ${id}`);
  saveData();
  renderAll();
  showToast("Maintenance request processed.");
});

document.getElementById("clearQueueButton").addEventListener("click", () => {
  maintenanceQueue = [];
  saveData();
  renderQueue();
  showToast("Maintenance queue cleared.");
});

function renderHistory() {
  const newest = peekActivity();
  document.getElementById("historyPeek").innerHTML = newest ? `Peek · <strong>${escapeHTML(newest.message)}</strong>` : "Peek · activity stack is empty.";
  document.getElementById("historyList").innerHTML = activityStack.length ? activityStack.slice().reverse().map((activity, index) => `<article class="history-row"><span class="history-index">${String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHTML(activity.message)}</strong><small>${new Date(activity.timestamp).toLocaleString()}</small></span><span class="condition-label">Most recent</span></article>`).join("") : `<div class="empty-state">No activity history yet.</div>`;
}

document.getElementById("popHistoryButton").addEventListener("click", () => {
  const activity = popActivity();
  if (!activity) return showToast("The activity stack is empty.", true);
  saveData();
  renderHistory();
  showToast("Latest activity removed from history.");
});
document.getElementById("clearHistoryButton").addEventListener("click", () => {
  activityStack = [];
  saveData();
  renderHistory();
  showToast("Activity history cleared.");
});

document.getElementById("modalContent").addEventListener("input", event => {
  if (event.target.name === "quantity" && Number(event.target.value) < 1) event.target.setCustomValidity("Quantity must be greater than zero.");
  else if (event.target.name === "quantity") event.target.setCustomValidity("");
  if (event.target.name === "purchasePrice" && Number(event.target.value) < 0) event.target.setCustomValidity("Price cannot be negative.");
  else if (event.target.name === "purchasePrice") event.target.setCustomValidity("");
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter" && event.target.matches("#searchInput")) document.getElementById("searchForm").requestSubmit();
});

renderDashboard();