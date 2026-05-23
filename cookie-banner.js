// ═══════════════════════════════════════════════════
//  BANDEAU COOKIES — Le Boudoir de Karoline
//  S'affiche à la première visite, mémorise le choix
// ═══════════════════════════════════════════════════

(function () {
  const STORAGE_KEY = 'boudoir_cookies';

  // Ne rien faire si le choix est déjà enregistré
  if (localStorage.getItem(STORAGE_KEY)) return;

  // ── Styles ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 99999;
      background: #1E0318;
      border-top: 2px solid rgba(201,169,110,0.35);
      padding: 20px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.82rem;
      font-weight: 300;
      color: rgba(255,249,240,0.8);
      box-shadow: 0 -8px 40px rgba(0,0,0,0.35);
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(.34,1.2,.64,1);
    }
    #cookie-banner.visible {
      transform: translateY(0);
    }
    #cookie-banner .cb-text {
      flex: 1;
      min-width: 220px;
      line-height: 1.6;
    }
    #cookie-banner .cb-text strong {
      color: #C9A96E;
      font-weight: 500;
    }
    #cookie-banner .cb-text a {
      color: #C4687A;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    #cookie-banner .cb-text a:hover {
      color: #C9A96E;
    }
    #cookie-banner .cb-btns {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    #cookie-banner .cb-accept {
      background: linear-gradient(135deg, #C4687A, #D4896A);
      color: #fff;
      border: none;
      padding: 10px 24px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(196,104,122,0.4);
    }
    #cookie-banner .cb-accept:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(196,104,122,0.55);
    }
    #cookie-banner .cb-refuse {
      background: transparent;
      color: rgba(255,249,240,0.55);
      border: 1px solid rgba(255,249,240,0.2);
      padding: 10px 20px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.65rem;
      font-weight: 400;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s;
    }
    #cookie-banner .cb-refuse:hover {
      color: rgba(255,249,240,0.85);
      border-color: rgba(255,249,240,0.4);
    }
    @media (max-width: 600px) {
      #cookie-banner {
        padding: 16px 20px;
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      #cookie-banner .cb-btns {
        width: 100%;
      }
      #cookie-banner .cb-accept,
      #cookie-banner .cb-refuse {
        flex: 1;
        text-align: center;
      }
    }
  `;
  document.head.appendChild(style);

  // ── HTML du bandeau ─────────────────────────────
  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Consentement aux cookies');
  banner.innerHTML = `
    <div class="cb-text">
      <strong>✦ Cookies</strong> — Ce site utilise des polices Google Fonts et peut déposer de petits fichiers témoins pour améliorer votre expérience.
      En continuant, vous acceptez leur utilisation. <a href="confidentialite.html">En savoir plus</a>
    </div>
    <div class="cb-btns">
      <button class="cb-accept" id="cb-accept-btn">Accepter</button>
      <button class="cb-refuse" id="cb-refuse-btn">Refuser</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Affichage animé après un court délai
  requestAnimationFrame(() => {
    setTimeout(() => banner.classList.add('visible'), 300);
  });

  // ── Gestion des clics ────────────────────────────
  function dismiss(choice) {
    localStorage.setItem(STORAGE_KEY, choice); // 'accepted' ou 'refused'
    banner.style.transition = 'transform 0.3s ease-in';
    banner.style.transform = 'translateY(100%)';
    setTimeout(() => banner.remove(), 350);
  }

  document.getElementById('cb-accept-btn').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('cb-refuse-btn').addEventListener('click', () => dismiss('refused'));
})();
