import { canTransitionDisplay } from './transitions';

const VIEW_WHISPERS: Record<string, string[]> = {
  home: ['歌未竟，东方白', 'Welcome to finalwhite.lol', 'Slow notes, sharp models'],
  papers: ['BibTeX is ready to copy', '613.6k evaluations & counting', 'Working papers in progress'],
  projects: ['Zero lookahead, strict PIT', 'Built to reproduce'],
  thoughts: ['Slow reading, quiet notes', '歌未竟，东方白'],
  thought: ['Slow reading, quiet notes', '歌未竟，东方白'],
  about: ['Markets for humility, history for patience', '歌未竟，东方白'],
  '404': ['Nothing on this shelf yet'],
};

const SEAL_WHISPERS = ['歌未竟，东方白', '未竟之业，静水深流', 'Dawn breaks softly'];

export function initPixelPet(): void {
  const pet = document.getElementById('pixelPet') as HTMLElement | null;
  const trigger = document.getElementById('pixelPetTrigger') as HTMLButtonElement | null;
  const pauseBtn = document.getElementById('pixelPetPause') as HTMLButtonElement | null;
  const noteEl = document.getElementById('pixelPetNote') as HTMLElement | null;
  const announceEl = document.getElementById('pixelPetAnnounce') as HTMLElement | null;
  if (!pet || !trigger || !pauseBtn) return;

  let paused = false;
  let waveTimer: number | undefined;
  let sleepTimer: number | undefined;
  let noteTimer: number | undefined;
  let whisperIndex = 0;

  const view = pet.dataset.view ?? 'home';
  const whispers = VIEW_WHISPERS[view] ?? VIEW_WHISPERS.home;
  const isThoughtArticle = view === 'thought';

  function announce(text: string): void {
    if (!announceEl) return;
    if (announceEl.textContent === text) {
      announceEl.textContent = '';
      requestAnimationFrame(() => {
        announceEl.textContent = text;
      });
    } else {
      announceEl.textContent = text;
    }
  }

  async function hideNote(): Promise<void> {
    if (!noteEl || noteEl.hidden) return;
    if (canTransitionDisplay()) {
      noteEl.hidden = true;
      return;
    }
    noteEl.setAttribute('data-closing', '');
    const animations = noteEl.getAnimations();
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => window.setTimeout(r, 400)),
      ]);
    }
    if (noteEl.hasAttribute('data-closing')) {
      noteEl.removeAttribute('data-closing');
      noteEl.hidden = true;
    }
  }

  function showNote(text: string, durationMs = 2600): void {
    announce(text);
    if (!noteEl) return;
    window.clearTimeout(noteTimer);
    noteEl.removeAttribute('data-closing');
    noteEl.textContent = text;
    noteEl.hidden = false;
    noteTimer = window.setTimeout(() => {
      void hideNote();
    }, durationMs);
  }

  function setState(next: 'idle' | 'wave' | 'sleep'): void {
    pet!.dataset.state = next;
  }

  function resetSleepTimer(): void {
    window.clearTimeout(sleepTimer);
    if (paused || document.visibilityState === 'hidden') return;
    sleepTimer = window.setTimeout(() => {
      if (!paused && document.visibilityState === 'visible' && pet!.dataset.state !== 'wave') {
        setState('sleep');
      }
    }, 35_000);
  }

  function triggerWave(message?: string): void {
    if (paused || document.visibilityState === 'hidden') return;
    window.clearTimeout(waveTimer);
    setState('wave');
    if (message) showNote(message);
    waveTimer = window.setTimeout(() => {
      if (!paused) setState('idle');
      resetSleepTimer();
    }, 2200);
  }

  trigger.addEventListener('click', () => {
    if (paused) {
      showNote('Animation paused');
      return;
    }
    if (pet.dataset.state === 'sleep') {
      setState('idle');
      triggerWave('Good morning');
      return;
    }
    const line = whispers[whisperIndex % whispers.length];
    whisperIndex += 1;
    triggerWave(line);
  });

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pet.dataset.paused = paused ? 'true' : 'false';
    if (paused) {
      window.clearTimeout(waveTimer);
      window.clearTimeout(sleepTimer);
      setState('idle');
      pauseBtn.setAttribute('aria-label', 'Resume companion animation');
      showNote('Paused');
    } else {
      pauseBtn.setAttribute('aria-label', 'Pause companion animation');
      resetSleepTimer();
      showNote('Resumed');
    }
  });

  document.addEventListener('visibilitychange', () => {
    const isHidden = document.visibilityState === 'hidden';
    pet.dataset.hidden = isHidden ? 'true' : 'false';
    if (isHidden) {
      window.clearTimeout(waveTimer);
      window.clearTimeout(sleepTimer);
    } else if (!paused) {
      if (pet.dataset.state === 'wave') setState('idle');
      resetSleepTimer();
    }
  });

  document.addEventListener('site:copied', (event) => {
    const custom = event as CustomEvent<{ label?: string }>;
    const label = custom.detail?.label ?? 'Copied';
    if (paused) {
      showNote(label);
      return;
    }
    triggerWave(label);
  });

  let sealIndex = 0;
  document.addEventListener('site:seal-stamped', () => {
    const line = SEAL_WHISPERS[sealIndex % SEAL_WHISPERS.length];
    sealIndex += 1;
    if (paused) {
      showNote(line);
      return;
    }
    triggerWave(line);
  });

  document.addEventListener('site:ink-changed', (event) => {
    const custom = event as CustomEvent<{ label?: string }>;
    const label = custom.detail?.label;
    if (!label) return;
    if (paused) {
      showNote(`Ink: ${label}`);
      return;
    }
    triggerWave(`Ink: ${label}`);
  });

  document.addEventListener('site:pet-wave', () => {
    if (paused) {
      showNote('Animation paused');
      return;
    }
    const line = whispers[whisperIndex % whispers.length];
    whisperIndex += 1;
    triggerWave(line);
  });

  if (isThoughtArticle) {
    let saluted = false;
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const ratio = window.scrollY / scrollable;
      if (ratio >= 0.72 && !saluted) {
        saluted = true;
        triggerWave('Thanks for reading');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  ['pointerdown', 'keydown'].forEach((evt) => {
    document.addEventListener(
      evt,
      (event) => {
        const targetNode = event.target as Node | null;
        if (targetNode && trigger.contains(targetNode)) {
          resetSleepTimer();
          return;
        }
        if (!paused && pet.dataset.state === 'sleep') {
          setState('idle');
        }
        resetSleepTimer();
      },
      { passive: true }
    );
  });

  resetSleepTimer();
}
