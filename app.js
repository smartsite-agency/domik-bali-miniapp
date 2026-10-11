// Ссылка на Telegram-канал стройки, например "https://t.me/your_channel"
var CHANNEL_URL = "";

var IMG = {r1:"img/r1.jpg", r2:"img/r2.jpg"};
var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
var progress = document.getElementById("progress");
var cta = document.getElementById("cta");
var back = document.getElementById("back");
var home = document.getElementById("home");
var tg = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined && window.Telegram.WebApp.platform !== "unknown") ? window.Telegram.WebApp : null;
var current = 0, goal = "";

screens.forEach(function(){ progress.appendChild(document.createElement("span")); });
document.getElementById("stepTotal").textContent = screens.length;

function haptic(){ try{ tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred("light"); }catch(e){} }

function render(){
  screens.forEach(function(s,i){
    s.setAttribute("aria-hidden", i===current ? "false" : "true");
    s.classList.toggle("left", i<current);
    if(i===current) s.scrollTop = 0;
  });
  Array.prototype.forEach.call(progress.children,function(b,i){ b.classList.toggle("on", i<=current); });
  document.getElementById("stepNum").textContent = current+1;
  document.getElementById("stepLabel").textContent = screens[current].dataset.label;
  var text = screens[current].dataset.cta;
  cta.textContent = text;
  back.hidden = current===0 || !!tg;
  home.hidden = current===0;
  if(tg){
    tg.MainButton.setText(text); tg.MainButton.show();
    current>0 ? tg.BackButton.show() : tg.BackButton.hide();
  }
}

function go(i){
  if(i<0 || i>=screens.length || i===current) return;
  current = i; haptic(); render();
}

function next(){
  if(current===1 && !goal){ document.getElementById("goal-live").focus(); }
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

document.getElementById("goals").addEventListener("click", function(e){
  var b = e.target.closest(".opt"); if(!b) return;
  Array.prototype.forEach.call(this.querySelectorAll(".opt"),function(o){ o.setAttribute("aria-pressed", o===b ? "true" : "false"); });
  goal = b.dataset.goal;
  var notes = {"жить":"Вы строите для себя: начнём с планировки и бюджета.","сдавать":"Вы строите под аренду: добавим расходы на содержание.","приценяюсь":"Вы прицениваетесь: смету и сроки покажем первыми."};
  document.getElementById("goalNote").textContent = notes[goal];
  setTimeout(function(){ go(2); }, 220);
});

document.querySelector('.seg[aria-label="Фасад"]').addEventListener("click", function(e){
  var b = e.target.closest("button"); if(!b) return;
  Array.prototype.forEach.call(this.querySelectorAll("button"),function(o){ o.setAttribute("aria-pressed", o===b ? "true" : "false"); });
  document.getElementById("altImg").src = IMG[b.dataset.src];
  haptic();
});

// Свайп между экранами
var sx=null, sy=null;
document.getElementById("stage").addEventListener("touchstart",function(e){ if(e.target.closest(".noswipe")){ sx=null; return; } sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
document.getElementById("stage").addEventListener("touchend",function(e){
  if(sx===null) return;
  var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; sx=null;
  if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5){ dx<0 ? go(current+1) : go(current-1); }
});
document.addEventListener("keydown",function(e){
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
  tg.BackButton.onClick(function(){ go(current-1); });
}

render();
