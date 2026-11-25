import { initPixelPet } from './pet';
import { closeTopLayerDialog, supportsTopLayerExit } from './transitions';

type InkId = 'plum' | 'cinnabar' | 'celadon' | 'noir';

const INK_LABELS: Record<InkId, string> = {
  plum: 'Dawn Plum',
  cinnabar: 'Cinnabar Seal',
  celadon: 'Song Celadon',
  noir: 'Ink Noir',
};

function isInkId(value: string | null | undefined): value is InkId {
  return value === 'plum' || value === 'cinnabar' || value === 'celadon' || value === 'noir';
}

let toggleThemeFn: ((origin?: { x: number; y: number }) => void) | null = null;
let applyInkFn: ((ink: InkId, announce?: boolean) => void) | null = null;

function initNavbar(): void {
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    void import('@oddbird/popover-polyfill');
  }

  const header = document.getElementById('siteHeader');
  const inner = header?.querySelector('.header-inner') as HTMLElement | null;
  const menu = document.getElementById('site-menu') as HTMLElement | null;
  if (!header || !inner || !menu) return;

  let lastCollapsedWidth = 0;

  const isPopoverOpen = (el: HTMLElement): boolean => {
    try {
      return el.matches(':is(:popover-open, .\\:popover-open)');
    } catch {
      return el.classList.contains(':popover-open');
    }
  };

  const measureLayout = (force = false) => {
    const isCurrentlyWide = header.classList.contains('is-wide');
    const currentWidth = header.clientWidth;

    // Avoid oscillation: when collapsed, only re-test wide layout when header widens (or fonts finish loading)
    if (!force && !isCurrentlyWide && currentWidth <= lastCollapsedWidth && lastCollapsedWidth > 0) {
      return;
    }

    const wasOpen = !isCurrentlyWide && isPopoverOpen(menu);

    header.classList.add('is-measuring', 'is-wide');
    menu.removeAttribute('popover');

    const fits = inner.scrollWidth <= inner.clientWidth + 1;

    if (fits) {
      header.classList.add('is-wide');
      menu.removeAttribute('popover');
      lastCollapsedWidth = 0;
    } else {
      header.classList.remove('is-wide');
      menu.setAttribute('popover', 'auto');
      lastCollapsedWidth = currentWidth;
      if (wasOpen && typeof menu.showPopover === 'function') {
        try {
          menu.showPopover();
        } catch {}
      }
    }

    // Flush collapsed/expanded computed styles while transitions are suppressed to avoid popover exit flash
    void header.offsetWidth;
    header.classList.remove('is-measuring');
  };

  const ro = new ResizeObserver(() => measureLayout(false));
  ro.observe(header);
  ro.observe(menu);
  measureLayout(true);

  if (document.fonts) {
    void document.fonts.ready.then(() => measureLayout(true));
    document.fonts.addEventListener?.('loadingdone', () => measureLayout(true));
  }
}

function initColorSchemeToggle(): void {
  const toggleBtn = document.getElementById('themeToggle') as HTMLButtonElement | null;
  const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
  if (!toggleBtn || !meta) return;

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');

  const getSystemScheme = (): 'light' | 'dark' => (mql.matches ? 'dark' : 'light');

  const getRenderedScheme = (): 'light' | 'dark' => {
    if (meta.content === 'light' || meta.content === 'dark') {
      return meta.content;
    }
    return getSystemScheme();
  };

  const applyScheme = (target: 'light' | 'dark', system: 'light' | 'dark') => {
    try {
      if (target === system) {
        localStorage.removeItem('color-scheme');
        meta.content = 'light dark';
      } else {
        localStorage.setItem('color-scheme', target);
        meta.content = target;
      }
    } catch {
      meta.content = target === system ? 'light dark' : target;
    }
  };

  let activeTransitionId = 0;

  const triggerThemeToggle = (origin?: { x: number; y: number }) => {
    const target: 'light' | 'dark' = getRenderedScheme() === 'dark' ? 'light' : 'dark';
    const system = getSystemScheme();

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (!docWithVT.startViewTransition || reducedMotionMql.matches) {
      applyScheme(target, system);
      return;
    }

    const transitionId = ++activeTransitionId;
    const rect = toggleBtn.getBoundingClientRect();
    const x = origin?.x ?? rect.left + rect.width / 2;
    const y = origin?.y ?? rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const root = document.documentElement;
    root.style.setProperty('--vt-x', `${Math.round(x)}px`);
    root.style.setProperty('--vt-y', `${Math.round(y)}px`);
    root.style.setProperty('--vt-r', `${Math.ceil(maxRadius)}px`);
    root.dataset.themeTransition = 'true';

    const transition = docWithVT.startViewTransition(() => {
      applyScheme(target, system);
    });

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransitionId !== transitionId) return;
        delete root.dataset.themeTransition;
        root.style.removeProperty('--vt-x');
        root.style.removeProperty('--vt-y');
        root.style.removeProperty('--vt-r');
      });
  };

  toggleThemeFn = triggerThemeToggle;

  toggleBtn.addEventListener('click', (event) => {
    const hasPointerOrigin = event.clientX > 0 || event.clientY > 0;
    triggerThemeToggle(
      hasPointerOrigin ? { x: event.clientX, y: event.clientY } : undefined
    );
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== 'color-scheme') return;
    if (event.newValue === 'light' || event.newValue === 'dark') {
      meta.content = event.newValue;
    } else {
      meta.content = 'light dark';
    }
  });
}

