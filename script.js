(function () {
  "use strict";

  const STORAGE_KEY = "budget-tracker-expenses";
  const CATEGORIES = ["Food", "Transport", "Entertainment", "Bills", "Shopping", "Other"];
  const CAT_COLORS = {
    Food: "#e87442",
    Transport: "#3b82d6",
    Entertainment: "#9b59e0",
    Bills: "#d4a017",
    Shopping: "#e0457a",
    Other: "#7a8494",
  };

  let expenses = loadExpenses();
  let filterCategory = "All";

  // DOM refs
  const form = document.getElementById("expense-form");
  const descInput = document.getElementById("description");
  const amountInput = document.getElementById("amount");
  const categoryInput = document.getElementById("category");
  const dateInput = document.getElementById("date");
  const filterSelect = document.getElementById("filter-category");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const expenseListEl = document.getElementById("expense-list");
  const totalEl = document.getElementById("total-amount");
  const countEl = document.getElementById("expense-count");
  const breakdownEl = document.getElementById("category-breakdown");
  const confirmModal = document.getElementById("confirm-modal");
  const modalCancel = document.getElementById("modal-cancel");
  const modalConfirm = document.getElementById("modal-confirm");
  const toastEl = document.getElementById("toast");

  // Set default date to today
  dateInput.value = new Date().toISOString().slice(0, 10);

  // ── Persistence ──
  function loadExpenses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  // ── Toast ──
  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
  }

  // ── Validation ──
  function clearErrors() {
    document.querySelectorAll(".error-msg").forEach((el) => (el.textContent = ""));
  }
  function setError(id, msg) {
    document.getElementById(id).textContent = msg;
  }
  function validateForm() {
    clearErrors();
    let valid = true;
    const desc = descInput.value.trim();
    const amt = parseFloat(amountInput.value);
    if (!desc) { setError("err-description", "Description is required"); valid = false; }
    else if (desc.length > 100) { setError("err-description", "Max 100 characters"); valid = false; }
    if (!amountInput.value || isNaN(amt) || amt <= 0) { setError("err-amount", "Enter a valid amount > 0"); valid = false; }
    else if (amt > 999999) { setError("err-amount", "Amount too large"); valid = false; }
    if (!categoryInput.value) { setError("err-category", "Pick a category"); valid = false; }
    if (!dateInput.value) { setError("err-date", "Pick a date"); valid = false; }
    return valid;
  }

  // ── Add Expense ──
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const amt = parseFloat(parseFloat(amountInput.value).toFixed(2));
    const desc = descInput.value.trim();

    expenses.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      description: desc,
      amount: amt,
      category: categoryInput.value,
      date: dateInput.value,
    });

    save();
    renderApp();
    showToast("Expense added — $" + amt.toFixed(2) + " for " + desc);

    // Reset form
    descInput.value = "";
    amountInput.value = "";
    categoryInput.value = "";
    dateInput.value = new Date().toISOString().slice(0, 10);
    clearErrors();
  });

  // ── Filter ──
  filterSelect.addEventListener("change", function () {
    filterCategory = this.value;
    renderList();
  });

  // ── Clear All ──
  clearAllBtn.addEventListener("click", function () {
    confirmModal.style.display = "flex";
  });
  modalCancel.addEventListener("click", function () {
    confirmModal.style.display = "none";
  });
  modalConfirm.addEventListener("click", function () {
    confirmModal.style.display = "none";
    expenses = [];
    save();
    renderApp();
    showToast("All expenses cleared");
  });
  // Close modal on backdrop click
  confirmModal.addEventListener("click", function (e) {
    if (e.target === confirmModal) confirmModal.style.display = "none";
  });

  // ── Delete ──
  function deleteExpense(id) {
    const exp = expenses.find((e) => e.id === id);
    expenses = expenses.filter((e) => e.id !== id);
    save();
    renderApp();
    if (exp) showToast('Deleted "' + exp.description + '"');
  }

  // ── Render ──
  function renderApp() {
    renderSummary();
    renderList();
  }

  function renderSummary() {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    totalEl.textContent = "$" + total.toFixed(2);
    countEl.textContent = expenses.length + " expense" + (expenses.length !== 1 ? "s" : "") + " logged";

    clearAllBtn.style.display = expenses.length > 0 ? "inline-flex" : "none";

    // Category breakdown
    const byCategory = {};
    expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

    const sorted = CATEGORIES.filter((c) => byCategory[c] > 0).sort((a, b) => byCategory[b] - byCategory[a]);

    if (sorted.length === 0) {
      breakdownEl.innerHTML = '<p class="card-meta">No expenses yet</p>';
      return;
    }

    let html = "";
    sorted.forEach(function (cat) {
      const amount = byCategory[cat];
      const pct = total > 0 ? (amount / total) * 100 : 0;
      html +=
        '<div class="breakdown-row">' +
          '<div class="breakdown-label">' +
            '<span class="breakdown-label-left">' +
              '<span class="cat-dot" style="background:' + CAT_COLORS[cat] + '"></span>' +
              '<span>' + cat + '</span>' +
            '</span>' +
            '<span class="breakdown-label-right">$' + amount.toFixed(2) + ' (' + pct.toFixed(0) + '%)</span>' +
          '</div>' +
          '<div class="progress-track">' +
            '<div class="progress-bar" style="width:' + pct + '%;background:' + CAT_COLORS[cat] + '"></div>' +
          '</div>' +
        '</div>';
    });
    breakdownEl.innerHTML = html;
  }

  function renderList() {
    const filtered = filterCategory === "All" ? expenses : expenses.filter((e) => e.category === filterCategory);

    if (filtered.length === 0) {
      const msg = expenses.length > 0 ? "No expenses in this category" : "No expenses yet — add one above!";
      expenseListEl.innerHTML = '<p class="card-meta center" style="padding:2.5rem 0">' + msg + "</p>";
      return;
    }

    let html = "";
    filtered.forEach(function (exp) {
      const dateStr = new Date(exp.date + "T00:00:00").toLocaleDateString();
      html +=
        '<div class="expense-item">' +
          '<div class="expense-left">' +
            '<span class="cat-dot" style="background:' + CAT_COLORS[exp.category] + '"></span>' +
            '<div class="expense-info">' +
              '<p class="expense-desc">' + escapeHTML(exp.description) + '</p>' +
              '<p class="expense-date">' + dateStr + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="expense-right">' +
            '<span class="badge badge-amount">$' + exp.amount.toFixed(2) + '</span>' +
            '<span class="badge badge-cat">' + exp.category + '</span>' +
            '<button type="button" class="btn-ghost" data-delete="' + exp.id + '" aria-label="Delete ' + escapeHTML(exp.description) + '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>';
    });
    expenseListEl.innerHTML = html;

    // Event delegation for delete buttons
    expenseListEl.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteExpense(this.getAttribute("data-delete"));
      });
    });
  }

  function escapeHTML(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Initial Render ──
  renderApp();
})();