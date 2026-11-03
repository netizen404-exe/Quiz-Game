(() => {
  const $ = (id) => document.getElementById(id);
  const state = { user: null };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? escapeHtml(url.href) : "#";
    } catch { return "#"; }
  }

  function message(text, isError = false) {
    const host = $("adminMessage");
    host.textContent = text;
    host.classList.toggle("error", isError);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
    });
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  async function loadSuggestions() {
    message("");
    const data = await api("/api/admin/suggestions");
    $("suggestionCount").textContent = data.suggestions.length;
    renderCurrentQuestions(data.activeQuestions || []);
    const host = $("suggestionList");
    if (!data.suggestions.length) {
      host.innerHTML = `<div class="admin-empty">No drafts are waiting. New suggestions will show up here after the next collection run.</div>`;
      return;
    }
    host.innerHTML = data.suggestions.map((item) => {
      const options = Array.isArray(item.options) ? item.options : [];
      const optionFields = [0, 1, 2, 3].map((index) => `<label>Option ${String.fromCharCode(65 + index)}<input name="option${index}" maxlength="180" required value="${escapeHtml(options[index] || "")}" /></label>`).join("");
      const correctOptions = options.map((option, index) => `<option value="${index}" ${Number(item.correctIndex) === index ? "selected" : ""}>${String.fromCharCode(65 + index)} · ${escapeHtml(option)}</option>`).join("");
      return `<article class="suggestion-card" data-id="${escapeHtml(item.id)}"><div class="suggestion-meta"><span>${escapeHtml(item.publisher || "SOURCE")} · ${escapeHtml(item.category)}</span><a href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></div><form class="suggestion-form"><label>Question<input name="prompt" maxlength="300" required value="${escapeHtml(item.prompt)}" /></label><label>Context<textarea name="context" maxlength="500">${escapeHtml(item.context)}</textarea></label><div class="option-grid">${optionFields}</div><label>Correct answer<select name="correctIndex">${correctOptions}</select></label><label>Explanation<textarea name="explanation" maxlength="900" required>${escapeHtml(item.explanation)}</textarea></label><label class="corroboration-check"><input name="requiresSecondSource" type="checkbox" ${item.requiresSecondSource ? "checked" : ""} /> This claim needs independent corroboration</label><div class="source-pair-fields"><label>Second source title <span>(optional; required if checked)</span><input name="source2Title" maxlength="180" value="${escapeHtml(item.source2Title || "")}" /></label><label>Second source link<input name="source2Url" type="url" maxlength="1000" value="${escapeHtml(item.source2Url || "")}" placeholder="https://" /></label></div><div class="ai-review" aria-live="polite"></div><div class="suggestion-actions"><button type="button" class="secondary-button" data-action="ai-review">Ask AI to review</button><button type="button" class="secondary-button reject-button" data-action="reject">Reject</button><button type="button" class="secondary-button" data-action="edit">Save edit</button><button type="button" class="primary-button approve-button" data-action="approve">Approve <span>→</span></button></div></form></article>`;
    }).join("");
  }

  function renderCurrentQuestions(questions) {
    const host = $("currentQuestionList");
    const now = Date.now();
    $("currentQuestionCount").textContent = questions.length;
    if (!questions.length) {
      host.innerHTML = `<div class="admin-empty">No approved questions are being tracked yet.</div>`;
      return;
    }
    host.innerHTML = questions.map((item) => {
      const removalTime = item.staleAt ? Date.parse(item.staleAt) : NaN;
      const removalDate = Number.isFinite(removalTime) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(removalTime)) : null;
      const due = Number.isFinite(removalTime) && removalTime <= now;
      const aiReviewTime = item.aiReviewDueAt ? Date.parse(item.aiReviewDueAt) : NaN;
      const aiReviewDate = Number.isFinite(aiReviewTime) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(aiReviewTime)) : null;
      const aiActionLabels = { keep: "AI suggests keeping", check_source: "AI suggests checking the source", consider_retiring: "AI suggests considering retirement" };
      const aiReview = item.aiReviewAction
        ? `<div class="ai-freshness"><strong>${escapeHtml(aiActionLabels[item.aiReviewAction] || "AI freshness check")}</strong><span>${escapeHtml(item.aiReviewNote || "")}</span><small>Next AI check: ${escapeHtml(aiReviewDate || "not scheduled")}</small></div>`
        : `<div class="ai-freshness"><strong>${aiReviewDate && aiReviewTime <= now ? "AI freshness check due" : "First AI freshness check"}</strong><small>Scheduled: ${escapeHtml(aiReviewDate || "not scheduled")}</small></div>`;
      const freshness = removalDate
        ? `<span class="freshness-label ${due ? "due" : "upcoming"}">${due ? "Removal suggested" : "Suggested removal"} · ${escapeHtml(removalDate)}${due ? " · no longer served" : ""}</span>`
        : `<span class="freshness-label unset">No removal date set</span>`;
      return `<article class="current-question-card" data-id="${escapeHtml(item.id)}"><div class="current-question-meta"><span>${escapeHtml(item.sourceTitle || "SOURCE")} · ${escapeHtml(item.category)}</span><a href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></div><p class="current-question-prompt">${escapeHtml(item.prompt)}</p>${aiReview}<div class="current-question-footer">${freshness}<button type="button" class="secondary-button retire-question" data-action="retire">Retire question</button></div></article>`;
    }).join("");
  }

  async function loadUsers() {
    message("");
    const data = await api("/api/admin/users");
    const host = $("userList");
    if (!data.users.length) { host.innerHTML = `<div class="admin-empty">No player accounts yet.</div>`; return; }
    host.innerHTML = data.users.map((user) => `<article class="user-card" data-user-id="${escapeHtml(user.id)}"><div class="user-card-main"><strong>${escapeHtml(user.nickname)}</strong><span>${user.gamesPlayed} quizzes · ${user.bestPercent ?? 0}% best · ${user.role === "admin" ? "admin" : "player"}</span></div><span class="user-status ${user.status === "disabled" ? "disabled" : ""}">${escapeHtml(user.status).toUpperCase()}</span><input aria-label="Public nickname for ${escapeHtml(user.nickname)}" maxlength="18" value="${escapeHtml(user.nickname)}" /><div class="user-card-actions"><button type="button" class="secondary-button rename-user">Save name</button><button type="button" class="secondary-button toggle-user">${user.status === "disabled" ? "Enable" : "Disable"}</button></div></article>`).join("");
  }

  async function loadBannedNames() {
    message("");
    const data = await api("/api/admin/banned-names");
    const host = $("bannedList");
    if (!data.bannedNames.length) { host.innerHTML = `<div class="admin-empty">No banned terms yet. Add terms you want the nickname filter to reject.</div>`; return; }
    host.innerHTML = data.bannedNames.map((item) => `<div class="banned-row" data-ban-id="${escapeHtml(item.id)}"><span>${escapeHtml(item.phrase)}</span><button type="button" class="remove-ban">Remove</button></div>`).join("");
  }

  async function loadAll() {
    await Promise.all([loadSuggestions(), loadUsers(), loadBannedNames()]);
  }

  async function initialize() {
    try {
      const auth = await api("/api/auth/google");
      state.user = auth.user;
      if (auth.user?.role !== "admin") {
        $("gateMessage").textContent = auth.user ? "This account does not have editor access." : "Sign in with the Google account assigned as the initial admin, then return here.";
        $("adminGate").classList.add("needs-signin");
        return;
      }
      $("adminGate").hidden = true;
      $("adminDesk").hidden = false;
      await loadAll();
    } catch (error) {
      $("gateMessage").textContent = "The review desk will be available after the Cloudflare backend is configured.";
      $("adminGate").classList.remove("needs-signin");
      message(error.message, true);
    }
  }

  document.querySelectorAll(".admin-tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((item) => item.classList.toggle("active", item === tab));
    document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.panel));
    message("");
  }));

  $("suggestionList").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".suggestion-card");
    if (button.dataset.action === "ai-review") {
      button.disabled = true;
      const reviewHost = card.querySelector(".ai-review");
      reviewHost.textContent = "Reviewing the draft and its supplied source details…";
      try {
        const { review } = await api("/api/admin/suggestions/review", { method: "POST", body: JSON.stringify({ id: card.dataset.id }) });
        const checks = (review.checks || []).map((check) => `<li><strong>${escapeHtml(check.status)} · ${escapeHtml(check.label)}:</strong> ${escapeHtml(check.detail)}</li>`).join("");
        const issues = (review.issues || []).map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
        const edits = review.suggestedEdits || {};
        const editLines = [edits.prompt && `Question: ${edits.prompt}`, edits.context && `Context: ${edits.context}`, Array.isArray(edits.options) && `Options: ${edits.options.join(" | ")}`, edits.explanation && `Explanation: ${edits.explanation}`].filter(Boolean).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
        reviewHost.innerHTML = `<div class="ai-review-heading">AI review: ${escapeHtml(review.verdict)} · ${escapeHtml(review.confidence)} confidence</div><p>${escapeHtml(review.note || "Advisory review only; inspect the source yourself.")}</p>${checks ? `<ul>${checks}</ul>` : ""}${issues ? `<strong>Needs attention</strong><ul>${issues}</ul>` : ""}${editLines ? `<strong>Suggested edits (not applied)</strong><ul>${editLines}</ul>` : ""}<p class="ai-review-footnote">The AI cannot open the source link or independently verify facts. Review the source yourself; this does not approve the question.</p>`;
      } catch (error) { reviewHost.textContent = error.message; }
      finally { button.disabled = false; }
      return;
    }
    const form = card.querySelector("form");
    const formData = new FormData(form);
    const body = {
      id: card.dataset.id,
      action: "edit",
      prompt: formData.get("prompt"),
      context: formData.get("context"),
      options: [0, 1, 2, 3].map((index) => formData.get(`option${index}`)),
      correctIndex: Number(formData.get("correctIndex")),
      explanation: formData.get("explanation"),
      source2Title: formData.get("source2Title"),
      source2Url: formData.get("source2Url"),
      requiresSecondSource: formData.get("requiresSecondSource") === "on",
      category: card.querySelector(".suggestion-meta span").textContent.split("·").at(-1).trim()
    };
    button.disabled = true;
    message("");
    try {
      if (!form.reportValidity()) return;
      if (button.dataset.action === "edit" || button.dataset.action === "approve") await api("/api/admin/suggestions", { method: "PATCH", body: JSON.stringify(body) });
      if (button.dataset.action !== "edit") await api("/api/admin/suggestions", { method: "PATCH", body: JSON.stringify({ id: body.id, action: button.dataset.action }) });
      message(button.dataset.action === "edit" ? "Draft saved." : button.dataset.action === "approve" ? "Question approved and published." : "Suggestion rejected.");
      await loadSuggestions();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });

  $("userList").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const card = button.closest(".user-card");
    const userId = card.dataset.userId;
    button.disabled = true;
    try {
      if (button.classList.contains("rename-user")) {
        await api("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId, action: "rename", nickname: card.querySelector("input").value }) });
        message("Nickname updated.");
      } else {
        const status = card.querySelector(".user-status").textContent.toLowerCase();
        await api("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId, action: status === "disabled" ? "enable" : "disable" }) });
        message(status === "disabled" ? "Account enabled." : "Account disabled.");
      }
      await loadUsers();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });

  $("banForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      await api("/api/admin/banned-names", { method: "POST", body: JSON.stringify({ phrase: $("banInput").value }) });
      $("banInput").value = "";
      message("Term added to the banned-name list.");
      await loadBannedNames();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });

  $("bannedList").addEventListener("click", async (event) => {
    const button = event.target.closest(".remove-ban");
    if (!button) return;
    const row = button.closest(".banned-row");
    button.disabled = true;
    try {
      await api(`/api/admin/banned-names/${encodeURIComponent(row.dataset.banId)}`, { method: "DELETE" });
      message("Term removed.");
      await loadBannedNames();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });

  $("refreshSuggestions").addEventListener("click", () => loadSuggestions().catch((error) => message(error.message, true)));
  $("currentQuestionList").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='retire']");
    if (!button) return;
    const card = button.closest(".current-question-card");
    button.disabled = true;
    try {
      await api("/api/admin/suggestions", { method: "PATCH", body: JSON.stringify({ id: card.dataset.id, action: "retire" }) });
      message("Question retired.");
      await loadSuggestions();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
  $("refreshCurrent").addEventListener("click", () => loadSuggestions().catch((error) => message(error.message, true)));
  $("refreshUsers").addEventListener("click", () => loadUsers().catch((error) => message(error.message, true)));
  void initialize();
})();