function initInkSwitcher(): void {
  const root = document.documentElement;
  const labelEl = document.getElementById('inkCurrentLabel');
  const swatches = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ink-option]'));
  const cmdInkItems = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-cmd-ink]'));

  const syncUi = (ink: InkId) => {
    if (ink === 'plum') {
      delete root.dataset.ink;
    } else {
      root.dataset.ink = ink;
    }

    if (labelEl) {
      labelEl.textContent = INK_LABELS[ink];
    }

    for (const btn of swatches) {
      btn.setAttribute('aria-pressed', btn.dataset.inkOption === ink ? 'true' : 'false');
    }

    for (const item of cmdInkItems) {
      const isCurrent = item.dataset.cmdInk === ink;
      item.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      if (isCurrent) {
        item.dataset.active = 'true';
      } else {
        delete item.dataset.active;
      }
    }
  };

  const applyInk = (ink: InkId, announce = true) => {
    try {
      if (ink === 'plum') {
        localStorage.removeItem('site-ink');
      } else {
        localStorage.setItem('site-ink', ink);
      }
    } catch {}
    syncUi(ink);
    if (announce) {
      document.dispatchEvent(
        new CustomEvent('site:ink-changed', { detail: { ink, label: INK_LABELS[ink] } })
      );
    }
  };

  applyInkFn = applyInk;

  const initialRaw = root.dataset.ink;
  const initialInk: InkId = isInkId(initialRaw) ? initialRaw : 'plum';
  syncUi(initialInk);

  for (const btn of swatches) {
    btn.addEventListener('click', () => {
      const next = btn.dataset.inkOption;
      if (isInkId(next)) {
        applyInk(next, true);
      }
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== 'site-ink') return;
    syncUi(isInkId(event.newValue) ? event.newValue : 'plum');
  });
}

function initHeroSeal(): void {
  const btn = document.getElementById('heroSealBtn') as HTMLButtonElement | null;
  if (!btn) return;

  let timer: number | undefined;
  btn.addEventListener('click', () => {
    window.clearTimeout(timer);
    btn.classList.remove('is-stamped');
    void btn.offsetWidth;
    btn.classList.add('is-stamped');
    document.dispatchEvent(new CustomEvent('site:seal-stamped'));
    timer = window.setTimeout(() => {
      btn.classList.remove('is-stamped');
    }, 420);
  });
}

