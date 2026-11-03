(() => {
  const questions = window.QUIZ_QUESTIONS || [];
  const standings = [
    { name: "Mina K.", score: "10 / 10", streak: "4 quizzes", initial: "M", tone: 0 },
    { name: "Theo R.", score: "9 / 10", streak: "3 quizzes", initial: "T", tone: 1 },
    { name: "Ari S.", score: "8 / 10", streak: "2 quizzes", initial: "A", tone: 2 },
    { name: "Jun P.", score: "8 / 10", streak: "1 quiz", initial: "J", tone: 3 },
    { name: "Sam D.", score: "7 / 10", streak: "2 quizzes", initial: "S", tone: 1 }
  ];
  const state = { view: "home", selectedLength: 5, activeQuestions: [], index: 0, score: 0, answered: false, guestScore: null, serverSession: null, liveRank: null, liveSaved: false, liveBoard: null, authUser: null, serverFinished: false };
  const views = { home: "homeView", quiz: "quizView", results: "resultsView", leaderboard: "leaderboardView", about: "aboutView" };
  const $ = (id) => document.getElementById(id);

  function setView(name) {
    state.view = name;
    Object.entries(views).forEach(([key, id]) => $(id).classList.toggle("active", key === name));
    document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === name));
    if (name === "leaderboard") renderBoard();
    if (name !== "quiz") window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "home") history.replaceState(null, "", location.pathname + (embedMode ? "?embed=1" : ""));
    else history.replaceState(null, "", `#${name}` + (embedMode ? "?embed=1" : ""));
  }

  function sampleQuestions(length) {
    const pool = [...questions];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(length, pool.length));
  }

  async function startQuiz() {
    const startButton = $("startButton");
    if (startButton) startButton.disabled = true;
    state.serverSession = null;
    state.liveRank = null;
    state.liveSaved = false;
    state.serverFinished = false;
    let serverStarted = false;
    try {
      const response = await fetch("/api/quiz/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ length: state.selectedLength }) });
      if (response.ok) {
        const data = await response.json();
        state.serverSession = { id: data.sessionId, token: data.token };
        state.activeQuestions = data.questions;
        serverStarted = true;
      }
    } catch { /* Static preview remains playable when the backend is absent. */ }
    if (!serverStarted) state.activeQuestions = sampleQuestions(state.selectedLength);
    state.index = 0;
    state.score = 0;
    state.answered = false;
    state.guestScore = null;
    setView("quiz");
    renderQuestion();
    if (startButton) startButton.disabled = false;
  }

  function renderQuestion() {
    const q = state.activeQuestions[state.index];
    if (!q) return showResults();
    state.answered = false;
    const total = state.activeQuestions.length;
    $("liveScore").textContent = state.score;
    $("progressFill").style.width = `${(state.index / total) * 100}%`;
    $("questionCounter").textContent = `QUESTION ${String(state.index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    document.querySelector(".quiz-pack-label").textContent = `${total === 3 ? "QUICK TAKE" : total === 5 ? "THE USUAL" : "DEEP DIVE"} · ${state.serverSession ? "LIVE PACK" : "PREVIEW PACK"}`;
    const area = $("questionArea");
    const sourceName = (q.source || "").replace(/ · CC BY [34]\.0$/, "");
    const isOpenLicensedSource = sourceName.includes("Global Voices") || sourceName.includes("Horizon");
    const licenseUrl = sourceName.includes("Global Voices")
      ? "https://creativecommons.org/licenses/by/3.0/"
      : "https://creativecommons.org/licenses/by/4.0/";
    const licenseName = sourceName.includes("Global Voices") ? "CC BY 3.0" : "CC BY 4.0";
    const attribution = isOpenLicensedSource
      ? `<div class="question-attribution">Adapted from <a href="${safeUrl(q.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceName)}</a> · <a href="${licenseUrl}" target="_blank" rel="noopener noreferrer">${licenseName}</a></div>`
      : "";
    area.innerHTML = `
      <div class="question-category"><span class="category-dot"></span>${escapeHtml(q.category)}<span>·</span>${escapeHtml(q.date)}</div>
      ${attribution}
      <h2>${escapeHtml(q.prompt)}</h2>
      <p class="question-context">${escapeHtml(q.context)}</p>
      <div class="answer-list" role="group" aria-label="Answer options">${q.options.map((answer, i) => `<button class="answer-option" data-answer="${i}"><span class="answer-key">${String.fromCharCode(65 + i)}</span><span class="answer-label">${escapeHtml(answer)}</span></button>`).join("")}</div>
      <div id="feedbackHost"></div>`;
    area.querySelectorAll(".answer-option").forEach((button) => button.addEventListener("click", () => selectAnswer(Number(button.dataset.answer))));
    $("progressFill").style.width = `${((state.index + 1) / total) * 100}%`;
  }

  async function selectAnswer(answerIndex) {
    if (state.answered) return;
    const q = state.activeQuestions[state.index];
    let feedback;
    if (state.serverSession) {
      try {
        const response = await fetch("/api/quiz/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: state.serverSession.id, token: state.serverSession.token, questionId: q.id, answer: answerIndex }) });
        feedback = await response.json();
        if (!response.ok) { showToast(feedback.error || "Could not submit that answer. Please try again."); return; }
      } catch { showToast("Could not reach the quiz server. Please try that answer again."); return; }
    } else {
      feedback = { correct: answerIndex === q.correct, correctIndex: q.correct, explanation: q.explanation, source: q.source, sourceUrl: q.sourceUrl, date: q.date };
    }
    state.answered = true;
    const correct = feedback.correct;
    if (correct) state.score += 1;
    $("liveScore").textContent = state.score;
    const options = [...document.querySelectorAll(".answer-option")];
    options.forEach((button, i) => {
      button.disabled = true;
      if (i === feedback.correctIndex) button.classList.add("correct");
      else if (i === answerIndex) button.classList.add("incorrect");
      else button.classList.add("dimmed");
    });
    const host = $("feedbackHost");
    const secondSource = feedback.source2Url ? `<a class="source-link second-source-link" href="${safeUrl(feedback.source2Url)}" target="_blank" rel="noopener noreferrer">Also checked: ${escapeHtml(feedback.source2Title || "Second source")} <span>↗</span></a>` : "";
    const sourceTitle = (feedback.source || q.source || "Source").replace(/ · CC BY [34]\.0$/, "");
    const isGlobalVoices = sourceTitle.includes("Global Voices");
    const isHorizon = sourceTitle.includes("Horizon");
    const reuseCredit = isGlobalVoices
      ? ` · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a> · adapted for this quiz`
      : isHorizon
        ? ` · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · adapted for this quiz<div class="source-reuse-note">This article was originally published in Horizon, the EU Research and Innovation magazine.</div>`
        : "";
    host.innerHTML = `<div class="feedback-card"><div class="feedback-top"><span class="feedback-verdict ${correct ? "right" : "wrong"}">${correct ? "✳ NICE ONE — THAT'S RIGHT" : "GOOD GUESS — HERE'S THE CONTEXT"}</span><span class="feedback-source">${escapeHtml(feedback.date || q.date || "SOURCE")}</span></div><p>${escapeHtml(feedback.explanation)}</p><div class="feedback-sources"><a class="source-link" href="${safeUrl(feedback.sourceUrl || q.sourceUrl)}" target="_blank" rel="noopener noreferrer">Read: ${escapeHtml(sourceTitle)} <span>↗</span></a>${reuseCredit}${secondSource}</div><button class="primary-button next-button" id="nextButton">${state.index + 1 === state.activeQuestions.length ? "See my score" : "Next question"} <span>→</span></button><div style="clear:both"></div></div>`;
    $("nextButton").addEventListener("click", () => {
      state.index += 1;
      if (state.index === state.activeQuestions.length) void showResults();
      else renderQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function showResults() {
    const total = state.activeQuestions.length;
    state.guestScore = state.score;
    if (state.serverSession && !state.serverFinished) {
      try {
        const response = await fetch("/api/quiz/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: state.serverSession.id, token: state.serverSession.token }) });
        const result = await response.json();
        if (response.ok) {
          state.liveRank = result.rank;
          state.liveSaved = result.saved;
          state.serverFinished = true;
        }
      } catch { /* The completed score remains visible locally if the server is unavailable. */ }
    }
    const sampleScores = [{ percent: 100, total: 10 }, { percent: 90, total: 10 }, { percent: 80, total: 10 }, { percent: 80, total: 10 }, { percent: 70, total: 10 }];
    const scorePercent = Math.round(100 * state.score / (total || 1));
    const expectedRank = sampleScores.filter((score) => score.percent > scorePercent || (score.percent === scorePercent && score.total > total)).length + 1;
    const denom = total || 1;
    const percent = state.score / denom;
    const title = percent === 1 ? "Ridiculously well read." : percent >= 0.7 ? "Nicely nosy." : percent >= 0.4 ? "Good questions, good instincts." : "Now you’ve got the context.";
    $("resultTitle").textContent = title;
    $("resultSubtitle").textContent = `You got ${state.score} out of ${total}. That’s ${Math.round(percent * 100)}% curiosity.`;
    $("finalScore").textContent = String(state.score).padStart(2, "0");
    $("finalTotal").textContent = String(total).padStart(2, "0");
    $("rankTitle").textContent = state.liveRank ? `${state.liveSaved ? "You rank" : "Your guest score would rank"} #${state.liveRank} globally` : `Your guest score would land around #${expectedRank}`;
    $("rankSubtitle").textContent = state.liveRank ? (state.liveSaved ? "on the live global board" : "on the live global board · sign in to save your score") : `on today's sample global board · sign in to save your place`;
    $("resultSignIn").hidden = !!state.liveSaved;
    $("resultSignIn").textContent = state.authUser ? "Manage your account →" : "Save your score and play for keeps →";
    document.querySelector(".preview-note").textContent = state.liveRank ? "Live standings are based on saved player scores. Guest scores are only used to show a temporary rank." : "Preview mode: scores and standings are sample data until the Cloudflare backend is configured.";
    setView("results");
  }

  async function renderBoard() {
    let board = null;
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      if (response.ok) board = await response.json();
    } catch { /* Keep the sample board visible. */ }
    state.liveBoard = board && !board.preview ? board.leaderboard : null;
    if (state.liveBoard) {
      $("leaderRows").innerHTML = state.liveBoard.length ? state.liveBoard.map((person) => `<div class="leader-row"><span class="leader-rank">${String(person.rank).padStart(2, "0")}</span><span class="leader-player"><span class="leader-avatar">${escapeHtml([...person.nickname][0] || "?")}</span><span>${escapeHtml(person.nickname)}</span></span><span class="leader-score">${person.correct}/${person.total} (${person.percent}%)</span><span class="leader-streak"><b>✳</b> ${person.gamesPlayed} ${person.gamesPlayed === 1 ? "quiz" : "quizzes"}</span></div>`).join("") : `<div class="leader-row"><span class="leader-rank">—</span><span class="leader-player">No scores yet</span><span class="leader-score">Be first</span><span class="leader-streak">✳</span></div>`;
    } else {
      $("leaderRows").innerHTML = standings.map((person, index) => `<div class="leader-row"><span class="leader-rank">${String(index + 1).padStart(2, "0")}</span><span class="leader-player"><span class="leader-avatar tone-${person.tone}">${person.initial}</span><span>${person.name}</span></span><span class="leader-score">${person.score}</span><span class="leader-streak"><b>✳</b> ${person.streak}</span></div>`).join("");
    }
    document.querySelector(".section-kicker").textContent = state.liveBoard ? "THE GLOBAL BOARD" : "THE GLOBAL BOARD · PREVIEW";
    const guestRow = document.querySelector(".guest-rank-row");
    guestRow.hidden = !!state.liveSaved;
    if (state.guestScore === null) {
      $("guestBoardScore").textContent = "—";
      document.querySelector(".guest-rank-row .leader-rank").textContent = "—";
      $("guestBoardScore").nextElementSibling.textContent = "PLAY A QUIZ TO SEE YOUR SPOT";
    } else {
      const total = state.activeQuestions.length;
      const scorePercent = Math.round(100 * state.guestScore / (total || 1));
      const sampleScores = [{ percent: 100, total: 10 }, { percent: 90, total: 10 }, { percent: 80, total: 10 }, { percent: 80, total: 10 }, { percent: 70, total: 10 }];
      const rank = state.liveRank || (state.liveBoard ? state.liveBoard.filter((person) => person.percent > scorePercent || (person.percent === scorePercent && person.total > total)).length + 1 : sampleScores.filter((score) => score.percent > scorePercent || (score.percent === scorePercent && score.total > total)).length + 1);
      $("guestBoardScore").textContent = `${state.guestScore} / ${total}`;
      document.querySelector(".guest-rank-row .leader-rank").textContent = String(rank).padStart(2, "0");
      $("guestBoardScore").nextElementSibling.textContent = `WOULD RANK #${rank} ${state.liveBoard ? "GLOBALLY" : "TODAY"}`;
    }
  }

  function setAuthUser(user) {
    state.authUser = user || null;
    $("accountButton").innerHTML = user
      ? `<span class="avatar-icon">✓</span><span>${escapeHtml(user.nickname)}</span>`
      : `<span class="avatar-icon">↗</span><span>Sign in</span>`;
    $("authSignedOut").hidden = !!user;
    $("authSignedIn").hidden = !user;
    $("adminLink").hidden = user?.role !== "admin";
    $("mainSiteAccount").hidden = !!user || !embedMode;
    if (user) {
      $("currentNickname").textContent = user.nickname;
      $("nicknameInput").value = user.nickname;
      $("accountEyebrow").textContent = user.role === "admin" ? "PLAYER + EDITOR ACCOUNT" : "PLAYER ACCOUNT";
      $("accountTitle").textContent = "Your scores. Your name.";
      $("accountCopy").textContent = "Your public nickname is separate from your Google identity. Change it here; banned names are blocked.";
      $("resultSignIn").textContent = "Manage your account →";
    } else {
      $("accountEyebrow").textContent = "YOUR CURIOSITY, KEPT IN ONE PLACE";
      $("accountTitle").innerHTML = "Save your scores.<br />Keep your streak.";
      $("accountCopy").textContent = "Sign in to save quiz history and appear on the global board. Your public nickname stays separate from your Google identity. Guest play stays open.";
    }
  }

  async function refreshAuth() {
    try {
      const response = await fetch("/api/auth/google", { cache: "no-store" });
      if (!response.ok) return setAuthUser(null);
      const data = await response.json();
      setAuthUser(data.user);
    } catch { setAuthUser(null); }
  }

  function loadGoogleScript() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (window.googleScriptPromise) return window.googleScriptPromise;
    window.googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Google sign-in could not load."));
      document.head.append(script);
    });
    return window.googleScriptPromise;
  }

  async function setupGoogleSignIn() {
    $("authMessage").textContent = "";
    $("googleSignInButton").replaceChildren();
    try {
      const configResponse = await fetch("/api/auth/config", { cache: "no-store" });
      if (!configResponse.ok) throw new Error("Sign-in will be available when the Cloudflare backend is connected.");
      const config = await configResponse.json();
      if (!config.clientId) throw new Error("Sign-in will be available when Google sign-in is configured.");
      const nonceResponse = await fetch("/api/auth/nonce", { cache: "no-store" });
      if (!nonceResponse.ok) throw new Error("Could not start sign-in. Please try again.");
      const { nonce } = await nonceResponse.json();
      await loadGoogleScript();
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        nonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response) => {
          $("authMessage").textContent = "Signing you in…";
          try {
            const loginResponse = await fetch("/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: response.credential }) });
            const result = await loginResponse.json();
            if (!loginResponse.ok) throw new Error(result.error || "Sign-in failed.");
            setAuthUser(result.user);
            $("authMessage").textContent = "";
            await loadHistory();
            if (state.serverSession && state.serverFinished && !state.liveSaved) {
              const claim = await fetch("/api/quiz/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: state.serverSession.id, token: state.serverSession.token }) });
              if (claim.ok) {
                const claimData = await claim.json();
                state.liveSaved = true;
                state.liveRank = claimData.rank;
                $("resultSignIn").hidden = true;
                $("rankTitle").textContent = `You rank #${state.liveRank} globally`;
                $("rankSubtitle").textContent = "on the live global board";
                document.querySelector(".preview-note").textContent = "Your score is saved to the live global board.";
                await loadHistory();
              }
            }
            dialog.close();
            void renderBoard();
            showToast("Signed in. Your nickname is ready to edit.");
          } catch (error) { $("authMessage").textContent = error.message || "Sign-in failed. Please try again."; }
        }
      });
      window.google.accounts.id.renderButton($("googleSignInButton"), { type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 280 });
    } catch (error) {
      $("authMessage").textContent = error.message || "Sign-in is not available yet.";
    }
  }

  async function loadHistory() {
    const host = $("historyList");
    if (!state.authUser) return;
    try {
      const response = await fetch("/api/account/history", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "History isn't available yet.");
      host.innerHTML = data.history.length ? data.history.slice(0, 5).map((run) => `<div class="history-row"><span>${run.correct}/${run.total}</span><time>${new Date(run.completedAt).toLocaleDateString()}</time></div>`).join("") : `<span class="history-empty">Your completed quizzes will show up here.</span>`;
    } catch { host.textContent = "History will be available when the backend is connected."; }
  }

  async function openAccount() {
    if (!dialog.open) dialog.showModal();
    await refreshAuth();
    if (state.authUser) await loadHistory();
    else if (embedMode) {
      $("authSignedOut").hidden = true;
      $("mainSiteAccount").hidden = false;
      $("authMessage").textContent = "Sign in from the main quiz page to save scores. Guest play works here.";
    } else await setupGoogleSignIn();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? escapeHtml(url.href) : "#";
    } catch { return "#"; }
  }

  const embedMode = new URLSearchParams(location.search).get("embed") === "1";
  if (embedMode) document.body.classList.add("embed-mode");
  $("mainSiteAccount").href = `${location.origin}${location.pathname}`;
  const codeUrl = `${location.origin}${location.pathname}?embed=1`;
  $("embedCode").textContent = `<iframe src="${codeUrl}" title="Current-ish news quiz" width="100%" height="760" loading="lazy" style="border:0;border-radius:8px;overflow:hidden" allow="clipboard-write"></iframe>`;

  document.querySelectorAll("[data-view]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.view);
  }));
  document.querySelectorAll(".length-card").forEach((card) => card.addEventListener("click", () => {
    document.querySelectorAll(".length-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    state.selectedLength = Number(card.dataset.length);
  }));
  $("startButton").addEventListener("click", () => { void startQuiz(); });
  $("boardPlayButton").addEventListener("click", () => { setView("home"); void startQuiz(); });
  $("quitButton").addEventListener("click", () => setView("home"));
  $("replayButton").addEventListener("click", () => { void startQuiz(); });
  $("shareButton").addEventListener("click", async () => {
    const message = `I got ${state.score}/${state.activeQuestions.length} on Current-ish — how current are you?`;
    try {
      if (navigator.share) await navigator.share({ title: "Current-ish quiz", text: message, url: location.href.split("#")[0] });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${message} ${location.href.split("#")[0]}`); showToast("Result copied — go make the group chat curious."); }
      else showToast(message);
    } catch (error) { if (error.name !== "AbortError") showToast(message); }
  });
  $("copyEmbed").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("embedCode").textContent); showToast("Embed code copied."); }
    catch { showToast("Select and copy the embed code above."); }
  });
  const dialog = $("accountDialog");
  [$("accountButton"), $("resultSignIn")].forEach((button) => button.addEventListener("click", () => { void openAccount(); }));
  $("closeDialog").addEventListener("click", () => dialog.close());
  $("nicknameForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit']");
    button.disabled = true;
    $("authMessage").textContent = "";
    try {
      const response = await fetch("/api/account/nickname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: $("nicknameInput").value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save nickname.");
      setAuthUser({ ...state.authUser, nickname: data.nickname });
      showToast("Nickname saved.");
      void renderBoard();
    } catch (error) { $("authMessage").textContent = error.message || "Could not save nickname."; }
    finally { button.disabled = false; }
  });
  $("logoutButton").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    dialog.close();
    showToast("Signed out.");
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  void refreshAuth();
  if (new URLSearchParams(location.search).get("account") === "1") void openAccount();
  renderBoard();
})();
