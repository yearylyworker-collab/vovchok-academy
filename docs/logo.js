(() => {
  window.VALogo = function (sub) {
    return `<div class="logo-stage">
      <div class="logo-word" aria-label="VOVCHOK"><b>V</b><b>O</b><b>V</b><b>C</b><b>H</b><b>O</b><b>K</b></div>
      <div class="logo-academy">ACADEMY</div>
      ${sub ? `<div class="logo-sub">${sub}</div>` : ""}
    </div>`;
  };
  function upgrade() {
    document.querySelectorAll(".hero").forEach((h) => {
      if (h.querySelector(".logo-stage")) return;
      const sub = (h.querySelector(".hero-cap span") || {}).textContent || "";
      h.outerHTML = window.VALogo(sub);
    });
    document.querySelectorAll(".logo-walk,.logo-static").forEach((el) => el.remove());
  }
  window.VAUpgradeLogos = upgrade;
  setTimeout(upgrade, 40);
  setTimeout(upgrade, 200);
  setTimeout(upgrade, 700);
})();
