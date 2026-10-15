// Экраны «Дневник стройки» и «Сроки» из одного источника — STAGES в diary-data.js.
// Дневник: сводка, карточки этапов (по номеру), панель этапа с записями по дням.
// Панель закрывается свайпом вниз, тапом по фону, крестиком, Esc и кнопкой «Назад» Telegram (через app.js).
(function(){
if(!window.STAGES || !window.CalcApp) return;
var F = CalcApp.fmt, NB = " ", TOTAL = STAGES.length;
var MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
var STATUS = {next: "Впереди", now: "Сейчас", done: "Готово"};
var WARN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
// «7 × 4 м», «Rp 400», «22 сваи» не разрываются по строкам
function keep(s){ return esc(s).replace(/(\d) × (\d)/g, "$1" + NB + "×" + NB + "$2").replace(/(\d|Rp) (?=[\dа-яё])/gi, "$1" + NB); }
function grp(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
function money(rp){
  rp = Number(rp) || 0;
  if(!rp) return "Rp" + NB + "0";
  return rp >= 1e6 ? "Rp" + NB + F.mln(rp) + NB + "млн" : "Rp" + NB + grp(rp);
}
function moneyRange(c){ return "Rp" + NB + F.rangeMln(c[0], c[1]); }
function plural(n, one, few, many){
  n = Math.abs(n) % 100; var d = n % 10;
  return n > 10 && n < 20 ? many : d === 1 ? one : d > 1 && d < 5 ? few : many;
}
function dayWord(n){ return plural(n, "день", "дня", "дней"); }
function daysRange(d){ return d[0] === d[1] ? d[0] + NB + dayWord(d[0]) : d[0] + "–" + d[1] + NB + dayWord(d[1]); }
function date(s){
  var p = String(s || "").split("-");
  return p.length === 3 ? Number(p[2]) + NB + MONTHS[Number(p[1]) - 1] + NB + p[0] : esc(s);
}

// Фото: обычная картинка с ленивой загрузкой. Чертёж из drawings/ вставляем в страницу (drawings.js)
// на светлом листе — линии видны и в тёмной теме.
var DWG = /^drawings\/([\w-]+)\.svg$/;
function media(src, cls, alt){
  var m = DWG.exec(src);
  if(m) return '<span class="' + cls + ' dwg-host dwg-light" data-diary-dwg="' + m[1] + '" role="img" aria-label="' + esc(alt || "Чертёж") + '"></span>';
  return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="lazy">';
}
function hydrate(el){
  if(!window.Viewer) return;
  Array.prototype.forEach.call(el.querySelectorAll("[data-diary-dwg]"), function(x){ Viewer.put(x, x.dataset.diaryDwg); });
}

// Расчёты по этапам
function spentOf(st){
  if(st.status === "done" && st.fact) return Number(st.fact.cost) || 0;
  return (st.entries || []).reduce(function(t, e){ return t + (Number(e.spent) || 0); }, 0);
}
// Превью этапа: последнее фото последней записи с фото, иначе запасная картинка cover
function coverOf(st){
  var es = (st.entries || []).slice().sort(function(a, b){ return b.day - a.day; });
  for(var i = 0; i < es.length; i++){ var ph = es[i].photos || []; if(ph.length) return ph[ph.length - 1]; }
  return st.cover || "";
}
function currentStage(){
  for(var i = 0; i < TOTAL; i++) if(STAGES[i].status === "now") return STAGES[i];
  for(i = 0; i < TOTAL; i++) if(STAGES[i].status !== "done") return STAGES[i];
  return STAGES[TOTAL - 1];
}
function lastDay(){
  var d = -1;
  STAGES.forEach(function(st){ (st.entries || []).forEach(function(e){ if(e.day > d) d = e.day; }); });
  return d;
}
// Разница факта с планом: выше верхней границы — перерасход, ниже нижней — экономия
function delta(st){
  var f = Number(st.fact && st.fact.cost) || 0, c = st.plan.cost;
  if(f > c[1]) return '<span class="stage-delta is-over">+' + money(f - c[1]) + ' к плану</span>';
  if(f < c[0]) return '<span class="stage-delta is-under">−' + money(c[0] - f) + ' к плану</span>';
  return '<span class="stage-delta">в рамках плана</span>';
}
function factLine(st){
  if(st.status !== "done" || !st.fact) return "";
  return '<span class="stage-line">Факт: ' + money(st.fact.cost) + " · " + st.fact.days + NB + dayWord(st.fact.days) + " " + delta(st) + '</span>';
}
function nw(s){ return '<span class="nw">' + s + '</span>'; } // диапазон «5–10 дней» не рвётся на тире
function planLine(st){ return "План: " + nw("≈" + NB + moneyRange(st.plan.cost)) + " · " + nw("≈" + NB + daysRange(st.plan.days)); }

// ---------- Экран «Сроки» ----------
var steps = document.getElementById("stepsList");
if(steps){
  var ld = lastDay(), cur = currentStage();
  document.getElementById("stepsDay").innerHTML = "День" + NB + Math.max(0, ld) +
    "<small>" + (ld < 0 ? "Счётчик запустим в день разметки участка." : "Этап " + cur.n + " из " + TOTAL + ": " + esc(cur.name)) + "</small>";
  steps.innerHTML = STAGES.map(function(st){
    return '<li class="is-' + st.status + '"><span>' + esc(st.name) + '</span><em>' + nw("≈" + NB + daysRange(st.plan.days)) + " · " +
      STATUS[st.status].toLowerCase() + '</em></li>';
  }).join("");
}

// ---------- Экран «Дневник» ----------
var root = document.getElementById("diary");
if(!root) return;

var planAll = [0, 0], spentAll = 0;
STAGES.forEach(function(st){ planAll[0] += st.plan.cost[0]; planAll[1] += st.plan.cost[1]; spentAll += spentOf(st); });
document.getElementById("diarySum").innerHTML = "<b>Этап" + NB + currentStage().n + " из " + TOTAL + "</b> · План всего ≈" + NB +
  moneyRange(planAll) + " · Потрачено " + money(spentAll);

var feed = document.getElementById("diaryFeed");
feed.innerHTML = STAGES.slice().sort(function(a, b){ return a.n - b.n; }).map(function(st){
  var cv = coverOf(st);
  return '<li><button type="button" class="stage-card is-' + st.status + '" data-n="' + st.n + '">' +
    (cv ? media(cv, "stage-thumb", "") : '<span class="stage-thumb"></span>') +
    '<span class="stage-body"><span class="stage-head"><span class="stage-title"><span class="stage-n">Этап' + NB + st.n + '</span>' +
      '<b class="stage-name">' + esc(st.name) + '</b></span>' +
      '<span class="stage-status is-' + st.status + '">' + STATUS[st.status] + '</span></span>' +
    '<span class="stage-line">' + planLine(st) + '</span>' +
    factLine(st) +
    '<span class="stage-risk">Риск: ' + keep(st.risk) + '</span>' +
  '</span></button></li>';
}).join("");
window.addEventListener("DOMContentLoaded", function(){ hydrate(feed); }); // drawings.js подключён после этого файла

// ---------- Панель этапа ----------
var sheet = document.getElementById("diarySheet"), backdrop = document.getElementById("diaryBackdrop"),
    body = document.getElementById("diaryBody"), open = false, opener = null;

function entryHtml(e){
  var photos = e.photos || [];
  return '<li class="entry">' +
    '<div class="diary-meta">День' + NB + e.day + " · " + date(e.date) + '</div>' +
    '<b class="entry-title">' + keep(e.title) + '</b>' +
    (photos.length ? '<div class="diary-gallery">' + photos.map(function(p, k){
      return media(p, "diary-shot", "Фото " + (k + 1) + " из " + photos.length); }).join("") + '</div>' : "") +
    '<p>' + keep(e.text) + '</p>' +
    '<p class="diary-spent">Потрачено за день: ' + money(e.spent) + '</p>' +
    (e.video ? '<a class="diary-video" href="' + esc(e.video) + '" target="_blank" rel="noopener">Смотреть видео в канале</a>' : "") +
    (e.mistake ? '<div class="diary-mistake"><b>' + WARN + 'Ошибка</b><p>' + keep(e.mistake) + '</p></div>' : "") +
  '</li>';
}
function detail(st){
  var entries = (st.entries || []).slice().sort(function(a, b){ return b.day - a.day; });
  var f = st.status === "done" && st.fact, cv = coverOf(st), dw = DWG.exec(cv);
  // Картинка этапа крупно; по нажатию — на весь экран (drawings.js: data-dwg — чертёж, data-img — фото)
  var hero = cv ? '<button type="button" class="stage-hero" ' + (dw ? 'data-dwg="' + dw[1] + '"' : 'data-img="' + esc(cv) + '" data-title="' + esc(st.name) + '"') +
    ' aria-label="Открыть картинку этапа на весь экран">' + media(cv, "stage-hero-media", st.name) + '</button>' : "";
  return hero +
    '<div class="stage-sub"><span class="diary-meta">Этап' + NB + st.n + " из " + TOTAL + '</span>' +
      '<span class="stage-status is-' + st.status + '">' + STATUS[st.status] + '</span></div>' +
    '<h3 class="diary-h" id="diaryTitle">' + esc(st.name) + '</h3>' +
    '<p>' + keep(st.about) + '</p>' +
    '<dl class="stage-facts">' +
      '<div><dt>Кто делает</dt><dd>' + esc(st.plan.who) + '</dd></div>' +
      '<div><dt>План</dt><dd>' + nw("≈" + NB + moneyRange(st.plan.cost)) + " · " + nw("≈" + NB + daysRange(st.plan.days)) + '</dd></div>' +
      (f ? '<div><dt>Факт</dt><dd>' + money(st.fact.cost) + " · " + st.fact.days + NB + dayWord(st.fact.days) +
           (st.fact.start ? " · " + date(st.fact.start) + "–" + date(st.fact.end) : "") + " " + delta(st) + '</dd></div>' : "") +
      '<div><dt>Риск</dt><dd>' + keep(st.risk) + '</dd></div>' +
    '</dl>' +
    ((st.tips || []).length ? '<div class="stage-tips"><b>Подсказки</b><ul>' +
      st.tips.map(function(t){ return "<li>" + keep(t) + "</li>"; }).join("") + '</ul></div>' : "") +
    '<h4 class="entries-h">Записи по дням</h4>' +
    (entries.length ? '<ol class="entries">' + entries.map(entryHtml).join("") + '</ol>'
                    : '<p class="small">Записи появятся, когда этап начнётся.</p>');
}

function show(n, from){
  var st = STAGES.filter(function(x){ return x.n === n; })[0]; if(!st) return;
  opener = from || null;
  body.innerHTML = '<button type="button" class="diary-close" id="diaryClose" aria-label="Закрыть">×</button>' + detail(st);
  body.scrollTop = 0;
  hydrate(body);
  document.getElementById("diaryClose").addEventListener("click", hide);
  open = true;
  sheet.setAttribute("aria-hidden", "false"); sheet.classList.add("open"); backdrop.classList.add("open");
  if(window.haptic) window.haptic();
  if(window.syncTg) window.syncTg();
  setTimeout(function(){ sheet.focus(); }, 50);
}
function hide(){
  if(!open) return;
  open = false;
  sheet.setAttribute("aria-hidden", "true"); sheet.classList.remove("open"); backdrop.classList.remove("open");
  sheet.style.transform = "";
  if(window.syncTg) window.syncTg();
  if(opener) opener.focus();
}

// Telegram-ссылки открываем внутри Telegram
body.addEventListener("click", function(ev){
  var a = ev.target.closest(".diary-video"); if(!a) return;
  var tg = window.Telegram && Telegram.WebApp;
  if(tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(a.href)){ ev.preventDefault(); tg.openTelegramLink(a.href); }
});
feed.addEventListener("click", function(ev){
  var b = ev.target.closest(".stage-card"); if(b) show(Number(b.dataset.n), b);
});
backdrop.addEventListener("click", hide);
document.addEventListener("keydown", function(ev){
  if(open && ev.key === "Escape" && !(window.Viewer && Viewer.isOpen())) hide(); // сначала закрывается картинка на весь экран
});

// Свайп вниз закрывает панель; горизонтальный свайп листает галерею и панель не двигает
var sx = null, sy = 0, mode = "";
sheet.addEventListener("touchstart", function(ev){
  sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; mode = "";
}, {passive: true});
sheet.addEventListener("touchmove", function(ev){
  if(sx === null) return;
  var dx = ev.touches[0].clientX - sx, dy = ev.touches[0].clientY - sy;
  if(!mode && Math.abs(dx) + Math.abs(dy) > 8) mode = (Math.abs(dy) > Math.abs(dx) && dy > 0 && body.scrollTop <= 0) ? "drag" : "other";
  if(mode === "drag"){ sheet.style.transition = "none"; sheet.style.transform = "translateY(" + Math.max(0, dy) + "px)"; }
}, {passive: true});
sheet.addEventListener("touchend", function(ev){
  if(sx === null) return;
  var dy = ev.changedTouches[0].clientY - sy, was = mode; sx = null; mode = "";
  if(was !== "drag") return;
  sheet.style.transition = "";
  dy > 80 ? hide() : (sheet.style.transform = "");
});

window.Diary = {open: show, close: hide, isOpen: function(){ return open; }};
})();
