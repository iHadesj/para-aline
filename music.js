/* ── Música de fundo ─────────────────────────────────────────────────────
   v2: lembra se estava tocando e EM QUE PONTO parou, então quando ela
   troca de página a música continua de onde estava (no primeiro toque,
   porque o iPhone exige um gesto pra tocar áudio).

   👉 Pra funcionar: coloque um arquivo chamado  musica.mp3  na pasta  audio/  */
(function () {
  var btn = document.getElementById("music-btn");
  if (!btn) return;

  var SRC = "audio/musica.mp3";
  var KEY = "aline-music";
  var TARGET_VOL = 0.35;

  var audio = null;
  var on = false;
  var missing = false;
  var fadeTimer = null;

  /* localStorage pode falhar em aba anônima — nunca pode quebrar o site */
  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveState() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          on: on,
          t: audio ? audio.currentTime : 0,
        }),
      );
    } catch (e) {
      /* tudo bem, só não lembra */
    }
  }

  function getAudio() {
    if (!audio) {
      audio = new Audio(SRC);
      audio.loop = true;
      audio.preload = "metadata";
      audio.volume = TARGET_VOL;

      audio.addEventListener("error", function () {
        missing = true;
        on = false;
        btn.classList.remove("playing");
        btn.classList.add("music-btn--missing");
        btn.title = "Coloque sua música em audio/musica.mp3";
      });

      /* salva o ponto da música de tempos em tempos */
      audio.addEventListener("timeupdate", saveState);
    }
    return audio;
  }

  function fadeIn(a) {
    clearInterval(fadeTimer);
    a.volume = 0;
    fadeTimer = setInterval(function () {
      a.volume = Math.min(TARGET_VOL, a.volume + 0.04);
      if (a.volume >= TARGET_VOL) clearInterval(fadeTimer);
    }, 80);
  }

  function play(resumeAt) {
    var a = getAudio();
    if (missing) return;
    if (typeof resumeAt === "number" && isFinite(resumeAt) && resumeAt > 0) {
      try {
        a.currentTime = resumeAt;
      } catch (e) {
        /* metadata ainda não veio */
      }
    }
    var p = a.play();
    if (p && p.catch) {
      p.then(function () {
        on = true;
        btn.classList.add("playing");
        btn.classList.remove("nudge");
        fadeIn(a);
        saveState();
      }).catch(function () {
        /* iOS bloqueou (sem gesto) — fica de boa esperando o toque */
      });
    }
  }

  function pause() {
    if (!audio) return;
    clearInterval(fadeTimer);
    audio.pause();
    on = false;
    btn.classList.remove("playing");
    saveState();
  }

  function toggle() {
    if (on) pause();
    else play();
  }

  btn.addEventListener("click", toggle);

  /* salva o estado quando sai da página (pagehide é o confiável no iOS) */
  window.addEventListener("pagehide", saveState);

  /* ── Retomada entre páginas ──────────────────────────────────────────
     Se na página anterior a música estava tocando, o iPhone não deixa
     a gente dar play sozinho aqui. Então: o botão dá uma balançadinha
     (classe .nudge) e o PRIMEIRO toque em qualquer lugar retoma a música
     do ponto exato em que parou. */
  var saved = loadState();
  if (saved && saved.on) {
    btn.classList.add("nudge");

    var resumed = false;
    var resume = function () {
      if (resumed) return;
      resumed = true;
      if (!on && !missing) play(saved.t || 0);
    };
    /* bindTap (presentation.js) cai pra touch/mouse em iOS sem Pointer Events */
    if (window.bindTap) window.bindTap(document, resume);
    else document.addEventListener("pointerdown", resume);
  }
})();
