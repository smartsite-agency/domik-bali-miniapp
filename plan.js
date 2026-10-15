// Экран «Какой дом получится»: план выбранного варианта из drawings/, характеристики, цена и срок.
// Выбор планировки общий с калькулятором (CalcApp.state.layout), цена — той же функцией CalcApp.compute.
(function(){
var screen = document.getElementById("layouts");
if(!screen || !window.CalcApp) return;
var C = CalcApp, F = C.fmt, NB = "\u00a0";
var HOUSE = {w: 4, l: 7}; // чертежи нарисованы для 7 × 4 м

// Что на чертеже каждого варианта (размеры в чистоте — см. drawings/plan*.svg)
var VARIANTS = {
  bedroom: {dwg: "plan",        bed: "Отдельная, 2,5" + NB + "×" + NB + "3,8" + NB + "м",
            bath: "У фасада, 1,4" + NB + "×" + NB + "2,0" + NB + "м"},
  studio:  {dwg: "plan-studio", bed: "Зона в общей комнате 22,8" + NB + "м²",
            bath: "В заднем углу, 1,4" + NB + "×" + NB + "1,6" + NB + "м"}
};

var dwgBtn = document.getElementById("planDwg"), dwgHost = dwgBtn.querySelector(".dwg-host"), shown = "";

function draw(){
  var s = C.state, v = VARIANTS[s.layout] || VARIANTS.bedroom, r = C.compute(HOUSE);
  if(shown !== v.dwg){
    shown = v.dwg;
    dwgBtn.dataset.dwg = v.dwg;
    dwgBtn.setAttribute("aria-label", "План: " + CALC_DATA.layouts[s.layout].label.toLowerCase() + ", 7 × 4 м — открыть на весь экран");
    if(window.Viewer) Viewer.put(dwgHost, v.dwg);
  }
  var rows = [
    ["Размер", F.dec(HOUSE.l) + NB + "×" + NB + F.dec(HOUSE.w) + NB + "м"],
    ["Площадь", F.dec(r.area) + NB + "м²"],
    ["Спальня", v.bed],
    ["Душ и туалет", v.bath],
    ["Фундамент", "Винтовые сваи, 22" + NB + "шт."]
  ];
  document.getElementById("planSpecs").innerHTML = rows.map(function(x){ return "<div><dt>" + x[0] + "</dt><dd>" + x[1] + "</dd></div>"; }).join("");
  document.getElementById("planPrice").textContent = "от Rp " + F.mln(r.total.min) + NB + "млн · " + r.weeks[0] + "–" + r.weeks[1] + NB + "недель";
}

C.bind(screen);
C.onRender(draw);
})();
