/* Los Tapaboketes: comportamiento compartido.
   Los números del sitio viven en datos.json (se editan sin tocar código).
   Para activar los pagos reales: pega los enlaces de Stripe en CONFIG y cambia pagosActivos a true.
   Para quitar los avisos de "prototipo": cambia oficial a true. */
(() => {
  'use strict';
  const CONFIG = {
    oficial: false,       // true = sitio oficial (oculta avisos de prototipo)
    precioBolsa: 25,      // precio de referencia por bolsa de 50 lb (USD)
    maxBolsas: 100,       // tope por compra
    // Enlaces de pago de Stripe (Payment Links). Son públicos: es seguro pegarlos aquí.
    // enlaces: un enlace por cada botón rápido (1, 5 o 10 bolsas).
    // enlacePago: enlace general con "cantidad ajustable", para "Otra cantidad".
    enlaces: { 1: '', 5: '', 10: '' },
    enlacePago: '',
    pagosActivos: false,  // pon true cuando los enlaces de arriba estén listos
    enlaceReporte: ''     // enlace con las instrucciones para reportar un bokete (lo define el equipo)
  };
  // Valores por defecto; datos.json los reemplaza cuando existe.
  const DATOS = { boketes: 400, visitados: 73, meta: 78, bolsasDonadas: 0, topeMensual: null, bolsasMes: null };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const destino = n => CONFIG.enlaces[n] || CONFIG.enlacePago || '';

  async function cargaDatos() {
    try {
      const r = await fetch('datos.json', { cache: 'no-cache' });
      if (r.ok) Object.assign(DATOS, await r.json());
    } catch (e) { /* sin datos.json: se usan los valores por defecto */ }
  }

  function init() {
    document.body.dataset.pagos = CONFIG.pagosActivos ? 'on' : 'off';
    document.body.dataset.oficial = CONFIG.oficial ? 'on' : 'off';

    /* números del sitio desde datos.json */
    $$('[data-dato]').forEach(e => {
      const v = DATOS[e.dataset.dato];
      if (v === null || v === undefined) return;
      if ('n' in e.dataset) e.dataset.n = v;
      e.textContent = v + (e.hasAttribute('data-plus') ? '+' : '');
    });

    /* marcador de bolsas: los dígitos ruedan hasta el número cuando se ve */
    const odo = $('#odo');
    if (odo) {
      const v = DATOS.bolsasDonadas;
      if (v === null || v === undefined) { const c = odo.closest('.contador'); if (c) c.hidden = true; }
      else {
        const s = String(Math.max(0, Math.floor(v))).padStart(2, '0');
        odo.setAttribute('aria-label', Math.max(0, Math.floor(v)) + ' bolsas compradas'); odo.setAttribute('role', 'img');
        odo.innerHTML = [...s].map(d => '<span class="dig" aria-hidden="true"><span class="tira" data-d="' + d + '">' + '0123456789'.split('').map(n => '<i>' + n + '</i>').join('') + '</span></span>').join('');
        const rueda = () => $$('.tira', odo).forEach((t, i) => { t.style.transitionDelay = reduce ? '0s' : (i * 140) + 'ms'; t.style.transform = 'translateY(' + (-t.dataset.d * 10) + '%)'; });
        if (reduce || !('IntersectionObserver' in window)) rueda();
        else new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { rueda(); ob.disconnect(); } }, { threshold: .5 }).observe(odo);
      }
    }

    /* botón "Cómo reportar un bokete": se activa cuando hay enlace */
    $$('[data-reporte]').forEach(b => {
      if (CONFIG.enlaceReporte) { b.href = CONFIG.enlaceReporte; b.target = '_blank'; b.rel = 'noopener noreferrer'; }
      else { b.removeAttribute('href'); b.setAttribute('aria-disabled', 'true'); b.textContent = 'Instrucciones: próximamente'; }
    });

    /* compartir: menú nativo del teléfono, o copiar el enlace */
    const msg = 'Compra una bolsa por tu isla: tapa un bokete con Los Tapaboketes.';
    $$('[data-compartir]').forEach(b => b.addEventListener('click', async () => {
      const url = location.origin && location.origin !== 'null' ? location.origin + '/' : location.href;
      try {
        if (navigator.share) { await navigator.share({ title: 'Los Tapaboketes', text: msg, url }); return; }
        await navigator.clipboard.writeText(url);
        const t = b.textContent; b.textContent = 'Enlace copiado'; setTimeout(() => { b.textContent = t; }, 2200);
      } catch (e) { /* la persona canceló */ }
    }));
    $$('[data-wa]').forEach(a => {
      const url = location.origin && location.origin !== 'null' ? location.origin + '/' : location.href;
      a.href = 'https://wa.me/?text=' + encodeURIComponent(msg + ' ' + url);
      a.target = '_blank'; a.rel = 'noopener noreferrer';
    });

    /* menú en celular */
    const toggle = $('.nav-toggle'), menu = $('#menu');
    if (toggle && menu) {
      const cierra = () => { menu.classList.remove('abierto'); toggle.setAttribute('aria-expanded', 'false'); };
      toggle.addEventListener('click', () => {
        const abre = !menu.classList.contains('abierto');
        menu.classList.toggle('abierto', abre);
        toggle.setAttribute('aria-expanded', String(abre));
      });
      menu.addEventListener('click', e => { if (e.target.closest('a')) cierra(); });
      addEventListener('keydown', e => { if (e.key === 'Escape') cierra(); });
    }

    /* luz que sigue el mouse */
    addEventListener('pointermove', e => {
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });

    /* logo que se inclina con el mouse */
    const logo = $('#logo'), wrap = $('#logoWrap');
    if (logo && wrap && !reduce) {
      addEventListener('pointermove', e => {
        const r = wrap.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        logo.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 18}deg)`;
      }, { passive: true });
    }

    /* botones magnéticos */
    if (!reduce) $$('[data-mag]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .28}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });

    /* aparecer al bajar + contadores */
    const cuenta = el => {
      const fin = +el.dataset.n, plus = el.hasAttribute('data-plus');
      if (reduce) { el.textContent = fin + (plus ? '+' : ''); return; }
      const t0 = performance.now(), dur = 1400;
      const paso = t => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(fin * e) + (plus && p === 1 ? '+' : '');
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('on');
        $$('[data-n]', en.target).forEach(cuenta);
        io.unobserve(en.target);
      }), { threshold: .18 });
      $$('.rev').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 90 + 'ms'; io.observe(el); });
    } else {
      $$('.rev').forEach(el => el.classList.add('on'));
    }

    /* imágenes que faltan: se muestra un recuadro en vez de una imagen rota */
    const bolsaImg = $('#bolsaImg img');
    if (bolsaImg) {
      const falla = () => { bolsaImg.parentNode.classList.add('vacia'); bolsaImg.remove(); };
      bolsaImg.addEventListener('error', falla);
      if (bolsaImg.complete && bolsaImg.naturalWidth === 0) falla();
    }

    /* video de ellos: se activa solo al llegar, sin sonido hasta que la persona lo pida */
    const vid = $('#intro'), wrapV = $('#videoWrap'), snd = $('#sonido');
    if (vid && wrapV) {
      const src = $('source', vid);
      const sinVideo = () => wrapV.classList.add('vacio');
      if (src) src.addEventListener('error', sinVideo);
      if (vid.networkState === 3) sinVideo();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => es.forEach(en => {
          if (wrapV.classList.contains('vacio')) return;
          if (en.isIntersecting) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); } else vid.pause();
        }), { threshold: .55 }).observe(wrapV);
      }
      if (snd) snd.addEventListener('click', () => {
        vid.muted = !vid.muted;
        snd.setAttribute('aria-pressed', String(!vid.muted));
        snd.textContent = vid.muted ? 'Activar sonido' : 'Silenciar';
      });
    }

    /* compra de bolsas */
    const total = $('#total');
    if (total) {
      const ops = $$('.op'), otra = $('#otra'), btn = $('#donar'), nota = $('#nota');
      const modal = $('#modal'), mCant = $('#mCantidad'), mTotal = $('#mTotal');
      // tope mensual (opcional): si hay tope y se llena, se pausa la compra
      const restan = (DATOS.topeMensual && DATOS.bolsasMes !== null && DATOS.bolsasMes !== undefined) ? Math.max(0, DATOS.topeMensual - DATOS.bolsasMes) : Infinity;
      const maxima = Math.min(CONFIG.maxBolsas, restan);
      let n = Math.min(5, maxima) || 5;
      const dinero = v => '$' + v.toLocaleString('en-US');
      const pinta = () => {
        total.textContent = dinero(n * CONFIG.precioBolsa);
        ops.forEach(o => o.setAttribute('aria-pressed', String(+o.dataset.n === n && !otra.value)));
      };
      ops.forEach(o => {
        if (+o.dataset.n > maxima) { o.disabled = true; o.setAttribute('aria-disabled', 'true'); }
        o.addEventListener('click', () => { if (o.disabled) return; n = +o.dataset.n; otra.value = ''; pinta(); });
      });
      otra.max = maxima === Infinity ? CONFIG.maxBolsas : maxima;
      otra.addEventListener('input', () => {
        const v = Math.min(Math.max(parseInt(otra.value, 10) || 0, 0), maxima);
        if (otra.value && String(v) !== otra.value) otra.value = v || '';
        if (v > 0) { n = v; pinta(); }
      });
      if (restan === 0) {
        btn.disabled = true; btn.textContent = 'Meta del mes completa'; otra.disabled = true;
        if (nota) nota.textContent = '¡Gracias, Puerto Rico! La meta de este mes ya se completó. Vuelve el mes que viene.';
      } else if (restan !== Infinity && nota) {
        nota.insertAdjacentHTML('afterbegin', 'Este mes quedan ' + restan + ' bolsas por comprar. ');
      }
      btn.addEventListener('click', () => {
        const url = CONFIG.pagosActivos ? destino(n) : '';
        if (url) { location.href = url; return; }
        mCant.textContent = n + (n === 1 ? ' bolsa' : ' bolsas');
        mTotal.textContent = dinero(n * CONFIG.precioBolsa);
        if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
      });
      if (modal) {
        $$('[data-cerrar]', modal).forEach(b => b.addEventListener('click', () => modal.close ? modal.close() : modal.removeAttribute('open')));
        modal.addEventListener('click', e => { if (e.target === modal && modal.close) modal.close(); });
      }
      pinta();
    }
  }

  /* confeti en la página de gracias (canvas-confetti, licencia ISC; respeta "menos movimiento") */
  function confeti() {
    if (!window.confetti) return;
    const base = { colors: ['#ffd21f', '#ff3b30', '#f3f1ea', '#ffb800'], disableForReducedMotion: true, zIndex: 200, ticks: 220 };
    window.confetti({ ...base, particleCount: 130, spread: 85, startVelocity: 48, origin: { x: .5, y: .62 } });
    const oculta = () => document.querySelectorAll('canvas').forEach(c => c.setAttribute('aria-hidden', 'true'));
    oculta();
    const fin = Date.now() + 1300;
    (function lluvia() {
      window.confetti({ ...base, particleCount: 4, angle: 60, spread: 58, origin: { x: 0, y: .75 } });
      window.confetti({ ...base, particleCount: 4, angle: 120, spread: 58, origin: { x: 1, y: .75 } });
      oculta();
      if (Date.now() < fin) requestAnimationFrame(lluvia);
    })();
  }
  if ($('[data-confeti]')) {
    addEventListener('load', () => setTimeout(confeti, 350));
    $$('[data-confeti-btn]').forEach(b => b.addEventListener('click', confeti));
  }

  cargaDatos().then(init);
})();
