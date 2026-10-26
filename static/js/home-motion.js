/* VÉLOCITY — homepage motion. Native JS, no external animation dependencies.
   Lightweight pointer glow + refined title interaction + entrance typography. */
(() => {
  'use strict';
  if (!document.body.classList.contains('page-home')) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const title = document.querySelector('.luxury-refined-title');
  const kicker = document.querySelector('.kicker-text');

  if (!reduce && kicker) {
    // Keep the readable original as an accessible aria-label on its parent.
    const words = [...kicker.textContent];
    kicker.replaceChildren(...words.map((character, index) => {
      const node = document.createElement('span');
      node.className = 'kicker-letter';
      node.textContent = character === ' ' ? '\u00a0' : character;
      node.style.setProperty('--char', String(index));
      return node;
    }));
    document.documentElement.classList.add('motion-ready');
  }

  // Magnetic headline hover; no interruption for touchscreen or keyboard users.
  if (!reduce && !coarse && title) {
    title.addEventListener('pointermove', event => {
      const rect = title.getBoundingClientRect();
      const horizontal = (event.clientX - rect.left) / rect.width - .5;
      const vertical = (event.clientY - rect.top) / rect.height - .5;
      title.style.setProperty('--title-move-x', `${(horizontal * 8).toFixed(2)}px`);
      title.style.setProperty('--title-move-y', `${(vertical * 8 - 6).toFixed(2)}px`);
    }, {passive:true});
    title.addEventListener('pointerleave', () => {
      title.style.removeProperty('--title-move-x');
      title.style.removeProperty('--title-move-y');
    });
  }

  if (reduce || coarse) return;

  // Animated ambient light gently follows pointer using one frame at a time.
  const ambient = document.querySelector('.ambient-pointer');
  if (ambient) {
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let running = false;
    const move = () => {
      ambient.style.setProperty('--glow-x', `${x}px`);
      ambient.style.setProperty('--glow-y', `${y}px`);
      running = false;
    };
    document.addEventListener('pointermove', event => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      x = event.clientX;
      y = event.clientY;
      if (!running) { running = true; requestAnimationFrame(move); }
    }, {passive:true});
  }

  // Local cursor-aware spotlight and tiny tilt, with focus-visible CSS for keyboards.
  document.querySelectorAll('[data-spotlight]').forEach(card => {
    let next;
    let scheduled = false;
    const paint = () => {
      scheduled = false;
      if (!next) return;
      const rect = card.getBoundingClientRect();
      const cx = (next.x - rect.left) / rect.width;
      const cy = (next.y - rect.top) / rect.height;
      card.style.setProperty('--spot-x', `${(cx * 100).toFixed(2)}%`);
      card.style.setProperty('--spot-y', `${(cy * 100).toFixed(2)}%`);
      card.style.setProperty('--tilt-x', `${((cx - .5) * 3.6).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${((.5 - cy) * 3.2).toFixed(2)}deg`);
    };
    card.addEventListener('pointermove', event => {
      next = {x:event.clientX,y:event.clientY};
      if (!scheduled) {scheduled = true;requestAnimationFrame(paint);}
    }, {passive:true});
    card.addEventListener('pointerleave', () => {
      next = null;
      ['--spot-x','--spot-y','--tilt-x','--tilt-y'].forEach(property => card.style.removeProperty(property));
    });
  });
})();