function initScrollProgressFallback(): void {
  const progress = document.getElementById('readProgress') as HTMLElement | null;
  if (!progress || CSS.supports('animation-timeline', 'scroll()')) return;

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progress.style.transform = `scaleX(${ratio})`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initPapersToggleAll(): void {
  const container = document.getElementById('papers-list');
  const button = document.getElementById('papersToggleAll') as HTMLButtonElement | null;
  if (!container || !button) return;

  const getDetails = (): HTMLDetailsElement[] =>
    Array.from(container.querySelectorAll<HTMLDetailsElement>('details.disclosure'));

  const syncExpandedState = () => {
    const items = getDetails();
    const allOpen = items.length > 0 && items.every((item) => item.open);
    button.setAttribute('aria-expanded', String(allOpen));
  };

  const toggleAll = () => {
    const expand = button.getAttribute('aria-expanded') !== 'true';
    for (const details of getDetails()) {
      details.open = expand;
    }
    syncExpandedState();
  };

  if ('commandForElement' in HTMLButtonElement.prototype) {
    container.addEventListener('command', (event) => {
      const cmdEvent = event as Event & { command?: string };
      if (cmdEvent.command !== '--toggle-all') return;
      toggleAll();
    });
  } else {
    button.addEventListener('click', toggleAll);
  }

  document.addEventListener(
    'toggle',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !container.contains(target)) return;
      syncExpandedState();
    },
    { capture: true }
  );

  // If navigated directly to /papers#<paper-id>, reveal its abstract for immediate reading
  const revealHashPaper = () => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const targetPaper = document.getElementById(id);
    if (!targetPaper || !container.contains(targetPaper)) return;
    const firstDisclosure = targetPaper.querySelector<HTMLDetailsElement>('details.disclosure');
    if (firstDisclosure && !firstDisclosure.open) {
      firstDisclosure.open = true;
      syncExpandedState();
    }
  };

  revealHashPaper();
  window.addEventListener('hashchange', revealHashPaper);
  syncExpandedState();
}

function initThoughtScrollspy(): void {
  const toc = document.getElementById('articleToc');
  if (!toc) return;

  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  if (links.length === 0) return;

  const headingPairs = links
    .map((link) => {
      const id = decodeURIComponent((link.getAttribute('href') ?? '').slice(1));
      const heading = id ? document.getElementById(id) : null;
      if (heading && !heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      return { link, heading };
    })
    .filter((pair): pair is { link: HTMLAnchorElement; heading: HTMLElement } => pair.heading !== null);

  if (headingPairs.length === 0) return;

  if (CSS.supports('scroll-target-group: auto')) {
    const syncAriaCurrent = () => {
      const currentLink = toc.querySelector<HTMLAnchorElement>('a:target-current');
      for (const { link } of headingPairs) {
        link.setAttribute('aria-current', link === currentLink ? 'true' : 'false');
      }
    };
    syncAriaCurrent();
    document.addEventListener('scrollend', syncAriaCurrent, { passive: true });
    window.addEventListener('hashchange', () => requestAnimationFrame(syncAriaCurrent));
    toc.addEventListener('click', () => requestAnimationFrame(syncAriaCurrent));
    return;
  }

  const setActive = (activeLink: HTMLAnchorElement | null) => {
    for (const { link } of headingPairs) {
      const isActive = link === activeLink;
      link.classList.toggle('target-current', isActive);
      link.setAttribute('aria-current', isActive ? 'true' : 'false');
    }
  };

  const computeActiveHeading = (): HTMLAnchorElement => {
    const atBottom =
      window.scrollY > 0 &&
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (atBottom) {
      return headingPairs[headingPairs.length - 1].link;
    }

    const activeOffset = 120;
    let current = headingPairs[0].link;
    for (const { link, heading } of headingPairs) {
      if (heading.getBoundingClientRect().top <= activeOffset) {
        current = link;
      } else {
        break;
      }
    }
    return current;
  };

  let rafPending = false;
  const scheduleSync = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      setActive(computeActiveHeading());
    });
  };

  const syncFromHash = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const match = id ? headingPairs.find((pair) => pair.heading.id === id) : undefined;
    if (match) {
      setActive(match.link);
    } else {
      scheduleSync();
    }
  };

  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('hashchange', syncFromHash);
  toc.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (link) setActive(link);
  });

  syncFromHash();
}

