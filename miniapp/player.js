/* VOVCHOK ACADEMY — плеер уроков и практики, профиль. */
(() => {
  const VA = window.VA, P = () => window.VAProgress;
  const L = (m) => (window.VA_LESSONS || {})["m" + m] || [];
  let cur = null, page = 0;
  function screen(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
    document.querySelectorAll(".nav a").forEach((b) => b.classList.toggle("on", b.id === "n-" + (id === "lesson" ? "learn" : id)));
    const sc = VA.box(id); if (sc) sc.scrollTop = 0;
  }
  const chev = () => `<span class="st">›</span>`;

  /* ---------- список модулей ---------- */
  function openLearn() {
    const el = VA.box("learn"); if (!el) return;
    const list = [], nx = P().next();
    for (let m = 1; m <= 12; m++) {
      const st = P().moduleStats(m);
      list.push(`<button type="button" class="mod${st.complete ? " done" : ""}${nx && nx.m === m ? " next" : ""}" data-m="${m}" data-testid="module-${m}-button"><span class="ico">${String(m).padStart(2, "0")}</span><div><b>${VA.modName(m)}</b><div class="muted">${VA.t("lessons_done_n", { done: st.done, n: st.n })}</div></div>${chev()}</button>`);
    }
    screen("learn");
    el.innerHTML = VA.frame(VA.talk(VA.t("learn_talk"), "watch", "learn-wolf-bubble") + `<div class="kicker">${VA.t("program")}</div><h2 class="h2">${VA.t("modules_12")}</h2><p class="sub">${VA.t("learn_sub")}</p><div class="list" data-testid="module-list">${list.join("")}</div>`);
    VA.type(el);
    el.querySelectorAll(".mod").forEach((b) => (b.onclick = () => openModule(+b.dataset.m)));
  }
  function openModule(m) {
    const el = VA.box("learn"); if (!el) return;
    const nx = P().next(), ms = P().moduleStats(m);
    const list = L(m).map((ls, i) => {
      const done = P().isDone(ls.id);
      return `<button type="button" class="mod${done ? " done" : ""}${nx && nx.m === m && nx.i === i ? " next" : ""}" data-i="${i}" data-testid="lesson-${ls.id}-button"><span class="ico">${String(i + 1).padStart(2, "0")}</span><div><b>${VA.txt(ls.title, ls.id)}</b><div class="muted">${ls.type === "practice" ? VA.t("practice") : VA.t("lesson")}${done ? " · " + VA.t("done_badge") : ""}</div></div>${chev()}</button>`;
    }).join("");
    screen("learn");
    el.innerHTML = VA.frame(VA.talk(ms.complete ? VA.t("module_talk_done") : VA.modIntro(m), ms.complete ? "mastered" : "think", "module-wolf-bubble") + `<div class="kicker">${VA.t("module", { m })}</div><h2 class="h2">${VA.modName(m)}</h2><div class="list" data-testid="lesson-list">${list}</div><button class="btn btn-ghost" id="backMods" data-testid="back-to-modules-button" type="button">${VA.t("all_modules")}</button>`);
    VA.type(el);
    el.querySelector("#backMods").onclick = openLearn;
    el.querySelectorAll(".mod").forEach((b) => (b.onclick = () => openLesson(m, +b.dataset.i)));
  }

  /* ---------- урок ---------- */
  function openLesson(m, i) {
    const ls = L(m)[i]; if (!ls) return openModule(m);
    cur = { m, i, ls }; page = 0;
    P().setLast(m, i);
    if (ls.type === "practice") return renderPractice(ls, m, i);
    screen("lesson"); renderStory();
  }
  let dir = "next";
  function renderStory() {
    const ls = cur.ls, pages = ls.pages || [], p = pages[page] || {};
    const el = VA.box("lesson"); if (!el) return;
    const last = page >= pages.length - 1;
    const chart = p.chart && typeof p.chart === "object" ? { ...p.chart, seed: ls.id + page } : null;
    el.innerHTML = VA.frame(
      VA.talk(VA.txt(p.wolf, ls.id) || VA.txt(ls.wolf, ls.id) || VA.t("lesson_default_talk"), p.mood || "watch", "lesson-wolf-bubble") +
      `<div class="muted" data-testid="lesson-step">${VA.t("step", { a: page + 1, b: pages.length })}</div>
       <h2 class="h2" data-testid="lesson-title">${VA.txt(p.title, ls.id) || VA.txt(ls.title, ls.id)}</h2>
       <div class="sub lesson-html" data-testid="lesson-html">${VA.txt(p.html, ls.id)}</div>
       ${chart ? VAChart.html(chart) : ""}
       <div class="dots">${pages.map((_, k) => `<i class="${k === page ? "on" : k < page ? "done" : ""}"></i>`).join("")}</div>
       <div class="duo"><button class="btn btn-ghost" id="prev" data-testid="lesson-prev-button" type="button">${VA.t("back")}</button><button class="btn btn-primary" id="nx" data-testid="lesson-next-button" type="button">${last ? VA.t("finish") : VA.t("next")}</button></div>`
    );
    el.scrollTop = 0;
    const sh = el.querySelector(".sheet"); if (sh) sh.classList.add("swap-" + dir);
    if (chart) VAChart.mount(el, chart);
    VA.type(el);
    el.querySelector("#prev").onclick = () => { dir = "prev"; if (page > 0) { page--; renderStory(); } else openModule(cur.m); };
    el.querySelector("#nx").onclick = () => {
      dir = "next";
      if (!last) { page++; renderStory(); return; }
      if (P().markDone(ls.id)) { VA.toast(VA.t("lesson_done_toast")); VA.haptic("success"); }
      if (cur.i + 1 < L(cur.m).length) openLesson(cur.m, cur.i + 1); else openModule(cur.m);
    };
  }

  /* ---------- практика ---------- */
  function renderPractice(ls, m, i) {
    screen("practice");
    const el = VA.box("practice"); if (!el) return;
    const chart = { ...(ls.chart || { p: "chop" }), seed: ls.id, question: true };
    const btn = (k) => `<button class="choice ${k}" data-k="${k}" data-testid="practice-choice-${k}" type="button">${VA.label(k)}</button>`;
    el.innerHTML = VA.frame(VA.talk(VA.txt(ls.wolf, ls.id), "think", "practice-wolf-bubble") +
      `<div class="kicker">${VA.t("practice_kicker")}</div><h2 class="h2" data-testid="practice-title">${VA.txt(ls.title, ls.id)}</h2>
       <div class="case" data-testid="practice-scenario"><b>${VA.t("scenario")}</b><p>${VA.txt(ls.scenario, ls.id)}</p></div>
       ${VAChart.html(chart)}
       <p class="sub" id="res" data-testid="practice-hint">${VA.t("choose_hint")}</p>
       <div class="row3" id="choices">${btn("call")}${btn("put")}${btn("wait")}</div>
       <div id="fb"></div>
       <div class="duo"><button class="btn btn-ghost" id="backL" data-testid="practice-back-button" type="button">${VA.t("to_lessons")}</button><button class="btn btn-primary" id="nextP" data-testid="practice-next-button" type="button" disabled>${VA.t("next_practice")}</button></div>`);
    el.scrollTop = 0;
    VAChart.mount(el, chart); VA.type(el);
    const fb = el.querySelector("#fb"), nextBtn = el.querySelector("#nextP");
    el.querySelectorAll(".choice").forEach((b) => (b.onclick = () => {
      const k = b.dataset.k, ok = k === ls.answer;
      el.querySelectorAll(".choice").forEach((x) => { x.disabled = true; x.classList.toggle("picked", x === b); x.classList.toggle("right", x.dataset.k === ls.answer); });
      P().setPractice(ls.id, ok);
      VA.haptic(ok ? "success" : "error");
      const ava = el.querySelector(".ava"); if (window.VASetMood) VASetMood(ava, ok ? "correct" : "warning");
      fb.innerHTML = `<div class="feedback ${ok ? "good" : "bad"}" data-testid="practice-feedback">
        <b data-testid="practice-verdict">${ok ? "✓ " + VA.t("correct") : "✕ " + VA.t("wrong")}</b>
        <div class="muted">${VA.t("your_choice", { label: VA.label(k) })}${ok ? "" : " · " + VA.t("correct_answer", { label: VA.label(ls.answer) })}</div>
        <p><b>${VA.t("why")}:</b> ${VA.txt(ls.explain, ls.id)}</p>
        ${!ok && ls.wrong && ls.wrong[k] ? `<p>${VA.txt(ls.wrong[k], ls.id)}</p>` : ""}
        ${ok ? "" : `<button class="btn btn-ghost" id="again" data-testid="practice-retry-button" type="button">${VA.t("try_again")}</button>`}
      </div>`;
      const again = fb.querySelector("#again"); if (again) again.onclick = () => renderPractice(ls, m, i);
      nextBtn.disabled = false;
      if (ok) VA.toast(VA.t("lesson_done_toast"));
      fb.scrollIntoView({ behavior: "smooth", block: "end" });
    }));
    el.querySelector("#backL").onclick = () => openModule(m || 1);
    nextBtn.onclick = () => {
      if (m && typeof i === "number" && i + 1 < L(m).length) return openLesson(m, i + 1);
      openPractice();
    };
  }
  /* Экран «Практика»: список всех сценариев со статусом. */
  function openPractice() {
    const el = VA.box("practice"); if (!el) return;
    screen("practice");
    const items = P().all().filter((x) => x.ls.type === "practice");
    const list = items.map((x) => {
      const pr = P().practice(x.ls.id);
      const st = pr ? (pr.ok ? "ok" : "bad") : "new";
      return `<button type="button" class="mod${st === "ok" ? " done" : ""}" data-m="${x.m}" data-i="${x.i}" data-testid="practice-${x.ls.id}-button"><span class="ico">${String(x.m).padStart(2, "0")}</span><div><b>${VA.txt(x.ls.title, x.ls.id)}</b><div class="muted st-${st}">${VA.modName(x.m)} · ${VA.t("practice_status_" + st)}</div></div>${chev()}</button>`;
    }).join("");
    el.innerHTML = VA.frame(VA.talk(VA.t("practice_sub"), "think", "practice-list-bubble") + `<div class="kicker">${VA.t("practice_kicker")}</div><h2 class="h2">${VA.t("practice_list")}</h2><div class="list" data-testid="practice-list">${list}</div>`);
    VA.type(el);
    el.querySelectorAll(".mod").forEach((b) => (b.onclick = () => openLesson(+b.dataset.m, +b.dataset.i)));
  }

  /* ---------- профиль ---------- */
  function openProfile() {
    const el = VA.box("profile"); if (!el) return;
    const st = P().stats(), nx = P().next();
    const langs = VA.LANGS.map((l) => `<button type="button" class="flag${l === VA.lang() ? " on" : ""}" data-l="${l}" data-testid="lang-${l}-button">${{ ru: "🇷🇺 Русский", uk: "🇺🇦 Українська", ar: "🇸🇦 العربية" }[l]}</button>`).join("");
    const map = [];
    for (let m = 1; m <= 12; m++) { const ms = P().moduleStats(m); map.push(`<i class="${ms.complete ? "done" : ms.done ? "part" : ""}" title="${VA.modName(m)}">${m}</i>`); }
    el.innerHTML = VA.frame(VA.talk(VA.t("profile_talk"), st.pct === 100 ? "mastered" : "calm", "profile-wolf-bubble") +
      `<h2 class="h2">${VA.t("profile")}</h2>
       <div class="kicker">${VA.t("course_progress")}</div>
       <div class="bar" data-testid="profile-progress-bar"><i style="width:${st.pct}%"></i></div>
       <div class="grid2"><div data-testid="profile-lessons-done"><small>${VA.t("lessons_done")}</small><b>${st.done} / ${st.total}</b></div><div data-testid="profile-practices-ok"><small>${VA.t("practices_ok")}</small><b>${st.practicesOk} / ${st.practices}</b></div></div>
       <div class="kicker">${VA.t("modules_map")}</div><div class="modmap" data-testid="profile-module-map">${map.join("")}</div>
       ${nx ? `<button class="btn btn-primary" id="pfCont" data-testid="profile-continue-button" type="button">${VA.t("continue_from")}: ${VA.txt(nx.ls.title, nx.ls.id)}</button>` : `<p class="sub" data-testid="profile-complete">${st.total ? VA.t("course_complete") : VA.t("not_started")}</p>`}
       <div class="kicker" style="margin-top:14px">${VA.t("language")}</div><div class="flags" data-testid="lang-switcher">${langs}</div>
       ${VA.disclaimer(true)}
       <button class="btn btn-ghost" id="pfReset" data-testid="profile-reset-button" type="button">${VA.t("reset_progress")}</button>`);
    VA.type(el);
    const c = el.querySelector("#pfCont"); if (c) c.onclick = () => openLesson(nx.m, nx.i);
    el.querySelectorAll(".flag").forEach((b) => (b.onclick = () => { VA.setLang(b.dataset.l); openProfile(); }));
    el.querySelector("#pfReset").onclick = () => { P().reset(); VA.toast(VA.t("reset_done")); openProfile(); };
  }

  window.VAOpenLearn = openLearn; window.VAOpenModule = openModule; window.VAOpenLesson = openLesson;
  window.VAOpenPractice = openPractice; window.VAOpenProfile = openProfile;
})();
