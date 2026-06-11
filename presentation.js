(function () {
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  }

  function isInternalPageLink(link) {
    if (!link || link.target || link.hasAttribute('download')) return false;

    var rawHref = link.getAttribute('href');
    if (!rawHref || rawHref.charAt(0) === '#' || rawHref.indexOf('javascript:') === 0) return false;

    var targetUrl;
    try {
      targetUrl = new URL(rawHref, window.location.href);
    } catch (err) {
      return false;
    }

    if (targetUrl.protocol !== window.location.protocol) return false;
    if (targetUrl.protocol.indexOf('http') === 0 && targetUrl.origin !== window.location.origin) return false;
    if (targetUrl.href === window.location.href) return false;

    return true;
  }

  function setupPageTransitions() {
    if (reduceMotion) return;

    document.addEventListener('click', function (event) {
      if (isModifiedClick(event)) return;

      var link = event.target.closest && event.target.closest('a[href]');
      if (!isInternalPageLink(link)) return;

      event.preventDefault();
      document.body.classList.add('is-leaving');

      window.setTimeout(function () {
        window.location.href = link.href;
      }, 260);
    });
  }

  function setupCardGlow() {
    var cards = document.querySelectorAll('.card');

    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width) * 100;
        var y = ((event.clientY - rect.top) / rect.height) * 100;

        card.style.setProperty('--mx', x.toFixed(2) + '%');
        card.style.setProperty('--my', y.toFixed(2) + '%');
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '12%');
      });
    });
  }

  window.loveBurst = function (amount) {
    if (reduceMotion) return;

    var total = amount || 26;

    for (var i = 0; i < total; i++) {
      var node = document.createElement('span');
      var angle = (Math.PI * 2 * i) / total;
      var distance = 80 + Math.random() * 170;
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance - 40;

      node.className = 'burst-heart';
      node.textContent = '\u2665';
      node.style.setProperty('--dx', dx.toFixed(0) + 'px');
      node.style.setProperty('--dy', dy.toFixed(0) + 'px');
      node.style.setProperty('--rot', ((Math.random() * 140) - 70).toFixed(0) + 'deg');
      node.style.setProperty('--scale', (0.72 + Math.random() * 1.05).toFixed(2));
      node.style.setProperty('--delay', (Math.random() * 0.16).toFixed(2) + 's');

      document.body.appendChild(node);

      window.setTimeout(function (heart) {
        heart.remove();
      }, 1450, node);
    }
  };

  setupPageTransitions();
  setupCardGlow();
})();
