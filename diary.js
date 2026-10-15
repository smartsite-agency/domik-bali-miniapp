// Экран «Дневник стройки»: сводка, лента карточек и панель с подробностями. Записи — в diary-data.js.
// Панель закрывается свайпом вниз, тапом по фону, крестиком, Esc и кнопкой «Назад» Telegram (через app.js).
(function(){
var root = document.getElementById("diary");
if(!root || !window.DIARY) return;
var NB = " ";
var MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
var WARN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
// «7 × 4 м», «Rp 400», «22 сваи» не разрываются по строкам
function keep(s){ return esc(s).replace(/(\d) × (\d)/g, "$1" + NB + "×" + NB + "$2").replace(/(\d|Rp) (?=[\dа-яё])/gi, "$1" + NB); }
function grp(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
function money(rp){
  if(!rp) return "Rp" + NB + "0";
  if(rp >= 1e6){ var m = Math.round(rp/1e5)/10; return "Rp" + NB + String(m).replace(".", ",") + NB + "млн"; }
  return "Rp" + NB + grp(rp);
}
function date(s){
  var p = String(s || "").split("-");
  return p.length === 3 ? Number(p[2]) + NB + MONTHS[Number(p[1]) - 1] + NB + p[0] : esc(s);
}

// Фото: обычная картинка с ленивой загрузкой. Чертёж из drawings/ вставляем в страницу (drawings.js)
// на светлом фоне — линии видны и в тёмной теме.
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

var entries = DIARY.slice().sort(function(a, b){ return b.day - a.day || String(b.date).localeCompare(String(a.date)); });
var real = entries.filter(function(e){ return !e.example; });

// Сводка — только по настоящим записям
var sum = document.getElementById("diarySum");
if(real.length){
  var spent = real.reduce(function(t, e){ return t + (Number(e.spent) || 0); }, 0);
  sum.innerHTML = "<b>День" + NB + real[0].day + "</b> · потрачено " + money(spent) + " · этап: " + esc(real[0].stage);
} else {
  sum.textContent = "Стройка ещё не началась. Первая запись — в день разметки участка.";
}

// Лента
var feed = document.getElementById("diaryFeed");
feed.innerHTML = entries.map(function(e, i){
  var ph = e.photos && e.photos[0];
  return '<li><button type="button" class="diary-card' + (e.example ? " is-example" : "") + '" data-i="' + i + '">' +
    (ph ? media(ph, "diary-thumb", "") : '<span class="diary-thumb"></span>') +
    '<span class="diary-info">' +
      (e.example ? '<span class="diary-example">Пример записи</span>' : "") +
      '<span class="diary-meta">День' + NB + e.day + " · " + date(e.date) + '</span>' +
      '<span class="chip">' + esc(e.stage) + '</span>' +
      '<b class="diary-title">' + esc(e.title) + '</b>' +
      '<span class="diary-spent">' + (e.spent ? money(e.spent) : "Без трат") + '</span>' +
    '</span></button></li>';
}).join("");

// Чертежи в ленте вставляем, когда загрузится drawings.js (он подключён после этого файла)
window.addEventListener("DOMContentLoaded", function(){ hydrate(feed); });

// Панель с подробностями
var sheet = document.getElementById("diarySheet"), backdrop = document.getElementById("diaryBackdrop"),
    body = document.getElementById("diaryBody"), open = false, opener = null;

function detail(e){
  var photos = e.photos || [];
  var gal = photos.length ? '<div class="diary-gallery-wrap"><div class="diary-gallery" id="diaryGallery">' +
      photos.map(function(p, k){ return media(p, "diary-shot", "Фото " + (k + 1) + " из " + photos.length); }).join("") +
      '</div>' + (photos.length > 1 ? '<span class="badge diary-count" id="diaryCount">1 / ' + photos.length + '</span>' : "") + '</div>' : "";
  return (e.example ? '<span class="diary-example">Пример записи</span>' : "") +
    gal +
    '<div class="diary-meta">День' + NB + e.day + " · " + date(e.date) + ' <span class="chip">' + esc(e.stage) + '</span></div>' +
    '<h3 class="diary-h" id="diaryTitle">' + esc(e.title) + '</h3>' +
    '<p>' + keep(e.text) + '</p>' +
    '<p class="diary-spent">Потрачено за день: ' + money(e.spent) + '</p>' +
    (e.video ? '<a class="diary-video" href="' + esc(e.video) + '" target="_blank" rel="noopener">Смотреть видео в канале</a>' : "") +
    (e.mistake ? '<div class="diary-mistake"><b>' + WARN + 'Ошибка</b><p>' + keep(e.mistake) + '</p></div>' : "");
}

function show(i, from){
  var e = entries[i]; if(!e) return;
  opener = from || null;
  body.innerHTML = '<button type="button" class="diary-close" id="diaryClose" aria-label="Закрыть">×</button>' + detail(e);
  body.scrollTop = 0;
  hydrate(body);
  var g = document.getElementById("diaryGallery"), cnt = document.getElementById("diaryCount");
  if(g && cnt) g.addEventListener("scroll", function(){
    cnt.textContent = (Math.round(g.scrollLeft / g.clientWidth) + 1) + " / " + g.children.length;
  }, {passive: true});
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
  var b = ev.target.closest(".diary-card"); if(b) show(Number(b.dataset.i), b);
});
backdrop.addEventListener("click", hide);
document.addEventListener("keydown", function(ev){ if(open && ev.key === "Escape") hide(); });

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
