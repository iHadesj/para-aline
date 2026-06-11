/* ── Corações flutuando ao fundo ─────────────────────────────────────────
   v2: sprites pré-renderizados (bem mais leve no iPhone), tela retina,
   pausa quando o app vai pro fundo. Não precisa mexer em nada aqui. */
(function () {
  var canvas = document.getElementById('hearts-canvas');
  if (!canvas) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ctx = canvas.getContext('2d');
  var W, H, DPR;
  var hearts = [];
  /* celular fraco: menos corações e render em 1x — eles são difusos,
     ninguém percebe a resolução, mas a GPU percebe os pixels a menos.
     Tela grande não garante hardware bom (tablet barato, notebook velho),
     então poucos núcleos/pouca RAM também entram no modo leve */
  var isPhone = Math.min(screen.width, screen.height) < 520;
  var weakHW = (navigator.hardwareConcurrency || 8) <= 4 ||
               (navigator.deviceMemory || 8) <= 4;
  var lowEnd = isPhone || weakHW;
  var COUNT = lowEnd ? 12 : 16;
  var running = true;
  var rafId = null;

  /* ── Sprites: desenha o coração UMA vez por cor, depois só carimba.
     shadowBlur a cada frame mataria o iPhone; aqui fica de graça. */
  var SPRITE_BASE = 96; // px (área útil do coração dentro do sprite)
  var SPRITE_PAD  = 28; // espaço pro glow não cortar
  var SPRITE_SIZE = SPRITE_BASE + SPRITE_PAD * 2;
  var COLORS = ['#ff5e8a', '#d9547a', '#ff7da1'];
  var sprites = [];

  function heartPath(c, cx, cy, s) {
    c.beginPath();
    var first = true;
    for (var t = 0; t <= 6.3; t += 0.1) {
      var x = cx + s * 16 * Math.pow(Math.sin(t), 3);
      var y = cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      if (first) { c.moveTo(x, y); first = false; }
      else c.lineTo(x, y);
    }
    c.closePath();
  }

  function makeSprites() {
    sprites = COLORS.map(function (color) {
      var off = document.createElement('canvas');
      off.width = off.height = SPRITE_SIZE;
      var oc = off.getContext('2d');
      var s = SPRITE_BASE / 33; // a curva paramétrica tem ~33 unidades de altura
      oc.shadowColor = color;
      oc.shadowBlur = 18;
      oc.fillStyle = color;
      heartPath(oc, SPRITE_SIZE / 2, SPRITE_SIZE / 2 - SPRITE_BASE * 0.06, s);
      oc.fill();
      oc.fill(); // segunda passada deixa o glow mais cheio
      return off;
    });
  }

  function resize() {
    DPR = lowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    /* teto de pixels: tela grande + retina multiplica o custo de cada frame */
    if (W * H * DPR * DPR > 2.4e6) DPR = Math.max(1, Math.sqrt(2.4e6 / (W * H)));
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function randomHeart() {
    return {
      x:      Math.random() * W,
      y:      H + Math.random() * 80 + 30,
      size:   Math.random() * 26 + 12,      // 12–38 px na tela
      speed:  Math.random() * 0.4 + 0.18,   // sobe devagarzinho
      drift:  (Math.random() - 0.5) * 0.25,
      sway:   Math.random() * Math.PI * 2,  // fase do balanço
      swaySp: Math.random() * 0.012 + 0.005,
      angle:  (Math.random() - 0.5) * 0.6,
      spin:   (Math.random() - 0.5) * 0.006,
      alpha:  Math.random() * 0.13 + 0.05,
      sprite: sprites[~~(Math.random() * sprites.length)],
    };
  }

  function init() {
    resize();
    makeSprites();
    hearts = [];
    for (var i = 0; i < COUNT; i++) {
      var h = randomHeart();
      h.y = Math.random() * H; // espalha na primeira carga
      hearts.push(h);
    }
  }

  /* ── Plano B: se os primeiros segundos vierem engasgados, corta os
     corações pela metade e passa a desenhar frame sim, frame não
     (30fps — pra coisa subindo devagar ninguém percebe) ── */
  var perfFrames = 0, perfBad = 0, perfLast = 0, perfDone = false;
  var skipFrame = false, skipToggle = false;

  function watchPerf(now) {
    if (perfLast) {
      perfFrames++;
      if (now - perfLast > 50) perfBad++;
    }
    perfLast = now;
    if (perfBad >= 5) {
      perfDone = true;
      skipFrame = true;
      hearts.length = Math.max(6, hearts.length >> 1);
    } else if (perfFrames >= 110) {
      perfDone = true;
    }
  }

  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    if (!perfDone) watchPerf(now);
    if (skipFrame) {
      skipToggle = !skipToggle;
      if (skipToggle) return;
    }
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < hearts.length; i++) {
      var h = hearts[i];

      ctx.save();
      ctx.translate(h.x + Math.sin(h.sway) * 8, h.y);
      ctx.rotate(h.angle);
      ctx.globalAlpha = h.alpha;
      ctx.drawImage(h.sprite, -h.size / 2, -h.size / 2, h.size, h.size);
      ctx.restore();

      h.y     -= h.speed;
      h.x     += h.drift;
      h.sway  += h.swaySp;
      h.angle += h.spin;

      if (h.y < -50) {
        var fresh = randomHeart();
        fresh.x = Math.random() * W;
        hearts[i] = fresh;
      }
    }
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    running = true;
    perfLast = 0; // a pausa não conta como frame perdido
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* iOS pausa rAF sozinho, mas garantimos pra não acumular nada esquisito */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!reduceMotion) start();
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  init();

  if (reduceMotion) {
    // desenha um frame parado e pronto — respeita quem enjoa com movimento
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < hearts.length; i++) {
      var h = hearts[i];
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.globalAlpha = h.alpha;
      ctx.drawImage(h.sprite, -h.size / 2, -h.size / 2, h.size, h.size);
      ctx.restore();
    }
  } else {
    start();
  }
})();
