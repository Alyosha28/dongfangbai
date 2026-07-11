// dongfangbai · client-side logic
// boot animation + theme toggle + market HUD + scroll behaviors + SFX

import { startMarketFeed } from './market-feed';

export function initClient() {
  const html = document.documentElement;
  const themeBtn = document.getElementById('themeToggle') as HTMLButtonElement | null;
  const themeSweep = document.getElementById('themeSweep');
  const bootScreen = document.getElementById('bootScreen');
  const bootSkip = document.getElementById('bootSkip');
  const marketHud = document.getElementById('marketHud');
  const penpen = document.getElementById('penpen');
  const penpenBubble = penpen?.querySelector('.penpen-bubble') as HTMLElement | null;
  const progress = document.getElementById('readProgress');
  const postEnd = document.getElementById('postEnd');
  startMarketFeed();

  // ============================================
  // SFX · audio cues (from huashu-design SFX library)
  // + first-interaction unlock(绕过浏览器 autoplay policy)
  // ============================================
  function createSfx(src: string, volume = 0.55): HTMLAudioElement {
    const a = new Audio(src);
    a.volume = volume;
    a.preload = 'auto';
    return a;
  }
  function playSfx(a: HTMLAudioElement) {
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }
  const sfx = {
    bootInit: createSfx('/sfx/boot-init.mp3', 0.5),
    bootComplete: createSfx('/sfx/boot-complete.mp3', 0.55),
    themeToggle: createSfx('/sfx/theme-toggle.mp3', 0.45),
  };
  // First-interaction unlock · 在任意用户输入后,把所有 sfx 都"激活"一次
  // (空播 + 立即暂停),后续 playSfx 不再被 autoplay policy 屏蔽
  let sfxUnlocked = false;
  function unlockSfx() {
    if (sfxUnlocked) return;
    sfxUnlocked = true;
    Object.values(sfx).forEach((a) => {
      try {
        a.muted = true;
        const p = a.play();
        if (p && typeof p.then === 'function') {
          p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
        } else {
          a.pause(); a.currentTime = 0; a.muted = false;
        }
      } catch {}
    });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, unlockSfx, { once: true, passive: true });
  });

  // ============================================
  // theme button label sync (after FOUC-prevention inline script)
  // ============================================
  if (themeBtn) {
    const cur = html.dataset.theme || 'night';
    themeBtn.textContent = cur === 'night' ? 'TRIGGER: DAY' : 'TRIGGER: NIGHT';
  }

  // ============================================
  // BOOT SCREEN · NERV-style entrance
  // ============================================
  function revealHero() {
    document.body.classList.add('hero-revealed');
  }
  function endBoot() {
    if (!bootScreen) return;
    bootScreen.classList.add('gone');
    setTimeout(() => bootScreen.remove(), 600);
    if (marketHud) {
      setTimeout(() => marketHud.classList.add('visible'), 300);
    }
    setTimeout(revealHero, 150);
    try { sessionStorage.setItem('dongfangbai-boot-seen', '1'); } catch {}
  }

  const skipBoot = (() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('skipboot') === '1') return true;
      return sessionStorage.getItem('dongfangbai-boot-seen') === '1';
    } catch { return false; }
  })();

  if (bootScreen) {
    if (skipBoot) {
      bootScreen.remove();
      if (marketHud) marketHud.classList.add('visible');
      revealHero();
    } else {
      // 3.0s ceremonial boot · MAGI dropped, single-line status replaces
      const BOOT_DURATION = 3000;
      // sync CSS progress bar var
      bootScreen.style.setProperty('--boot-duration', `${BOOT_DURATION}ms`);
      // SFX timing - init plays right at boot start
      setTimeout(() => playSfx(sfx.bootInit), 80);
      // SFX timing - complete just before fade out
      setTimeout(() => playSfx(sfx.bootComplete), BOOT_DURATION - 400);
      // auto-end
      const bootTimer = window.setTimeout(endBoot, BOOT_DURATION);
      if (bootSkip) {
        bootSkip.addEventListener('click', () => { clearTimeout(bootTimer); endBoot(); });
      }
      const skipHandler = (e: KeyboardEvent) => {
        if (['Enter', ' ', 'Escape'].includes(e.key)) {
          clearTimeout(bootTimer);
          endBoot();
          document.removeEventListener('keydown', skipHandler);
        }
      };
      document.addEventListener('keydown', skipHandler);
      // any click on boot screen (not just the SKIP button) skips
      bootScreen.addEventListener('click', () => {
        clearTimeout(bootTimer);
        endBoot();
      });
    }
  } else {
    if (marketHud) marketHud.classList.add('visible');
    revealHero();
  }

  // ============================================
  // THEME TOGGLE · NERV sweep + persistence + SFX
  // ============================================
  let themeSwitching = false;
  if (themeBtn && themeSweep) {
    themeBtn.addEventListener('click', () => {
      if (themeSwitching) return;
      themeSwitching = true;
      playSfx(sfx.themeToggle);
      themeSweep.classList.remove('sweeping');
      void (themeSweep as HTMLElement).offsetWidth;
      themeSweep.classList.add('sweeping');
      setTimeout(() => {
        const cur = html.dataset.theme || 'night';
        const next = cur === 'night' ? 'day' : 'night';
        html.dataset.theme = next;
        themeBtn.textContent = next === 'night' ? 'TRIGGER: DAY' : 'TRIGGER: NIGHT';
        try { localStorage.setItem('dongfangbai-theme', next); } catch {}
      }, 320);
      setTimeout(() => {
        themeSweep.classList.remove('sweeping');
        themeSwitching = false;
      }, 750);
    });
  }

  // ============================================
  // TIMECODE (live)
  // ============================================
  const timecodeEl = document.getElementById('timecode');
  function updateTimecode() {
    if (!timecodeEl) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    timecodeEl.textContent = `${hh}:${mm}:${ss}`;
  }
  updateTimecode();
  setInterval(updateTimecode, 1000);

  // ============================================
  // SYNC RATE
  // ============================================
  const syncEl = document.getElementById('syncRate');
  function updateSync() {
    if (!syncEl) return;
    const v = (99.0 + Math.random() * 0.9).toFixed(1);
    syncEl.textContent = `${v}%`;
  }
  setInterval(updateSync, 3000);

  // ============================================
  // READ PROGRESS + PEN PEN SALUTING
  // ============================================
  const ORIGINAL_BUBBLE = '// ペンペン · ON DUTY';
  const READ_BUBBLE = '// ペンペン · 已读 ▲';
  function updateScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = h > 0 ? window.scrollY / h : 0;
    if (progress) (progress as HTMLElement).style.width = Math.min(ratio * 100, 100) + '%';
    if (penpen) {
      const isPost = html.dataset.view === 'post';
      if (isPost && ratio > 0.7) {
        if (!penpen.classList.contains('saluting')) {
          penpen.classList.add('saluting');
          if (penpenBubble) penpenBubble.textContent = READ_BUBBLE;
        }
      } else if (penpen.classList.contains('saluting')) {
        penpen.classList.remove('saluting');
        if (penpenBubble) penpenBubble.textContent = ORIGINAL_BUBBLE;
      }
    }
  }
  window.addEventListener('scroll', updateScroll, { passive: true });

  // ============================================
  // POST-END · 「歌未竟」reveal on scroll
  // ============================================
  if (postEnd) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('revealed');
      });
    }, { threshold: 0.35 });
    io.observe(postEnd);
  }

  // ============================================
  // PEN PEN BLINK
  // ============================================
  if (penpen) {
    setInterval(() => {
      if (Math.random() > 0.5) {
        penpen.classList.add('blinking');
        setTimeout(() => penpen.classList.remove('blinking'), 150);
      }
    }, 3000);
    if (html.dataset.view === '404') {
      penpen.style.display = 'none';
    }
  }

  // ============================================
  // MARKET HUD · 数据跳动
  // ============================================
  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  document.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && themeBtn) themeBtn.click();
  });
}
