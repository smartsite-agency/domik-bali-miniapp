// Калькулятор дома. Цены — в calc-data.js
(function(){
var D = CALC_DATA, root = document.getElementById("calc");
if(!root) return;
var listeners = [];

var state = {
  w: D.size.width.def, l: D.size.length.def, overhang: D.overhangDef,
  roof: "clay", finish: "basic", builder: "self",
  terrace: 0, kitchen: true, bath: true, layout: D.layoutDef
};
var LIMITS = {w: D.size.width, l: D.size.length, terrace: D.terrace};
var BUILDER_HINT = {
  self: "Материалы + нанятые специалисты на отдельные этапы",
  brigade: "Одна бригада на все этапы",
  turnkey: "Подрядчик ведёт стройку: +" + Math.round(D.turnkeyMarkup*100) + "% к работе"
};
function layoutHint(k){
  var x = D.layouts[k], t = x.extra ? "+ " + x.extra.label.toLowerCase() + " Rp " + range(x.extra.min, x.extra.max, mln) + NB + "млн" : "Без внутренних перегородок";
  return x.weeks ? t + ", +" + x.weeks[0] + "–" + x.weeks[1] + NB + "нед." : t;
}
var NB = " ";

function $(id){ return document.getElementById(id); }
// Тексты блока суммы (.calc-sum) — одинаковые в калькуляторе, на экране «Дом» и у другой модели
function sumText(r){
  return {total: "Rp " + rangeMln(r.total.min, r.total.max),
          usd: "≈ $" + range(r.total.min, r.total.max, usd),
          weeks: r.weeks[0] + "–" + r.weeks[1] + NB + "недель"};
}
function out(name, text){
  Array.prototype.forEach.call(document.querySelectorAll('[data-calc-out="' + name + '"]'), function(el){ el.textContent = text; });
}
function grp(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
function dec(n){ return String(n).replace(".", ","); }
function mln(x){ var v = x/1e6; return v >= 10 ? grp(v) : dec(Math.round(v*10)/10); }
function range(a, b, f){ var A = f(a), B = f(b); return A === B ? A : A + "–" + B; }
function rangeMln(a, b){ return range(a, b, mln) + NB + "млн"; }
function usd(x){ return grp(Math.round(x/D.USD_RATE/100)*100); }
function tys(x){ return grp(x/1000); }

function roofArea(s){
  var o = s.overhang, cos = Math.cos((s.roofPitch || D.roofPitch)*Math.PI/180);
  return (s.w + 2*o) * (s.l + 2*o) / cos * D.roofWaste;
}

function crew(s, area, roof){
  var c = D.crew, t = s.terrace, list = [];
  function add(key, a, b){
    a = Math.max(1, Math.round(a)); b = Math.max(a, Math.round(b));
    list.push({key: key, label: c[key].label, dMin: a, dMax: b, min: a*D.dayRate.min, max: b*D.dayRate.max});
  }
  add("welder", area*c.welder.perHouseM2[0], area*c.welder.perHouseM2[1]);
  add("carpenter", area*c.carpenter.perHouseM2[0] + t*c.carpenter.perTerraceM2[0],
                   area*c.carpenter.perHouseM2[1] + t*c.carpenter.perTerraceM2[1]);
  add("roofer", roof*c.roofer.perRoofM2[0], roof*c.roofer.perRoofM2[1]);
  add("electrician", c.electrician.fixed[0], c.electrician.fixed[1]);
  if(s.bath || s.kitchen){
    add("plumber", (s.bath ? c.plumber.bath[0] : 0) + (s.kitchen ? c.plumber.kitchen[0] : 0),
                   (s.bath ? c.plumber.bath[1] : 0) + (s.kitchen ? c.plumber.kitchen[1] : 0));
  }
  return list;
}

// over — необязательная подмена выбора, например {layout: "studio"}
function compute(over){
  var s = {}, k;
  for(k in state) s[k] = state[k];
  for(k in over || {}) s[k] = over[k];
  var area = s.w*s.l, roof = roofArea(s), lines = [], lay = D.layouts[s.layout];
  // key — по нему этапы дневника (CALC_DATA.stages) собирают свои строки сметы
  function perM2(key, item, m2, label){ lines.push({key: key, label: label || item.label, min: item.min*m2, max: item.max*m2}); }
  function fixed(key, item, label){ lines.push({key: key, label: label || item.label, min: item.min, max: item.max}); }

  perM2("foundation", D.foundation, area);
  perM2("frame", D.frame, area);
  perM2("floor", D.floor, area);
  perM2("walls", D.walls, area);
  if(lay.extra) fixed("layout", lay.extra);
  var rf = s.roofItem || D.roof[s.roof]; // roofItem — своя кровля другой модели (CALC_DATA.flatModel)
  perM2("roof", rf, roof, "Кровля: " + rf.full.toLowerCase());
  fixed("windows", D.windows[s.finish], "Окна и двери");
  fixed("electric", D.electric);
  if(s.bath) fixed("bath", D.bath);
  if(s.kitchen) fixed("kitchen", D.kitchen);
  perM2("finish", D.finish[s.finish], area, "Отделка: " + D.finish[s.finish].label.toLowerCase());
  if(s.terrace) perM2("terrace", D.terraceM2, s.terrace, "Терраса " + s.terrace + NB + "м²");
  (s.extras || []).forEach(function(x){ fixed("extra", x); }); // доп. строки другой модели, например стеклянный фасад

  var team = crew(s, area, roof), work;
  if(s.builder === "self"){
    work = {key: "work", label: "Работа: специалисты", min: 0, max: 0};
    team.forEach(function(p){ work.min += p.min; work.max += p.max; });
  } else {
    var mul = s.builder === "turnkey" ? 1 + D.turnkeyMarkup : 1, m2 = area + s.terrace;
    work = {key: "work", label: s.builder === "turnkey" ? "Работа: подрядчик под ключ" : "Работа: бригада",
            min: D.brigadeM2.min*m2*mul, max: D.brigadeM2.max*m2*mul};
  }
  lines.push(work);

  var total = {min: 0, max: 0};
  lines.forEach(function(x){ total.min += x.min; total.max += x.max; });

  var W = D.weeks, weeks = W.base.slice();
  if(s.finish === "mid"){ weeks[0] += W.midAdd[0]; weeks[1] += W.midAdd[1]; }
  if(s.terrace){ weeks[0] += W.terrace[0]; weeks[1] += W.terrace[1]; }
  if(lay.weeks){ weeks[0] += lay.weeks[0]; weeks[1] += lay.weeks[1]; }

  return {area: area, roof: roof, lines: lines, total: total, team: team, weeks: weeks};
}

function render(){
  var r = compute();
  // Блок суммы (.calc-sum) есть в калькуляторе и на экране «Дом» — заполняем все
  var t = sumText(r);
  out("total", t.total); out("usd", t.usd); out("weeks", t.weeks);

  ["w", "l", "terrace"].forEach(function(k){
    var lim = LIMITS[k];
    $("c-" + k).textContent = dec(state[k]) + NB + (k === "terrace" ? "м²" : "м");
    root.querySelector('[data-step="' + k + '"][data-dir="-1"]').disabled = state[k] <= lim.min;
    root.querySelector('[data-step="' + k + '"][data-dir="1"]').disabled = state[k] >= lim.max;
  });
  $("c-area").textContent = "Площадь " + dec(r.area) + NB + "м²";
  $("c-roofArea").textContent = "Площадь крыши ≈ " + Math.round(r.roof) + NB + "м²";
  var rf = D.roof[state.roof], fn = D.finish[state.finish];
  $("c-roofHint").textContent = rf.full + ": Rp " + range(rf.min, rf.max, tys) + NB + "тыс. за м² крыши";
  $("c-finishHint").textContent = "Rp " + range(fn.min, fn.max, tys) + NB + "тыс. за м² дома";
  $("c-builderHint").textContent = BUILDER_HINT[state.builder];
  $("c-layoutHint").textContent = layoutHint(state.layout);

  Array.prototype.forEach.call(document.querySelectorAll("[data-set]"), function(b){
    b.setAttribute("aria-pressed", String(state[b.dataset.set]) === b.dataset.val ? "true" : "false");
  });
  Array.prototype.forEach.call(root.querySelectorAll("[data-toggle]"), function(b){
    b.setAttribute("aria-checked", state[b.dataset.toggle] ? "true" : "false");
  });

  var mid = r.total.min + r.total.max;
  $("calcLines").innerHTML = r.lines.map(function(x){
    var share = Math.max(1, Math.round((x.min + x.max)/mid*100));
    return '<li><span>' + x.label + '</span><b>' + rangeMln(x.min, x.max) + '</b>' +
           '<i aria-hidden="true"><span style="width:' + share + '%"></span></i></li>';
  }).join("");

  var crewBox = $("calcCrew");
  crewBox.hidden = state.builder === "turnkey";
  if(!crewBox.hidden){
    $("crewNote").textContent = (state.builder === "self" ? "Ставка " : "Работа внутри бригады. Ставка ") +
      "Rp " + range(D.dayRate.min, D.dayRate.max, tys) + NB + "тыс. в день";
    $("calcCrewList").innerHTML = r.team.map(function(p){
      return '<li><span>' + p.label + '</span><em>' + p.dMin + "–" + p.dMax + NB + 'дн.</em><b>' + rangeMln(p.min, p.max) + '</b></li>';
    }).join("");
  }
  listeners.forEach(function(fn){ fn(r); });
}

function onClick(e){
  var b = e.target.closest("button"); if(!b || b.disabled) return;
  if(b.dataset.step){
    var k = b.dataset.step, lim = LIMITS[k];
    state[k] = Math.min(lim.max, Math.max(lim.min, Math.round((state[k] + lim.step*Number(b.dataset.dir))*10)/10));
  } else if(b.dataset.set){
    var v = b.dataset.val;
    state[b.dataset.set] = b.dataset.set === "overhang" ? Number(v) : v;
  } else if(b.dataset.toggle){
    state[b.dataset.toggle] = !state[b.dataset.toggle];
  } else return;
  if(window.haptic) window.haptic();
  render();
}
root.addEventListener("click", onClick);

// Для других экранов (план на экране 3): общий выбор, тот же расчёт
// План части стройки — этапа дневника (CALC_DATA.stages) или слоя дома (CALC_DATA.layers).
// Дом — CALC_DATA.stageHouse, специалисты — как при «Сам». lines и crew — ключи строк сметы и специалистов,
// "key" целиком или ["key", доля]. Дни — дни специалистов (× доля) плюс part.days. extra — статья только для дневника.
// Возвращает {cost: [min, max], days: [min, max], who, share — доля от всей сметы калькулятора, 0–1}.
function shareOf(list, key){
  for(var i = 0; i < (list || []).length; i++){
    var it = list[i];
    if(typeof it === "string" ? it === key : it[0] === key) return typeof it === "string" ? 1 : it[1];
  }
  return 0;
}
function partPlan(part){
  if(!part) return null;
  var r = compute(D.stageHouse), cost = [0, 0], days = [0, 0];
  r.lines.forEach(function(x){ var k = shareOf(part.lines, x.key); cost[0] += x.min*k; cost[1] += x.max*k; });
  r.team.forEach(function(p){
    var k = shareOf(part.crew, p.key); if(!k) return;
    cost[0] += p.min*k; cost[1] += p.max*k; days[0] += Math.round(p.dMin*k); days[1] += Math.round(p.dMax*k);
  });
  if(part.extra){ cost[0] += D[part.extra].min; cost[1] += D[part.extra].max; }
  if(part.days){ days[0] += part.days[0]; days[1] += part.days[1]; }
  return {cost: cost, days: days, who: part.who, share: (cost[0] + cost[1])/(r.total.min + r.total.max)};
}
// Цена модели «Плоская крыша» (экран «Вариант»): та же смета, свой набор из CALC_DATA.flatModel
function flatPrice(facade){
  var M = D.flatModel, over = {}, k;
  for(k in M.house) over[k] = M.house[k];
  over.roofItem = M.roof; over.roofPitch = M.roofPitch;
  over.extras = M.facades[facade] && M.facades[facade].extra ? [M.facades[facade].extra] : [];
  return compute(over);
}
function stagePlan(n){ return partPlan(D.stages[n - 1]); }
function layerPlan(n){ return partPlan(D.layers[n - 1]); }

window.CalcApp = {
  state: state, compute: compute, stagePlan: stagePlan, layerPlan: layerPlan, flatPrice: flatPrice, sumText: sumText, fmt: {mln: mln, range: range, rangeMln: rangeMln, dec: dec},
  bind: function(el){ el.addEventListener("click", onClick); },
  onRender: function(fn){ listeners.push(fn); fn(compute()); }
};

render();
})();