function initThoughtFilter(): void {
  const toolbar = document.querySelector<HTMLElement>('[data-thought-filter]');
  if (!toolbar) return;

  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('[data-filter-tag]'));
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-thought-tags]'));
  const yearGroups = Array.from(document.querySelectorAll<HTMLElement>('[data-year-group]'));
  const statusEl = document.getElementById('thoughtFilterStatus');
  const emptyEl = document.getElementById('thoughtFilterEmpty');

  // Roving tabindex & arrow-key navigation fallback when native focusgroup is unsupported
  if (!('focusGroup' in HTMLElement.prototype) && buttons.length > 0) {
    const setRovingTab = (activeBtn: HTMLButtonElement) => {
      for (const btn of buttons) {
        btn.tabIndex = btn === activeBtn ? 0 : -1;
      }
    };

    const initialActive = buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons[0];
    setRovingTab(initialActive);

    toolbar.addEventListener('focusin', (event) => {
      const btn = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-filter-tag]');
      if (btn && buttons.includes(btn)) {
        setRovingTab(btn);
      }
    });

    toolbar.addEventListener('keydown', (event) => {
      const current = document.activeElement as HTMLButtonElement | null;
      const idx = current ? buttons.indexOf(current) : -1;
      if (idx === -1) return;

      const rtl = getComputedStyle(toolbar).direction === 'rtl';
      let nextIdx = -1;
      if (event.key === 'ArrowRight') {
        nextIdx = (idx + (rtl ? -1 : 1) + buttons.length) % buttons.length;
      } else if (event.key === 'ArrowLeft') {
        nextIdx = (idx + (rtl ? 1 : -1) + buttons.length) % buttons.length;
      } else if (event.key === 'Home') {
        nextIdx = 0;
      } else if (event.key === 'End') {
        nextIdx = buttons.length - 1;
      }

      if (nextIdx !== -1) {
        event.preventDefault();
        const nextBtn = buttons[nextIdx];
        setRovingTab(nextBtn);
        nextBtn.focus();
      }
    });
  }

  const applyFilter = (selectedTag: string) => {
    let visibleCount = 0;

    for (const btn of buttons) {
      btn.setAttribute('aria-pressed', btn.dataset.filterTag === selectedTag ? 'true' : 'false');
    }

    for (const row of rows) {
      const tags = (row.dataset.thoughtTags ?? '').split(',').filter(Boolean);
      const matches = selectedTag === 'all' || tags.includes(selectedTag);
      row.hidden = !matches;
      if (matches) visibleCount += 1;
    }

    for (const group of yearGroups) {
      const hasVisible = Array.from(group.querySelectorAll<HTMLElement>('[data-thought-tags]')).some(
        (row) => !row.hidden
      );
      group.hidden = !hasVisible;
    }

    if (emptyEl) {
      emptyEl.hidden = visibleCount > 0;
    }

    if (statusEl) {
      statusEl.textContent =
        selectedTag === 'all'
          ? `Showing all ${visibleCount} thoughts`
          : `Showing ${visibleCount} thought${visibleCount === 1 ? '' : 's'} tagged ${selectedTag}`;
    }
  };

  toolbar.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-filter-tag]');
    if (!btn) return;
    applyFilter(btn.dataset.filterTag ?? 'all');
  });
}

async function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function initCopyButtons(): void {
  const timers = new WeakMap<HTMLElement, number>();

  document.addEventListener('click', async (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-copy-text], [data-copy-url]'
    );
    if (!target) return;

    const text = target.hasAttribute('data-copy-url')
      ? window.location.href
      : (target.dataset.copyText ?? '');
    const feedbackLabel = target.dataset.copyLabel ?? 'Copied';
    const status = target.parentElement?.querySelector<HTMLElement>('.copy-status');
    const ok = await copyText(text);

    const prevTimer = timers.get(target);
    if (prevTimer) window.clearTimeout(prevTimer);

    if (ok) {
      target.dataset.copied = 'true';
      if (status) {
        status.textContent = '';
        requestAnimationFrame(() => {
          status.textContent = 'Copied';
        });
      }
      document.dispatchEvent(new CustomEvent('site:copied', { detail: { label: feedbackLabel } }));

      const nextTimer = window.setTimeout(() => {
        delete target.dataset.copied;
        if (status) status.textContent = '';
      }, 2200);
      timers.set(target, nextTimer);
    } else {
      delete target.dataset.copied;
      const codeEl = target.closest('.disclosure-panel')?.querySelector<HTMLElement>('pre code');
      if (codeEl && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      if (status) {
        status.textContent = codeEl
          ? 'Copy unavailable — BibTeX selected, press Ctrl/Cmd+C'
          : 'Copy unavailable — select text to copy';
        const nextTimer = window.setTimeout(() => {
          status.textContent = '';
        }, 4500);
        timers.set(target, nextTimer);
      }
    }
  });
}

