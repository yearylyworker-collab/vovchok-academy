/* VOVCHOK ACADEMY — экраны: главная, академия (аккордеон), урок, Practice Lab, профиль. */
(() => {
  const VA = window.VA, P = () => window.VAProgress, B = () => window.VA_BANK || {};
  const L = (m) => (window.VA_LESSONS || {})["m" + m] || [];
  const CATS = ["candles", "trend", "levels", "reversals", "timeframes", "indicators", "entry", "psychology", "context"];
  let cur = null, page = 0, dir = "next";
  const lab = { cat: "all", diff: "all", weak: false, queue: [], idx: 0, sel: null, checked: false, ctl: null };
  function screen(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
    document.querySelectorAll(".nav a").forEach((b) => b.classList.toggle("on", b.id === "n-" + (id === "lesson" ? "learn" : id)));
    const sc = VA.box(id); if (sc) sc.scrollTop = 0;
  }
  const ring = (pct, size, label, tid) => `<div class="ring2" style="--p:${pct}" data-testid="${tid || "ring"}"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42"/></svg><div><b>${pct}%</b>${label ? `<small>${label}</small>` : ""}</div></div>`;
  const hero = (title, sub, tag, cls) => `<div class="hero-b ${cls || ""}"><div class="hart"><i class="mtn"></i><i class="mtn m2"></i><i class="hmoon"></i>${window.VAWolf ? VAWolf("calm").replace('class="ava', 'class="ava hero-wolf') : ""}</div><h1 class="h1" data-testid="hero-title">${title}</h1><p class="hero-sub">${sub}</p><span class="tag">${tag}</span></div>`;
  const chev = () => `<span class="st">›</span>`;

  /* ---------- список модулей (аккордеон) ---------- */
  function moduleList(limit, openM, tid) {
    const nx = P().next(), out = [];
    for (let m = 1; m <= (limit || 12); m++) {
      const st = P().moduleStats(m), open = openM === m;
      const lessons = L(m).map((ls, i) => `<button type="button" class="lrow${P().isDone(ls.id) ? " done" : ""}${nx && nx.m === m && nx.i === i ? " next" : ""}" data-m="${m}" data-i="${i}" data-testid="lesson-${ls.id}-button"><i class="dot"></i><span>${VA.txt(ls.title, ls.id)}</span><small>${ls.type === "practice" ? VA.t("practice") : VA.t("lesson") + " " + (i + 1)}</small></button>`).join("");
      out.push(`<div class="macc${open ? " open" : ""}${st.complete ? " done" : ""}" data-m="${m}" data-testid="module-${m}-acc"><button type="button" class="mod${nx && nx.m === m ? " next" : ""}" data-m="${m}" data-testid="module-${m}-button"><span class="ico">${String(m).padStart(2, "0")}</span><div><b>${m}. ${VA.modName(m)}</b><div class="muted">${VA.modIntro(m)}</div></div>${st.complete ? `<i class="okmark">${VA.icon("check")}</i>` : ""}${chev()}</button><div class="lessons" data-testid="module-${m}-lessons">${lessons}</div></div>`);
    }
    return `<div class="list acc" data-testid="${tid || "module-list"}">${out.join("")}</div>`;
  }
  function bindList(el) {
    el.querySelectorAll(".macc > .mod").forEach((b) => (b.onclick = () => { const acc = b.parentElement; const was = acc.classList.contains("open"); el.querySelectorAll(".macc.open").forEach((a) => a !== acc && a.classList.remove("open")); acc.classList.toggle("open", !was); VA.haptic("light"); }));
    el.querySelectorAll(".lrow").forEach((b) => (b.onclick = () => openLesson(+b.dataset.m, +b.dataset.i)));
  }

  /* ---------- главная ---------- */
  function openHome() {
    const el = VA.box("home"); if (!el) return;
    const st = P().stats(), nx = P().next();
    let showAll = el.dataset.all === "1";
    el.innerHTML = VA.frame(hero(VA.t("hello"), VA.t("home_hero_sub"), VA.t("home_tag")) +
      VA.talk(VA.t("home_talk"), st.pct === 100 ? "mastered" : st.done ? "calm" : "welcome", "home-wolf-bubble") +
      `<div class="pcard" data-testid="home-progress-card"><div class="kicker">${VA.t("your_progress")}</div><div class="prow">${ring(st.pct, 0, VA.t("of_course"), "home-ring")}<div class="pinfo"><div class="muted" data-testid="home-progress-text">${VA.t("lessons_progress", st)}</div><div class="bar" data-testid="home-progress-bar"><i style="width:${st.pct}%"></i></div>
       <button class="btn btn-primary glow" id="homeCont" data-testid="home-continue-button" type="button">${nx && st.done ? VA.t("continue_learning") : VA.t("start_course")} →</button></div></div></div>
       <div class="rowhead"><h2 class="h2">${VA.t("all_lessons")}</h2><button type="button" class="link" id="homeAll" data-testid="home-show-all">${showAll ? VA.t("hide") : VA.t("show_all", { n: 12 })} ›</button></div>
       ${moduleList(showAll ? 12 : 4, nx ? nx.m : 1, "home-module-list")}${VA.disclaimer(true)}`);
    VA.type(el); bindList(el);
    el.querySelector("#homeCont").onclick = () => { if (nx) openLesson(nx.m, nx.i, true); else openLearn(); };
    el.querySelector("#homeAll").onclick = () => { el.dataset.all = showAll ? "0" : "1"; openHome(); };
  }
  function openLearn(openM) {
    const el = VA.box("learn"); if (!el) return;
    const nx = P().next(); screen("learn");
    el.innerHTML = VA.frame(hero(VA.t("nav_learn"), VA.t("learn_sub"), VA.t("modules_12")) + VA.talk(VA.t("learn_talk"), "watch", "learn-wolf-bubble") + moduleList(12, openM || (nx ? nx.m : 1)));
    VA.type(el); bindList(el);
    if (openM) setTimeout(() => { const a = el.querySelector(`.macc[data-m="${openM}"]`); if (a) a.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
  }
  const openModule = (m) => openLearn(m);

  /* ---------- урок ---------- */
  function openLesson(m, i, resume) {
    const ls = L(m)[i]; if (!ls) return openLearn(m);
    cur = { m, i, ls }; page = resume && P().last() && P().last().m === m && P().last().i === i ? Math.min(P().lastStep(), (ls.pages || []).length - 1) : 0;
    if (ls.type === "practice") { screen("practice"); return openPractice(ls.id); }
    P().setLast(m, i, page); screen("lesson"); renderStory();
  }
  function renderStory() {
    const ls = cur.ls, pages = ls.pages || [], p = pages[page] || {}, el = VA.box("lesson"); if (!el) return;
    const last = page >= pages.length - 1, chart = p.chart && typeof p.chart === "object" ? { ...p.chart, seed: ls.id + page } : null;
    P().setLast(cur.m, cur.i, page);
    el.innerHTML = VA.frame(VA.talk(VA.txt(p.wolf, ls.id) || VA.t("lesson_default_talk"), p.mood || "watch", "lesson-wolf-bubble") +
      `<div class="muted" data-testid="lesson-step">${VA.t("module", { m: cur.m })} · ${VA.t("step", { a: page + 1, b: pages.length })}</div><h2 class="h2" data-testid="lesson-title">${VA.txt(p.title, ls.id) || VA.txt(ls.title, ls.id)}</h2>
       <div class="sub lesson-html" data-testid="lesson-html">${VA.txt(p.html, ls.id)}</div>${chart ? VAChart.html(chart) : ""}
       <div class="dots">${pages.map((_, k) => `<i class="${k === page ? "on" : k < page ? "done" : ""}"></i>`).join("")}</div>
       <div class="duo"><button class="btn btn-ghost" id="prev" data-testid="lesson-prev-button" type="button">${VA.t("back")}</button><button class="btn btn-primary" id="nx" data-testid="lesson-next-button" type="button">${last ? VA.t("finish") : VA.t("next")}</button></div>`);
    el.scrollTop = 0; const sh = el.querySelector(".sheet"); if (sh) sh.classList.add("swap-" + dir);
    if (chart) VAChart.mount(el, chart); VA.type(el);
    el.querySelector("#prev").onclick = () => { dir = "prev"; if (page > 0) { page--; renderStory(); } else openLearn(cur.m); };
    el.querySelector("#nx").onclick = () => {
      dir = "next"; if (!last) { page++; renderStory(); return; }
      if (P().markDone(ls.id)) { VA.toast(VA.t("lesson_done_toast")); VA.haptic("success"); }
      if (cur.i + 1 < L(cur.m).length) openLesson(cur.m, cur.i + 1); else openLearn(cur.m);
    };
  }

  /* ---------- Practice Lab ---------- */
  const tasks = () => P().all().filter((x) => x.ls.type === "practice").map((x) => ({ ...x, meta: B()[x.ls.id] || { cat: "context", diff: "medium", key: "C" } }));
  function buildQueue() {
    let q = tasks();
    if (lab.weak) { const weak = P().topics().filter((t) => t.pct < 80).map((t) => t.cat); if (weak.length) q = q.slice().sort((a, b) => (weak.indexOf(a.meta.cat) === -1 ? 99 : weak.indexOf(a.meta.cat)) - (weak.indexOf(b.meta.cat) === -1 ? 99 : weak.indexOf(b.meta.cat))); }
    else { if (lab.cat !== "all") q = q.filter((x) => x.meta.cat === lab.cat); if (lab.diff !== "all") q = q.filter((x) => x.meta.diff === lab.diff); }
    lab.queue = q;
  }
  function openPractice(startId) {
    const el = VA.box("practice"); if (!el) return;
    buildQueue(); lab.idx = Math.max(0, lab.queue.findIndex((x) => x.ls.id === startId)); lab.sel = null; lab.checked = false;
    const st = P().stats();
    const chip = (k, on, tid, label) => `<button type="button" class="chip${on ? " on" : ""}" data-k="${k}" data-testid="${tid}">${label}</button>`;
    el.innerHTML = VA.frame(hero(VA.t("nav_practice"), VA.t("practice_hero_sub"), VA.t("practice_tag")) +
      `<div class="stats3" data-testid="practice-stats"><div><span class="sico">${VA.icon("practice")}</span><b data-testid="stat-solved">${st.answered}</b><small>${VA.t("solved")}</small></div><div><span class="sico">${VA.icon("learn")}</span><b data-testid="stat-accuracy">${st.accuracy}%</b><small>${VA.t("accuracy")}</small></div><div><span class="sico fire">🔥</span><b data-testid="stat-streak">${st.streak}</b><small>${VA.t("streak_days")}</small></div></div>
       <div class="chips" id="cats" data-testid="practice-filter-cats">${chip("all", lab.cat === "all" && !lab.weak, "filter-cat-all", VA.t("filter_all"))}${CATS.map((c) => chip(c, lab.cat === c && !lab.weak, "filter-cat-" + c, VA.t("cat_" + c))).join("")}</div>
       <div class="chips" id="diffs" data-testid="practice-filter-diffs">${chip("all", lab.diff === "all", "filter-diff-all", VA.t("diff_all"))}${["easy", "medium", "hard"].map((d) => chip(d, lab.diff === d, "filter-diff-" + d, VA.t("diff_" + d))).join("")}</div>
       <button type="button" class="btn btn-ghost${lab.weak ? " on-weak" : ""}" id="weakBtn" data-testid="practice-weak-button">${VA.icon("spark")} ${VA.t("weak_mode")}</button>
       <div id="task"></div>`);
    el.querySelectorAll("#cats .chip").forEach((b) => (b.onclick = () => { lab.cat = b.dataset.k; lab.weak = false; openPractice(); }));
    el.querySelectorAll("#diffs .chip").forEach((b) => (b.onclick = () => { lab.diff = b.dataset.k; lab.weak = false; openPractice(); }));
    el.querySelector("#weakBtn").onclick = () => { lab.weak = !lab.weak; openPractice(); };
    renderTask();
  }
  function renderTask() {
    const el = VA.box("practice"), box = el && el.querySelector("#task"); if (!box) return;
    if (lab.ctl) { lab.ctl.pause(); lab.ctl = null; }
    const x = lab.queue[lab.idx];
    if (!x) { box.innerHTML = `<p class="sub" data-testid="practice-empty">${VA.t("no_tasks")}</p>`; return; }
    const ls = x.ls, meta = x.meta, id = ls.id, again = !!(P().practice(id) && P().practice(id).ok);
    const spec = { ...(ls.chart || { p: "chop" }), seed: id, question: true, axis: true, n: 26 };
    const OPTS = [["A", VA.label("call"), VA.t("opt_a_sub")], ["B", VA.label("put"), VA.t("opt_b_sub")], ["C", VA.t("opt_c"), VA.t("opt_c_sub")], ["D", VA.t("opt_d"), VA.t("opt_d_sub")]];
    box.innerHTML = `<div class="task" data-testid="practice-task" data-id="${id}">
      <div class="trow"><span class="muted" data-testid="practice-task-n">${VA.t("task_n", { a: lab.idx + 1, b: lab.queue.length })}</span><span class="pill d-${meta.diff}" data-testid="practice-difficulty">${VA.t("diff_" + meta.diff)}</span></div>
      <h2 class="h2">${VA.t("question")}</h2><p class="sub" data-testid="practice-scenario">${VA.txt(ls.scenario, id)}</p>
      <div class="live tall"><canvas class="scene" data-testid="scenario-chart"></canvas></div>
      <div class="replay"><button type="button" class="rbtn" id="rPlay" data-testid="replay-play">▶ ${VA.t("play")}</button><button type="button" class="rbtn" id="rPause" data-testid="replay-pause">❚❚ ${VA.t("pause")}</button><button type="button" class="rbtn" id="rReplay" data-testid="replay-replay">↺ ${VA.t("replay")}</button><span class="muted">${VA.t("cat_" + meta.cat)}</span></div>
      <div class="opts" data-testid="practice-options">${OPTS.map(([k, t, s]) => `<button type="button" class="opt" data-k="${k}" data-testid="practice-option-${k}"><i class="radio"></i><b>${k}</b><span><em>${t}</em><small>${s}</small></span></button>`).join("")}</div>
      <div class="mentor" data-testid="practice-mentor">${VAWolf("think")}<div class="mbub"><b>${VA.t("mentor_tip")}:</b> <span id="mtext">«${VA.txt(ls.wolf, id)}»</span></div></div>
      ${again ? `<div class="muted note" data-testid="practice-repeat-note">${VA.t("solved_before")}</div>` : ""}
      <div id="fb"></div>
      <button class="btn btn-primary glow" id="check" data-testid="practice-check-button" type="button" disabled>${VA.t("check_answer")}</button>
      <button class="btn btn-ok hide" id="nextT" data-testid="practice-next-button" type="button">${VA.t("next_task")}</button></div>`;
    lab.sel = null; lab.checked = false;
    lab.ctl = VAChart.replay(box, spec);
    box.querySelector("#rPlay").onclick = () => lab.ctl && lab.ctl.play();
    box.querySelector("#rPause").onclick = () => lab.ctl && lab.ctl.pause();
    box.querySelector("#rReplay").onclick = () => lab.ctl && lab.ctl.replay();
    const check = box.querySelector("#check");
    box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => { if (lab.checked) return; lab.sel = b.dataset.k; box.querySelectorAll(".opt").forEach((o) => o.classList.toggle("sel", o === b)); check.disabled = false; VA.haptic("light"); }));
    check.onclick = () => {
      if (!lab.sel || lab.checked) return; lab.checked = true; if (lab.ctl) lab.ctl.finish();
      const ok = lab.sel === meta.key, kind = { A: "call", B: "put", C: "wait", D: "wait" };
      box.querySelectorAll(".opt").forEach((o) => { o.disabled = true; o.classList.toggle("right", o.dataset.k === meta.key); o.classList.toggle("wrongpick", o.dataset.k === lab.sel && !ok); });
      P().setPractice(id, ok, meta.cat); VA.haptic(ok ? "success" : "error");
      const ava = box.querySelector(".mentor .ava"); if (window.VASetMood) VASetMood(ava, ok ? "correct" : "warning");
      const wrongTxt = !ok && ls.wrong && ls.wrong[kind[lab.sel]] ? VA.txt(ls.wrong[kind[lab.sel]], id) : "";
      box.querySelector("#mtext").textContent = ok ? VA.t("correct") + ". " + VA.txt(ls.explain, id).split(". ")[0] + "." : wrongTxt || VA.txt(ls.explain, id);
      box.querySelector("#fb").innerHTML = `<div class="feedback ${ok ? "good" : "bad"}" data-testid="practice-feedback"><b data-testid="practice-verdict">${ok ? "✓ " + VA.t("correct") + "!" : "✕ " + VA.t("wrong")}</b><p><b>${VA.t("why")}:</b> ${VA.txt(ls.explain, id)}</p>${wrongTxt ? `<p>${wrongTxt}</p>` : ""}
        ${VA.CFG.api ? `<button type="button" class="btn btn-ghost glow-soft" id="askAi" data-testid="practice-ask-ai-button">${VA.icon("spark")} ${VA.t("ask_ai")}</button><div id="aiBox"></div>` : ""}</div>`;
      const askBtn = box.querySelector("#askAi");
      if (askBtn) askBtn.onclick = async () => {
        askBtn.disabled = true; const ab = box.querySelector("#aiBox");
        ab.innerHTML = `<div class="mentor ai" data-testid="ai-explain"><div class="ava mood-think"></div><div class="mbub"><b>${VA.t("mentor_tip")}:</b> <span class="bubble typing" data-testid="ai-explain-text">${VA.t("ai_thinking")}</span></div></div>`;
        if (window.VASetMood) VASetMood(ab.querySelector(".ava"), "think");
        const chosenLabel = OPTS.find((o) => o[0] === lab.sel)[1], correctLabel = OPTS.find((o) => o[0] === meta.key)[1];
        try {
          const text = await VA.mentor("explain", { scenario: VA.txt(ls.scenario, id), chosen: chosenLabel, correct: correctLabel, base_explain: VA.txt(ls.explain, id), task_id: id });
          const span = ab.querySelector("[data-testid=ai-explain-text]"); span.classList.remove("typing"); span.textContent = ""; span.setAttribute("data-type", text); VA.type(ab);
          if (window.VASetMood) VASetMood(ab.querySelector(".ava"), ok ? "correct" : "calm");
        } catch (e) { ab.querySelector("[data-testid=ai-explain-text]").textContent = VA.t("ai_error"); askBtn.disabled = false; }
      };
      check.classList.add("hide"); box.querySelector("#nextT").classList.remove("hide");
      refreshStats();
    };
    box.querySelector("#nextT").onclick = () => { const t = box.querySelector(".task"); t.classList.add("fade"); setTimeout(() => { lab.idx = (lab.idx + 1) % lab.queue.length; renderTask(); }, 260); };
  }
  function refreshStats() {
    const st = P().stats(), el = VA.box("practice"); if (!el) return;
    const s = (id, v) => { const n = el.querySelector(`[data-testid="${id}"]`); if (n) n.textContent = v; };
    s("stat-solved", st.answered); s("stat-accuracy", st.accuracy + "%"); s("stat-streak", st.streak);
  }

  /* ---------- профиль ---------- */
  function openProfile(showAllAch) {
    const el = VA.box("profile"); if (!el) return;
    const st = P().stats(), lv = P().level(), nx = P().next(), names = VA.t("level_names"), topics = P().topics();
    const ach = P().achievements();
    const achIcons = { first_step: "spark", five_lessons: "learn", practitioner: "practice", sharp: "check", streak3: "spark", streak7: "spark", candle_expert: "learn", final: "profile" };
    const hexes = ach.map((a) => `<div class="hex${a.unlocked ? " on" : ""}" data-testid="ach-${a.id}" title="${VA.t("ach_" + a.id)}">${a.unlocked ? VA.icon(achIcons[a.id]) : "🔒"}</div>`).join("");
    const achList = ach.map((a) => `<div class="arow${a.unlocked ? " on" : ""}" data-testid="ach-row-${a.id}"><div class="hex${a.unlocked ? " on" : ""}">${a.unlocked ? VA.icon(achIcons[a.id]) : "🔒"}</div><div><b>${VA.t("ach_" + a.id)}</b><small>${VA.t("ach_" + a.id + "_d")} · +${a.xp} XP</small></div><span class="pill ${a.unlocked ? "d-easy" : ""}">${VA.t(a.unlocked ? "ach_unlocked" : "ach_locked")}</span></div>`).join("");
    const weak = topics.length ? topics.slice(0, 4).map((t) => `<div class="wrow" data-testid="weak-${t.cat}"><span>${VA.t("cat_" + t.cat)}</span><div class="bar"><i style="width:${t.pct}%;background:${t.pct < 70 ? "#fb7185" : t.pct < 85 ? "#ffd56a" : "#3dff9a"}"></i></div><b>${t.pct}%</b><button type="button" class="link" data-m="${(window.VA_CAT_MODULE || {})[t.cat] || 1}" data-testid="repeat-${t.cat}">${VA.t("repeat_topic")} ›</button></div>`).join("") : `<p class="muted">${VA.t("weak_empty")}</p>`;
    const langs = VA.LANGS.map((l) => `<button type="button" class="lbtn${l === VA.lang() ? " on" : ""}" data-l="${l}" data-testid="lang-${l}-button">${{ ru: "Русский", uk: "Українська", ar: "العربية" }[l]}${l === VA.lang() ? " ✓" : ""}</button>`).join("");
    el.innerHTML = VA.frame(hero(VA.t("profile_hero"), VA.t("profile_hero_sub"), "", "hero-p") +
      `<div class="quote" data-testid="profile-quote">«${VA.t("quote_1")}»<small>— ${VA.t("quote_by")}</small></div>
       <div class="pcard" data-testid="profile-overall"><div class="prow">${ring(st.pct, 0, "", "profile-ring")}<div class="pinfo"><b>${VA.t("overall")}</b><div class="muted" data-testid="profile-modules-text">${VA.t("modules_done_of", { a: st.modules, b: 12 })}</div><div class="bar" data-testid="profile-progress-bar"><i style="width:${st.pct}%"></i></div><div class="muted">${VA.t("on_track")}</div></div></div></div>
       <div class="grid2 cards2">
         <div class="c2" data-testid="profile-xp"><span class="sico">★</span><small>${VA.t("xp_title")}</small><b id="xpVal">${st.xp.toLocaleString("ru-RU")}</b><small>${VA.t("xp_sub")}</small></div>
         <div class="c2" data-testid="profile-level"><span class="sico">${VA.icon("learn")}</span><small>${VA.t("level_title")}</small><div class="lvl"><i class="shield">${lv.n}</i><div><b>${names[lv.n - 1]}</b><small>${lv.next ? VA.t("to_next", { n: lv.toNext }) : VA.t("level_max")}</small></div></div><div class="bar"><i style="width:${lv.pct}%"></i></div></div>
         <div class="c2" data-testid="profile-modules"><span class="sico">${VA.icon("learn")}</span><small>${VA.t("modules_title")}</small><b>${st.modules} / 12</b><div class="bar"><i style="width:${Math.round((st.modules / 12) * 100)}%"></i></div><small>${VA.t("modules_left", { n: 12 - st.modules })}</small></div>
         <div class="c2" data-testid="profile-streak"><span class="sico fire">🔥</span><small>${VA.t("streak_title")}</small><b>${VA.t("days_n", { n: st.streak })}</b><small>${VA.t("streak_sub")}</small></div>
       </div>
       <div class="c2 wide" data-testid="profile-achievements"><div class="rowhead"><div><small>${VA.t("ach_title")}</small><b>${st.achievements} / ${st.achTotal}</b></div><button type="button" class="link" id="achAll" data-testid="profile-all-achievements">${showAllAch ? VA.t("hide") : VA.t("ach_all")} ›</button></div><div class="hexes">${hexes}</div>${showAllAch ? `<div class="alist" data-testid="achievements-list">${achList}</div>` : ""}</div>
       <div class="c2 wide" data-testid="profile-stats"><small>${VA.t("stats_title")}</small><div class="statgrid"><div><b data-testid="profile-lessons-done">${st.done}</b><small>${VA.t("st_lessons")}</small></div><div><b data-testid="profile-practices-ok">${st.answered}</b><small>${VA.t("st_practices")}</small></div><div><b data-testid="profile-accuracy">${st.accuracy}%</b><small>${VA.t("st_accuracy")}</small></div><div><b data-testid="profile-days">${st.days}</b><small>${VA.t("st_days")}</small></div></div></div>
       <div class="c2 wide" data-testid="profile-weak"><small>${VA.t("weak_title")}</small>${weak}</div>
       <div class="c2 wide" data-testid="lang-switcher"><span class="sico">🌐</span><small>${VA.t("lang_title")}</small><div class="lbtns">${langs}</div></div>
       ${nx ? `<button class="btn btn-primary glow" id="pfCont" data-testid="profile-continue-button" type="button">${VA.t("continue_learning")} →</button>` : `<p class="sub" data-testid="profile-complete">${VA.t("course_complete")}</p>`}
       <p class="motto">${VA.t("motto")}</p>${VA.disclaimer(true)}
       <button class="btn btn-ghost" id="pfReset" data-testid="profile-reset-button" type="button">${VA.t("dev_reset")}</button>`);
    const c = el.querySelector("#pfCont"); if (c) c.onclick = () => openLesson(nx.m, nx.i, true);
    el.querySelector("#achAll").onclick = () => openProfile(!showAllAch);
    el.querySelectorAll(".lbtn").forEach((b) => (b.onclick = () => { VA.setLang(b.dataset.l); openProfile(showAllAch); }));
    el.querySelectorAll("[data-testid^=repeat-]").forEach((b) => (b.onclick = () => { screen("learn"); openLearn(+b.dataset.m); }));
    el.querySelector("#pfReset").onclick = () => { P().reset(); VA.toast(VA.t("reset_done")); openProfile(); };
  }

  window.VAOpenHome = openHome; window.VAOpenLearn = () => openLearn(); window.VAOpenModule = openModule; window.VAOpenLesson = openLesson;
  window.VAOpenPractice = () => openPractice(); window.VAOpenProfile = () => openProfile();
})();
