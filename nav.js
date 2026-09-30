/* เมนู "โครงการ ▾" ที่ใช้ร่วมกันทุกหน้า
   รวมระบบเขียนโครงการและตารางติวไว้ใต้หัวข้อเดียว และเพิ่มโครงการใหม่ได้ในภายหลัง
   รายชื่อโครงการเก็บในเบราว์เซอร์เครื่องนี้ (nk_projects_v1) */
(function () {
  "use strict";
  const REG_KEY = "nk_projects_v1";
  const BUILTIN = [{ id: "tutor2569", name: "โครงการติวเข้มปิดภาคเรียน", year: "2569", builtin: true }];

  /** รายชื่อโครงการทั้งหมด — โครงการตั้งต้นอยู่บนสุดเสมอ */
  function projects() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(REG_KEY) || "[]"); } catch (e) { saved = []; }
    if (!Array.isArray(saved)) saved = [];
    const ids = new Set(saved.map(p => p.id));
    return BUILTIN.filter(b => !ids.has(b.id)).concat(saved).filter(p => !p.hidden);
  }
  window.NK_PROJECTS = { REG_KEY, BUILTIN, projects };

  const TH = "๐๑๒๓๔๕๖๗๘๙";
  const thNum = s => String(s == null ? "" : s).replace(/[0-9]/g, d => TH[d]);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function menuHTML() {
    return projects().map(p => `<a href="projects.html?p=${encodeURIComponent(p.id)}">
        <b>${esc(p.name)}</b><small>${p.year ? "ปีการศึกษา " + thNum(esc(p.year)) : "&nbsp;"}</small></a>`).join("")
      + `<hr><a href="projects.html?new=1" class="nkdd-add">+ เพิ่มโครงการใหม่</a>`;
  }
  window.NK_PROJECTS.refresh = () => { const m = document.querySelector(".nkdd-m"); if (m) m.innerHTML = menuHTML(); };

  function build() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || nav.querySelector(".nkdd")) return;
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const inProj = ["projects.html", "project.html", "tutoring.html"].includes(page);

    /* เอาลิงก์ระบบโครงการและตารางติวออกจากแถบบน ไปไว้ในหน้าโครงการแทน */
    nav.querySelectorAll('a[href="project.html"], a[href="tutoring.html"]').forEach(a => a.remove());

    const dd = document.createElement("div");
    dd.className = "nkdd";
    dd.innerHTML = `<a href="projects.html" class="nkdd-t"${inProj ? ' aria-current="page"' : ""}
        aria-haspopup="true" aria-expanded="false">โครงการ ▾</a>
      <div class="nkdd-m" role="menu">${menuHTML()}</div>`;
    const first = nav.querySelector("a");
    if (first && first.nextSibling) nav.insertBefore(dd, first.nextSibling); else nav.appendChild(dd);

    const trig = dd.querySelector(".nkdd-t");
    trig.addEventListener("click", e => {
      /* แตะครั้งแรกเปิดเมนู แตะซ้ำไปหน้ารวมโครงการ — ใช้งานบนมือถือได้ */
      if (!dd.classList.contains("open")) { e.preventDefault(); dd.classList.add("open"); trig.setAttribute("aria-expanded", "true"); }
    });
    document.addEventListener("click", e => {
      if (!dd.contains(e.target)) { dd.classList.remove("open"); trig.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") dd.classList.remove("open"); });

    if (!document.getElementById("nkdd-css")) {
      const st = document.createElement("style");
      st.id = "nkdd-css";
      st.textContent = `
.nkdd{position:relative;display:inline-flex}
.nkdd-m{display:none;position:absolute;top:calc(100% + 6px);left:0;min-width:17rem;z-index:1000;
  background:var(--surface,#fff);border:1px solid var(--rule,#D7DEEA);border-radius:8px;box-shadow:0 10px 28px rgba(14,42,86,.18);padding:.35rem}
.nkdd:hover .nkdd-m,.nkdd.open .nkdd-m,.nkdd:focus-within .nkdd-m{display:block}
.nkdd-m::before{content:"";position:absolute;top:-8px;left:0;right:0;height:8px}
.tabs .nkdd-m a{display:block;color:var(--ink,#16233A);background:none;border:none;border-radius:6px;padding:.5rem .7rem;
  font-weight:600;font-size:.86rem;white-space:nowrap}
.tabs .nkdd-m a:hover{background:var(--surface-2,#EEF1F6);color:var(--ink,#0E2A56)}
.tabs .nkdd-m a small{display:block;font-weight:400;font-size:.74rem;color:var(--ink-3,#5A6B85)}
.tabs .nkdd-m a.nkdd-add{color:var(--navy-3,#0E2A56)}
.nkdd-m hr{border:none;border-top:1px solid var(--rule,#E4E9F1);margin:.3rem .2rem}
@media print{.nkdd-m{display:none!important}}`;
      document.head.appendChild(st);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
