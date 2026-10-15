// Чертежи из drawings/: SVG вставляем прямо в страницу, чтобы они брали цвета темы (style.css, .dwg-host).
// Если загрузить не вышло (страница открыта как файл, без сервера) — показываем через <img>, цвета тогда по теме системы.
// Полноэкранный просмотр: крестик, Esc, свайп вниз, кнопка «Назад» в Telegram; зум пальцами, колесом и двойным тапом.
(function(){
var TITLES = {"plan":"План этажа", "facade-front":"Фасад", "facade-end":"Торец", "section":"Разрез А–А", "piles":"Свайное поле", "frame":"Металлокаркас"};
var cache = {};

function load(id){
  if(!cache[id]) cache[id] = fetch("drawings/" + id + ".svg").then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); });
  return cache[id];
}
function put(el, id){
  load(id).then(function(t){ el.innerHTML = t; })
    .catch(function(){ el.innerHTML = '<img src="drawings/' + id + '.svg" alt="">'; });
}
Array.prototype.forEach.call(document.querySelectorAll("[data-dwg-src]"), function(el){ put(el, el.dataset.dwgSrc); });

var viewer = document.getElementById("viewer"), stage = document.getElementById("viewerStage"),
    canvas = document.getElementById("viewerCanvas"), closeBtn = document.getElementById("viewerClose");
var open = false, opener = null;
var s = 1, tx = 0, ty = 0, drag = 0;   // масштаб, сдвиг, оттяжка вниз для закрытия
var MAX = 5;

function apply(anim){
  canvas.style.transition = anim ? "transform .2s ease" : "none";
  canvas.style.transform = "translate(" + tx + "px," + (ty + drag) + "px) scale(" + s + ")";
  viewer.style.setProperty("--pull", Math.min(1, drag/240));
}
// Меньше окна — по центру, больше — края не отрываются от краёв окна
function fit(pos, size, view, off){
  if(size <= view) return (view - size)/2 - off;
  return Math.min(-off, Math.max(view - off - size, pos));
}
function clamp(){
  tx = fit(tx, canvas.offsetWidth*s, stage.clientWidth, canvas.offsetLeft);
  ty = fit(ty, canvas.offsetHeight*s, stage.clientHeight, canvas.offsetTop);
}
// Масштаб вокруг точки (px, py) в координатах окна
function zoomAt(ns, px, py){
  ns = Math.min(MAX, Math.max(1, ns));
  var r = stage.getBoundingClientRect(), bx = r.left + canvas.offsetLeft, by = r.top + canvas.offsetTop;
  var lx = (px - bx - tx)/s, ly = (py - by - ty)/s;
  s = ns; tx = px - bx - lx*s; ty = py - by - ly*s;
  clamp();
}

function show(id, from){
  opener = from || null;
  document.getElementById("viewerTitle").textContent = (TITLES[id] || "Чертёж") + " · 7 × 4 м";
  canvas.innerHTML = "";
  put(canvas, id);
  s = 1; tx = 0; ty = 0; drag = 0; apply(false);
  open = true;
  viewer.setAttribute("aria-hidden", "false"); viewer.classList.add("open");
  if(window.haptic) window.haptic();
  if(window.syncTg) window.syncTg();
  setTimeout(function(){ closeBtn.focus(); }, 50);
}
function hide(){
  if(!open) return;
  open = false;
  viewer.setAttribute("aria-hidden", "true"); viewer.classList.remove("open");
  drag = 0; apply(false);
  if(window.syncTg) window.syncTg();
  if(opener) opener.focus();
}

document.addEventListener("click", function(e){
  var b = e.target.closest("[data-dwg]");
  if(b && !viewer.contains(b)) show(b.dataset.dwg, b);
});
closeBtn.addEventListener("click", hide);
document.addEventListener("keydown", function(e){ if(open && e.key === "Escape") hide(); });

// Жесты: два пальца — зум, один — сдвиг (если увеличено) или оттяжка вниз (если нет)
var pts = {}, pinch = null, pan = null, lastTap = 0;
function count(){ return Object.keys(pts).length; }
stage.addEventListener("pointerdown", function(e){
  stage.setPointerCapture(e.pointerId);
  pts[e.pointerId] = {x: e.clientX, y: e.clientY};
  if(count() === 2){
    var p = Object.keys(pts).map(function(k){ return pts[k]; });
    pinch = {d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), s: s};
    pan = null; drag = 0;
  } else if(count() === 1){
    pan = {x: e.clientX, y: e.clientY, tx: tx, ty: ty};
    var now = Date.now();
    if(now - lastTap < 280){ zoomAt(s > 1 ? 1 : 2.5, e.clientX, e.clientY); apply(true); pan = null; }
    lastTap = now;
  }
});
stage.addEventListener("pointermove", function(e){
  if(!pts[e.pointerId]) return;
  pts[e.pointerId] = {x: e.clientX, y: e.clientY};
  if(pinch && count() === 2){
    var p = Object.keys(pts).map(function(k){ return pts[k]; });
    var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    zoomAt(pinch.s * d/pinch.d, (p[0].x + p[1].x)/2, (p[0].y + p[1].y)/2);
    apply(false);
  } else if(pan){
    var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    if(s > 1){ tx = pan.tx + dx; ty = pan.ty + dy; clamp(); }
    else drag = Math.max(0, dy);
    apply(false);
  }
});
function up(e){
  delete pts[e.pointerId];
  if(count() < 2) pinch = null;
  if(count() === 0){
    pan = null;
    if(drag > 90){ hide(); return; }
    drag = 0; apply(true);
  }
}
stage.addEventListener("pointerup", up);
stage.addEventListener("pointercancel", up);
stage.addEventListener("wheel", function(e){
  e.preventDefault();
  zoomAt(s * Math.exp(-e.deltaY*0.002), e.clientX, e.clientY); apply(false);
}, {passive: false});

window.Viewer = {open: show, close: hide, isOpen: function(){ return open; }};
})();