function initCommandPalette(): void {
  const dialog = document.getElementById('commandPalette') as HTMLDialogElement | null;
  const trigger = document.getElementById('cmdTrigger') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('cmdCloseBtn') as HTMLButtonElement | null;
  const input = document.getElementById('cmdSearchInput') as HTMLInputElement | null;
  const emptyEl = document.getElementById('cmdEmpty') as HTMLElement | null;
  const statusEl = document.getElementById('cmdStatus') as HTMLElement | null;
  if (!dialog || !input) return;

  const groups = Array.from(dialog.querySelectorAll<HTMLElement>('[data-cmd-group]'));
  const items = Array.from(dialog.querySelectorAll<HTMLElement>('[data-cmd-item]'));
  let activeIndex = -1;

  const getVisibleItems = (): HTMLElement[] =>
    items.filter((el) => !el.closest('li')?.hidden);

  const setActiveIndex = (
    nextIdx: number,
    options: { scroll?: boolean; focus?: boolean } = {}
  ) => {
    const { scroll = true, focus = false } = options;
    const visible = getVisibleItems();
    for (const item of items) {
      item.classList.remove('is-selected');
    }
    if (visible.length === 0) {
      activeIndex = -1;
      return;
    }
    activeIndex = ((nextIdx % visible.length) + visible.length) % visible.length;
    const current = visible[activeIndex];
    current.classList.add('is-selected');
    if (focus) {
      current.focus({ preventScroll: !scroll });
    }
    if (scroll) {
      current.scrollIntoView({ block: 'nearest' });
    }
  };

  const applyFilter = (query: string) => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let visibleCount = 0;

    for (const item of items) {
      const haystack = item.dataset.cmdSearch ?? '';
      const matches = tokens.every((token) => haystack.includes(token));
      const li = item.closest('li');
      if (li) li.hidden = !matches;
      if (matches) visibleCount += 1;
    }

    for (const group of groups) {
      const hasVisible = Array.from(group.querySelectorAll<HTMLElement>('li')).some(
        (li) => !li.hidden
      );
      group.hidden = !hasVisible;
    }

    if (emptyEl) {
      emptyEl.hidden = visibleCount > 0;
    }

    if (statusEl) {
      statusEl.textContent =
        tokens.length === 0
          ? ''
          : visibleCount === 0
            ? 'No matching entries'
            : `${visibleCount} matching ${visibleCount === 1 ? 'entry' : 'entries'}`;
    }

    setActiveIndex(visibleCount > 0 ? 0 : -1, { scroll: false, focus: false });
  };

  const prepareOpen = () => {
    dialog.removeAttribute('data-closing');
    dialog.removeAttribute('data-instant-close');
    input.value = '';
    applyFilter('');
    requestAnimationFrame(() => {
      input.focus();
    });
  };

  const openPalette = () => {
    if (dialog.open) {
      if (dialog.hasAttribute('data-closing')) {
        prepareOpen();
      }
      return;
    }
    dialog.removeAttribute('data-closing');
    dialog.removeAttribute('data-instant-close');
    dialog.showModal();
  };

  const closePalette = () => closeTopLayerDialog(dialog);

  // Sync state whether opened via declarative command="show-modal" or JS showModal()
  const mo = new MutationObserver(() => {
    if (dialog.open) {
      prepareOpen();
    }
  });
  mo.observe(dialog, { attributes: true, attributeFilter: ['open'] });

  // Fallback for browsers without Invoker Commands (commandfor/command)
  if (trigger && !('commandForElement' in HTMLButtonElement.prototype)) {
    trigger.addEventListener('click', () => {
      openPalette();
    });
  }

  closeBtn?.addEventListener('click', () => {
    void closePalette();
  });

  // Route native cancel (Esc / closedby) through top-layer exit fallback when needed
  dialog.addEventListener('cancel', (event) => {
    if (!supportsTopLayerExit()) {
      event.preventDefault();
      void closePalette();
    }
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    dialog.removeAttribute('data-closing');
  });

  // Mandatory light-dismiss fallback when <dialog closedby="any"> is unsupported (e.g. Safari)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const isOutside = (e: PointerEvent): boolean => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener('pointercancel', () => {
      pressedOutside = false;
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) {
        void closePalette();
      }
      pressedOutside = false;
    });
  }

  input.addEventListener('input', () => {
    applyFilter(input.value);
  });

  dialog.addEventListener('focusin', (event) => {
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-cmd-item]');
    if (!item) return;
    const visible = getVisibleItems();
    const idx = visible.indexOf(item);
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx, { scroll: false, focus: false });
    }
  });

  dialog.addEventListener('keydown', (event) => {
    const focusedItem = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
      '[data-cmd-item]'
    );

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const visible = getVisibleItems();
      if (visible.length === 0) return;
      const next = activeIndex < 0 ? 0 : activeIndex + 1;
      setActiveIndex(next, { scroll: true, focus: true });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const visible = getVisibleItems();
      if (visible.length === 0) return;
      const next = activeIndex <= 0 ? visible.length - 1 : activeIndex - 1;
      setActiveIndex(next, { scroll: true, focus: true });
    } else if (event.key === 'Home' && document.activeElement !== input) {
      event.preventDefault();
      setActiveIndex(0, { scroll: true, focus: true });
    } else if (event.key === 'End' && document.activeElement !== input) {
      event.preventDefault();
      setActiveIndex(getVisibleItems().length - 1, { scroll: true, focus: true });
    } else if (event.key === 'Enter' && document.activeElement === input) {
      const visible = getVisibleItems();
      const target = activeIndex >= 0 ? visible[activeIndex] : visible[0];
      if (target) {
        event.preventDefault();
        target.click();
      }
    } else if (
      focusedItem &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      (event.key === 'Backspace' || (event.key.length === 1 && event.key !== ' '))
    ) {
      event.preventDefault();
      input.focus();
      input.value = event.key === 'Backspace' ? input.value.slice(0, -1) : input.value + event.key;
      applyFilter(input.value);
    }
  });

  dialog.addEventListener('pointermove', (event) => {
    if (document.activeElement !== input) return;
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-cmd-item]');
    if (!item) return;
    const visible = getVisibleItems();
    const idx = visible.indexOf(item);
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx, { scroll: false, focus: false });
    }
  });

  dialog.addEventListener('click', async (event) => {
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-cmd-item]');
    if (!item) return;

    const action = item.dataset.cmdAction;
    if (!action) {
      // Standard <a> navigation: close dialog cleanly (critical for same-page hash anchors)
      void closePalette();
      return;
    }

    event.preventDefault();

    if (action === 'toggle-theme') {
      // Dismiss synchronously with zero top-layer exit transition so Dawn Aperture
      // snapshots a clean page without a ghosted dialog or dimmed backdrop.
      dialog.setAttribute('data-instant-close', '');
      dialog.removeAttribute('data-closing');
      dialog.close();
      void dialog.offsetWidth;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dialog.removeAttribute('data-instant-close');
          toggleThemeFn?.();
        });
      });
      return;
    }

    await closePalette();

    if (action.startsWith('set-ink:')) {
      const ink = action.slice('set-ink:'.length);
      if (isInkId(ink)) {
        applyInkFn?.(ink, true);
      }
    } else if (action === 'copy-email') {
      const value = item.dataset.cmdValue ?? '';
      if (value) {
        const ok = await copyText(value);
        document.dispatchEvent(
          new CustomEvent('site:copied', {
            detail: { label: ok ? 'Email copied' : `Email: ${value}` },
          })
        );
      }
    } else if (action === 'pet-wave') {
      document.dispatchEvent(new CustomEvent('site:pet-wave'));
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open && !dialog.hasAttribute('data-closing')) {
        void closePalette();
      } else {
        openPalette();
      }
      return;
    }

    if (
      event.key === '/' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !dialog.open
    ) {
      const active = document.activeElement as HTMLElement | null;
      const isEditable =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable);
      if (!isEditable) {
        event.preventDefault();
        openPalette();
      }
    }
  });
}

function initNotFoundPath(): void {
  const wrap = document.getElementById('notFoundPathWrap');
  const code = document.getElementById('notFoundPath');
  if (!wrap || !code) return;
  const pathname = window.location.pathname;
  if (pathname && pathname !== '/404' && pathname !== '/404/' && pathname !== '/404.html') {
    code.textContent = pathname;
    wrap.hidden = false;
  }
}

export function initSite(): void {
  initNavbar();
  initColorSchemeToggle();
  initInkSwitcher();
  initHeroSeal();
  initScrollProgressFallback();
  initPapersToggleAll();
  initThoughtScrollspy();
  initThoughtFilter();
  initCopyButtons();
  initCommandPalette();
  initNotFoundPath();
  initPixelPet();
}
