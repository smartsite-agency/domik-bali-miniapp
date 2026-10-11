// Калькулятор дома. Цены — в calc-data.js
(function(){
var D = CALC_DATA, root = document.getElementById("calc");
if(!root) return;

var state = {
  w: D.size.width.def, l: D.size.length.def, overhang: D.overhangDef,
  roof: "clay", finish: "basic", builder: "self",
  terrace: 0, kitchen: true, bath: true
};
var LIMITS = {w: D.size.width, l: D.size.length, terrace: D.terrace};
var BUILDER_HINT = {
  self: "Материалы + нанятые специалисты на отдельные этапы",
  brigade: "Одна бригада на все этапы",
  turnkey: "Подрядчик ведёт стройку: +" + Math.round(D.turnkeyMarkup*100) + "% к работе"
};
var NB = " ";

function $(id){ return document.getElementById(id); }
function grp(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
function dec(n){ return String(n).replace(".", ","); }
function mln(x){ var v = x/1e6; return v >= 10 ? grp(v) : dec(Math.round(v*10)/10); }
function range(a, b, f){ var A = f(a), B = f(b); return A === B ? A : A + "–" + B; }
function rangeMln(a, b){ return range(a, b, mln) + NB + "млн"; }
function usd(x){ return grp(Math.round(x/D.USD_RATE/100)*100); }
function tys(x){ return grp(x/1000); }

function roofArea(){
  var o = state.overhang, cos = Math.cos(D.roofPitch*Math.PI/180);
  return (state.w + 2*o) * (state.l + 2*o) / cos * D.roofWaste;
}

function crew(area, roof){
  var c = D.crew, t = state.terrace, list = [];
  function add(item, a, b){
    a = Math.max(1, Math.round(a)); b = Math.max(a, Math.round(b));
    list.push({label: item.label, dMin: a, dMax: b, min: a*D.dayRate.min, max: b*D.dayRate.max});
  }
  add(c.welder, area*c.welder.perHouseM2[0], area*c.welder.perHouseM2[1]);
  add(c.carpenter, area*c.carpenter.perHouseM2[0] + t*c.carpenter.perTerraceM2[0],
                   area*c.carpenter.perHouseM2[1] + t*c.carpenter.perTerraceM2[1]);
  add(c.roofer, roof*c.roofer.perRoofM2[0], roof*c.roofer.perRoofM2[1]);
  add(c.electrician, c.electrician.fixed[0], c.electrician.fixed[1]);
  if(state.bath || state.kitchen){
    add(c.plumber, (state.bath ? c.plumber.bath[0] : 0) + (state.kitchen ? c.plumber.kitchen[0] : 0),
                   (state.bath ? c.plumber.bath[1] : 0) + (state.kitchen ? c.plumber.kitchen[1] : 0));
  }
  return list;
}

function compute(){
  var area = state.w*state.l, roof = roofArea(), lines = [];
  function perM2(item, m2, label){ lines.push({label: label || item.label, min: item.min*m2, max: item.max*m2}); }
  function fixed(item, label){ lines.push({label: label || item.label, min: item.min, max: item.max}); }

  perM2(D.foundation, area);
  perM2(D.frame, area);
  perM2(D.floor, area);
  perM2(D.walls, area);
  perM2(D.roof[state.roof], roof, "Кровля: " + D.roof[state.roof].full.toLowerCase());
  fixed(D.windows[state.finish], "Окна и двери");
  fixed(D.electric);
  if(state.bath) fixed(D.bath);
  if(state.kitchen) fixed(D.kitchen);
  perM2(D.finish[state.finish], area, "Отделка: " + D.finish[state.finish].label.toLowerCase());
  if(state.terrace) perM2(D.terraceM2, state.terrace, "Терраса " + state.terrace + NB + "м²");

  var team = crew(area, roof), work;
  if(state.builder === "self"){
    work = {label: "Работа: специалисты", min: 0, max: 0};
    team.forEach(function(p){ work.min += p.min; work.max += p.max; });
  } else {
    var k = state.builder === "turnkey" ? 1 + D.turnkeyMarkup : 1, m2 = area + state.terrace;
    work = {label: state.builder === "turnkey" ? "Работа: подрядчик под ключ" : "Работа: бригада",
            min: D.brigadeM2.min*m2*k, max: D.brigadeM2.max*m2*k};
  }
  lines.push(work);

  var total = {min: 0, max: 0};
  lines.forEach(function(x){ total.min += x.min; total.max += x.max; });

  var W = D.weeks, weeks = W.base.slice();
  if(state.finish === "mid"){ weeks[0] += W.midAdd[0]; weeks[1] += W.midAdd[1]; }
  if(state.terrace){ weeks[0] += W.terrace[0]; weeks[1] += W.terrace[1]; }

  return {area: area, roof: roof, lines: lines, total: total, team: team, weeks: weeks};
}

function render(){
  var r = compute();
  $("calcTotal").textContent = "Rp " + rangeMln(r.total.min, r.total.max);
  $("calcUsd").textContent = "≈ $" + range(r.total.min, r.total.max, usd);
  $("calcWeeks").textContent = r.weeks[0] + "–" + r.weeks[1] + NB + "недель";

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

  Array.prototype.forEach.call(root.querySelectorAll("[data-set]"), function(b){
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
}

root.addEventListener("click", function(e){
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
});

render();
})();
