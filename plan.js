// Экран «Какой дом получится»: схема в масштабе по размеру из калькулятора, характеристики, цена.
// Выбор планировки общий с калькулятором (CalcApp.state.layout).
(function(){
var screen = document.getElementById("layouts");
if(!screen || !window.CalcApp) return;
var C = CalcApp, F = C.fmt, NB = " ";

function m(cm){ return F.dec(Math.round(cm/10)/10); } // см → «2,3»
var X = NB + "×" + NB;

// Геометрия вариантов, всё в сантиметрах. x — вдоль длины дома, y — поперёк.
function geometry(layout, L, W){
  var g = {zones: [], walls: [], doors: [], beds: [], loft: null, stairs: null, info: {}};
  g.counter = function(right){ return [10, 10, Math.max(60, Math.min(240, right - 30)), 60]; };
  g.doors.push({x: 60, y: W, w: 90, along: "x", side: -1}); // вход

  if(layout === "studio"){
    var bw = 160, bd = Math.min(220, W - 100), bedX = L - bw - 210;
    g.walls.push([L-bw, 0, L-bw, bd], [L-bw, bd, L, bd]);
    g.doors.push({x: L-bw+45, y: bd, w: 70, along: "x", side: -1});
    g.beds.push([bedX, 10, 200, 160]);
    g.kitchen = g.counter(bedX);
    g.zones.push({x: 0, w: bedX, y: 0, h: W, text: ["Кухня-", "гостиная"]},
                 {x: bedX, w: 200, y: 170, h: W-170, text: ["Спальное", "место"]},
                 {x: L-bw, w: bw, y: 0, h: bd, text: ["Душ,", "WC"]});
    g.info = {bed: "Место в общей комнате", bath: [bw, bd]};
  }
  if(layout === "bedroom"){
    var bed = Math.max(220, Math.round(L*0.33/10)*10), bw2 = 150, x2 = L - bed, x1 = x2 - bw2, bd2 = Math.round(W*0.6/10)*10;
    g.walls.push([x2, 0, x2, W], [x1, 0, x1, bd2], [x1, bd2, x2, bd2]);
    g.doors.push({x: x2, y: bd2 + (W-bd2-80)/2, w: 80, along: "y", side: 1},
                 {x: x1 + (bw2-70)/2, y: bd2, w: 70, along: "x", side: -1});
    g.beds.push([L-210, W/2-80, 200, 160]);
    g.kitchen = g.counter(x1);
    g.zones.push({x: 0, w: x1, y: 0, h: W, text: ["Кухня-", "гостиная"]},
                 {x: x1, w: bw2, y: 0, h: bd2, text: ["Душ,", "WC"]},
                 {x: x2, w: bed, y: 0, h: W, text: ["Спальня"]});
    g.info = {bed: "Отдельная, " + m(bed) + X + m(W) + NB + "м", bath: [bw2, bd2]};
  }
  if(layout === "loft"){
    var bw3 = 170, bd3 = Math.min(220, W - 100), lw = 240, sx = L - lw - 70;
    g.walls.push([L-bw3, 0, L-bw3, bd3], [L-bw3, bd3, L, bd3]);
    g.doors.push({x: L-bw3+50, y: bd3, w: 70, along: "x", side: -1});
    g.loft = [L-lw, 0, lw, W];
    g.stairs = [sx, W-170, 65, 160]; // вдоль края антресоли, подъём к ней
    g.kitchen = g.counter(sx);
    g.zones.push({x: 0, w: sx, y: 0, h: W, text: ["Кухня-", "гостиная"]},
                 {x: L-bw3, w: bw3, y: 0, h: bd3, text: ["Душ,", "WC"]},
                 {x: L-lw, w: lw, y: bd3, h: W-bd3, text: ["Спальня", "на антресоли"], accent: true},
                 {x: sx, w: 65, y: W-170-60, h: 50, text: ["Лестница"], small: true});
    g.info = {bed: "На антресоли " + m(lw) + X + m(W) + NB + "м", bath: [bw3, bd3], loftArea: lw*W/1e4};
  }
  return g;
}

function svg(layout, s){
  var L = s.l*100, W = s.w*100, fs = Math.round((L + 160) * 12 / 328), pad = Math.round(fs*2.2);
  var g = geometry(layout, L, W), o = [];
  function r(a, cls){ return '<rect class="' + cls + '" x="' + a[0] + '" y="' + a[1] + '" width="' + a[2] + '" height="' + a[3] + '"/>'; }

  o.push('<rect class="plan-floor" x="0" y="0" width="' + L + '" height="' + W + '"/>');
  if(g.kitchen) o.push(r(g.kitchen, "plan-fixture"));
  g.beds.forEach(function(b){ o.push(r(b, "plan-bed")); });
  if(g.stairs){
    var st = g.stairs; o.push(r(st, "plan-fixture"));
    for(var i = st[1] + 20; i < st[1] + st[3]; i += 20) o.push('<line class="plan-thin" x1="' + st[0] + '" y1="' + i + '" x2="' + (st[0]+st[2]) + '" y2="' + i + '"/>');
  }
  g.walls.forEach(function(w){ o.push('<line class="plan-wall-in" x1="' + w[0] + '" y1="' + w[1] + '" x2="' + w[2] + '" y2="' + w[3] + '"/>'); });
  o.push('<rect class="plan-wall" x="0" y="0" width="' + L + '" height="' + W + '"/>');
  // Двери: разрыв в стене, полотно и дуга открывания
  g.doors.forEach(function(d){
    var x = d.x, y = d.y, w = d.w, sd = d.side;
    if(d.along === "x"){
      o.push('<line class="plan-gap" x1="' + x + '" y1="' + y + '" x2="' + (x+w) + '" y2="' + y + '"/>',
             '<line class="plan-thin" x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y+sd*w) + '"/>',
             '<path class="plan-thin" d="M' + (x+w) + ' ' + y + 'A' + w + ' ' + w + ' 0 0 ' + (sd > 0 ? 1 : 0) + ' ' + x + ' ' + (y+sd*w) + '"/>');
    } else {
      o.push('<line class="plan-gap" x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y+w) + '"/>',
             '<line class="plan-thin" x1="' + x + '" y1="' + y + '" x2="' + (x+sd*w) + '" y2="' + y + '"/>',
             '<path class="plan-thin" d="M' + x + ' ' + (y+w) + 'A' + w + ' ' + w + ' 0 0 ' + (sd > 0 ? 0 : 1) + ' ' + (x+sd*w) + ' ' + y + '"/>');
    }
  });
  if(g.loft) o.push(r(g.loft, "plan-loft")); // поверх стен: антресоль — второй уровень
  g.zones.forEach(function(z){
    var size = z.small ? Math.round(fs*0.85) : fs, lh = size*1.15, y0 = z.y + z.h/2 - (z.text.length-1)*lh/2;
    o.push('<text class="plan-label' + (z.accent ? ' plan-accent' : '') + '" font-size="' + size + '" x="' + (z.x + z.w/2) + '" y="' + y0 + '">' +
      z.text.map(function(t, i){ return '<tspan x="' + (z.x + z.w/2) + '" dy="' + (i ? lh : 0) + '">' + t + '</tspan>'; }).join("") + '</text>');
  });
  // Размеры
  var dy = -Math.round(fs*0.9);
  o.push('<line class="plan-dim" x1="0" y1="' + dy + '" x2="' + L + '" y2="' + dy + '"/>',
         '<text class="plan-dimtext" font-size="' + fs + '" x="' + L/2 + '" y="' + (dy - fs*0.35) + '">' + F.dec(s.l) + NB + 'м</text>',
         '<line class="plan-dim" x1="' + (L - dy) + '" y1="0" x2="' + (L - dy) + '" y2="' + W + '"/>',
         '<text class="plan-dimtext" font-size="' + fs + '" transform="translate(' + (L - dy + fs*0.35) + ' ' + W/2 + ') rotate(90)">' + F.dec(s.w) + NB + 'м</text>');

  return {g: g, html: '<svg viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (L + 2*pad) + ' ' + (W + 2*pad) + '" role="img" aria-label="Схема: ' +
    CALC_DATA.layouts[layout].label.toLowerCase() + ', ' + F.dec(s.l) + ' × ' + F.dec(s.w) + ' м">' + o.join("") + '</svg>'};
}

function draw(r){
  var s = C.state, p = svg(s.layout, s), info = p.g.info, area = s.w*s.l;
  document.getElementById("planSvg").innerHTML = p.html;
  var rows = [
    ["Размер", F.dec(s.l) + X + F.dec(s.w) + NB + "м"],
    ["Площадь", F.dec(area) + NB + "м²" + (info.loftArea ? " + антресоль " + F.dec(Math.round(info.loftArea*10)/10) + NB + "м²" : "")],
    ["Спальня", info.bed],
    ["Душ и туалет", "1 · " + m(info.bath[0]) + X + m(info.bath[1]) + NB + "м"],
    ["Фундамент", "Винтовые сваи"]
  ];
  document.getElementById("planSpecs").innerHTML = rows.map(function(x){ return "<div><dt>" + x[0] + "</dt><dd>" + x[1] + "</dd></div>"; }).join("");
  document.getElementById("planPrice").textContent = "от Rp " + F.mln(r.total.min) + NB + "млн · " + r.weeks[0] + "–" + r.weeks[1] + NB + "недель";
}

C.bind(screen);
C.onRender(draw);
})();
