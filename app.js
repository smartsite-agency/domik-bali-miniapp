// Ссылка на Telegram-канал стройки, например "https://t.me/your_channel"
var CHANNEL_URL = "";

var IMG = {r1:"img/r1.jpg", r2:"img/r2.jpg"};
var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
var progress = document.getElementById("progress");
var cta = document.getElementById("cta");
var back = document.getElementById("back");
var home = document.getElementById("home");
var meta = document.querySelector(".meta");
var tocBtn = document.getElementById("tocBtn"), toc = document.getElementById("toc"), tocList = document.getElementById("tocList");
var tocBackdrop = document.getElementById("tocBackdrop"), tocOpen = false;
var tg = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined && window.Telegram.WebApp.platform !== "unknown") ? window.Telegram.WebApp : null;
var current = 0;

// Сегменты прогресса и пункты содержания — кнопки перехода на экран
screens.forEach(function(s,i){
  var b = document.createElement("button");
  b.type = "button"; b.setAttribute("aria-label", "Экран " + (i+1) + ": " + s.dataset.label);
  b.addEventListener("click", function(){ go(i); });
  progress.appendChild(b);
  var li = document.createElement("li"), t = document.createElement("button");
  t.type = "button"; t.className = "toc-item";
  t.innerHTML = '<span class="toc-num">' + (i+1) + '</span><span class="toc-text"><b></b><small></small></span>';
  t.querySelector("b").textContent = s.dataset.label;
  t.querySelector("small").textContent = s.dataset.desc || "";
  t.addEventListener("click", function(){ closeToc(); go(i); });
  li.appendChild(t); tocList.appendChild(li);
});
document.getElementById("stepTotal").textContent = screens.length;

function haptic(){ try{ tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred("light"); }catch(e){} }

function render(){
  screens.forEach(function(s,i){
    s.setAttribute("aria-hidden", i===current ? "false" : "true");
    s.classList.toggle("left", i<current);
    if(i===current) s.scrollTop = 0;
  });
  Array.prototype.forEach.call(progress.children,function(b,i){
    b.classList.toggle("on", i<=current);
    i===current ? b.setAttribute("aria-current","step") : b.removeAttribute("aria-current");
  });
  Array.prototype.forEach.call(tocList.querySelectorAll(".toc-item"),function(b,i){
    i===current ? b.setAttribute("aria-current","step") : b.removeAttribute("aria-current");
  });
  document.getElementById("stepNum").textContent = current+1;
  document.getElementById("stepLabel").textContent = screens[current].dataset.label;
  var text = screens[current].dataset.cta;
  cta.textContent = text;
  back.hidden = current===0 || !!tg;
  home.hidden = current===0;
  meta.classList.toggle("tight", !back.hidden);
  syncTg();
}

function syncTg(){
  if(!tg) return;
  if(tocOpen){ tg.MainButton.hide(); tg.BackButton.show(); return; }
  tg.MainButton.setText(screens[current].dataset.cta); tg.MainButton.show();
  current>0 ? tg.BackButton.show() : tg.BackButton.hide();
}

// Содержание: панель снизу
function openToc(){
  if(tocOpen) return;
  tocOpen = true; haptic();
  toc.setAttribute("aria-hidden","false"); tocBtn.setAttribute("aria-expanded","true");
  toc.classList.add("open"); tocBackdrop.classList.add("open");
  syncTg();
  var cur = tocList.querySelector('[aria-current="step"]');
  setTimeout(function(){ (cur || toc).focus(); }, 50);
}
function closeToc(){
  if(!tocOpen) return;
  tocOpen = false;
  toc.setAttribute("aria-hidden","true"); tocBtn.setAttribute("aria-expanded","false");
  toc.classList.remove("open"); tocBackdrop.classList.remove("open"); toc.style.transform = "";
  syncTg();
  tocBtn.focus();
}

function go(i){
  if(i<0 || i>=screens.length || i===current) return;
  current = i; haptic(); render();
}

function next(){
  if(current < screens.length-1){ go(current+1); return; }
  if(CHANNEL_URL){
    tg && tg.openTelegramLink ? tg.openTelegramLink(CHANNEL_URL) : (location.href = CHANNEL_URL);
  } else {
    document.getElementById("linkNote").hidden = false;
  }
}

cta.addEventListener("click", next);
back.addEventListener("click", function(){ go(current-1); });
home.addEventListener("click", function(){ go(0); });
tocBtn.addEventListener("click", openToc);
tocBackdrop.addEventListener("click", closeToc);

// Свайп вниз по панели закрывает её
var ty=null;
toc.addEventListener("touchstart",function(e){ ty = tocList.scrollTop>0 ? null : e.touches[0].clientY; },{passive:true});
toc.addEventListener("touchmove",function(e){
  if(ty===null) return;
  var d = e.touches[0].clientY-ty;
  toc.style.transition = "none"; toc.style.transform = d>0 ? "translateY("+d+"px)" : "";
},{passive:true});
toc.addEventListener("touchend",function(e){
  if(ty===null) return;
  var d = e.changedTouches[0].clientY-ty; ty=null;
  toc.style.transition = "";
  d>70 ? closeToc() : (toc.style.transform = "");
});

document.querySelector('.seg[aria-label="Фасад"]').addEventListener("click", function(e){
  var b = e.target.closest("button"); if(!b) return;
  Array.prototype.forEach.call(this.querySelectorAll("button"),function(o){ o.setAttribute("aria-pressed", o===b ? "true" : "false"); });
  document.getElementById("altImg").src = IMG[b.dataset.src];
  haptic();
});

// Свайп между экранами
var sx=null, sy=null;
document.getElementById("stage").addEventListener("touchstart",function(e){ if(tocOpen || e.target.closest(".noswipe")){ sx=null; return; } sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
document.getElementById("stage").addEventListener("touchend",function(e){
  if(sx===null) return;
  var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; sx=null;
  if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5){ dx<0 ? go(current+1) : go(current-1); }
});
document.addEventListener("keydown",function(e){
  if(tocOpen){ if(e.key==="Escape") closeToc(); return; }
  if(e.key==="ArrowRight") go(current+1);
  if(e.key==="ArrowLeft") go(current-1);
});

// Telegram
if(tg){
  document.documentElement.classList.add("tg");
  tg.ready(); tg.expand();
  function applyTheme(){
    document.documentElement.setAttribute("data-theme", tg.colorScheme === "dark" ? "dark" : "light");
    var cs = getComputedStyle(document.documentElement);
    try{
      tg.setHeaderColor(cs.getPropertyValue("--sky").trim());
      tg.setBackgroundColor(cs.getPropertyValue("--bg").trim());
      tg.MainButton.setParams({color: cs.getPropertyValue("--tile").trim(), text_color: cs.getPropertyValue("--tile-ink").trim()});
    }catch(e){}
  }
  applyTheme();
  tg.onEvent("themeChanged", applyTheme);
  tg.MainButton.onClick(next);
  tg.BackButton.onClick(function(){ tocOpen ? closeToc() : go(current-1); });
}

render();
