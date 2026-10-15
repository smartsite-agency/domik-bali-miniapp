// Экран «Конструкция»: дом по слоям (drawings/layers.svg), чипы слоёв и карточка выбранного слоя.
// Деньги, дни и доля — CalcApp.layerPlan (слои в calc-data.js, та же смета, что у калькулятора).
(function(){
var host = document.getElementById("layersSvg");
if(!host || !window.CalcApp || !window.Viewer) return;
var NB = " ", F = CalcApp.fmt;
var LOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

// Что это и зачем — по слоям (названия — CALC_DATA.layers)
var TEXT = [
  {what: "22 винтовые сваи ø108 мм: 15 под дом, 5 под террасу и 2 под ступени.",
   why: "Держат дом на 0,6 м над землёй: под полом проветривается, дому не страшны вода и термиты."},
  {what: "Профильная труба по периметру и лаги, сваренные на сваях и покрытые антикоррозийной грунтовкой.",
   why: "Связывает 22 сваи в одну жёсткую плоскость и держит пол."},
  {what: "Металлические стойки по углам и на границах зон, верхняя обвязка, конёк и стропила вальмовой крыши.",
   why: "Несёт крышу и даёт широкие проёмы под раздвижные окна во всю ширину комнат."},
  {what: "Деревянные стойки между металлическими, настил пола и доска террасы.",
   why: "К дереву крепятся утеплитель и обшивка, а пол получается тёплым и тихим.", lock: true},
  {what: "Деревянная обшивка с утеплителем, раздвижные окна от пола до потолка и глухая стена санузла.",
   why: "Закрывает дом от дождя и солнца, а стекло открывает вид на сад."},
  {what: "Вальмовая крыша 30° из черепицы, свес 1,2" + NB + "м над террасой.",
   why: "Отводит ливни на все четыре стороны и даёт тень террасе и окнам."}
];
var N = TEXT.length, sel = 1;

function plural(n, one, few, many){
  n = Math.abs(n) % 100; var d = n % 10;
  return n > 10 && n < 20 ? many : d === 1 ? one : d > 1 && d < 5 ? few : many;
}
function name(i){ return CALC_DATA.layers[i - 1].name; }

var chips = document.getElementById("layerChips"), card = document.getElementById("layerCard");
chips.innerHTML = TEXT.map(function(t, i){
  return '<button type="button" class="layer-chip" data-layer="' + (i + 1) + '" aria-pressed="false"><b>' + (i + 1) + '</b>' + name(i + 1) + '</button>';
}).join("");

function render(scroll){
  host.dataset.sel = sel;
  Array.prototype.forEach.call(host.querySelectorAll(".ly"), function(g){ g.classList.toggle("on", Number(g.dataset.layer) === sel); });
  Array.prototype.forEach.call(chips.children, function(b){ b.setAttribute("aria-pressed", Number(b.dataset.layer) === sel ? "true" : "false"); });
  var t = TEXT[sel - 1], p = CalcApp.layerPlan(sel), d = p.days;
  card.innerHTML =
    '<div class="layer-card-head"><span class="layer-num">' + sel + '</span><b>' + name(sel) + '</b></div>' +
    '<p>' + t.what + '</p>' +
    '<p class="layer-why"><span>Зачем:</span> ' + t.why + '</p>' +
    '<p class="layer-cost">≈' + NB + "Rp" + NB + F.rangeMln(p.cost[0], p.cost[1]) + " · ≈" + NB + d[0] + "–" + d[1] + NB + plural(d[1], "день", "дня", "дней") +
      '<span class="layer-share">' + Math.round(p.share*100) + NB + '% стройки</span></p>' +
    (t.lock ? '<div class="calc-lock">' + LOCK + '<span>Как крепить дерево к металлу — схема узлов в гайде</span></div>' : "");
  if(scroll){
    var chip = chips.children[sel - 1];
    chips.scrollTo({left: chip.offsetLeft - 16, behavior: "smooth"});
  }
}
function pick(i){
  if(!i || i === sel) return;
  sel = i; render(true);
  if(window.haptic) window.haptic();
}

// Нажатие на слой — на схеме (группа или номер слоя) или на чипе
host.addEventListener("click", function(e){ var g = e.target.closest("[data-layer]"); if(g) pick(Number(g.dataset.layer)); });
chips.addEventListener("click", function(e){ var b = e.target.closest("[data-layer]"); if(b) pick(Number(b.dataset.layer)); });

render(false);
Viewer.put(host, "layers").then(function(){ render(false); });
})();
