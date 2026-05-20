// ═══════════════════════════════════════════════════════════════════════
//  ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════

let _stylesInjected = false;

export function _injectBuiltInStyles() {
  if (_stylesInjected || typeof document === "undefined") return;
  _stylesInjected = true;

  const css = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }
@keyframes fadeOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(20px); } }
@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }
@keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
@keyframes zoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.5); } }
@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
@keyframes bounceOut { 0% { opacity: 1; transform: scale(1); } 20% { transform: scale(0.9); } 50%,55% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0; transform: scale(0.3); } }

/* ── View Transition API presets ── */
::view-transition-old(route-content),
::view-transition-new(route-content) {
  animation-duration: 0.3s;
  animation-timing-function: ease;
}

/* Slide (directional) — forward */
:root:active-view-transition-type(slide):active-view-transition-type(forward) ::view-transition-old(route-content) {
  animation-name: slideOutLeft;
}
:root:active-view-transition-type(slide):active-view-transition-type(forward) ::view-transition-new(route-content) {
  animation-name: slideInRight;
}

/* Slide (directional) — backward */
:root:active-view-transition-type(slide):active-view-transition-type(backward) ::view-transition-old(route-content) {
  animation-name: slideOutRight;
}
:root:active-view-transition-type(slide):active-view-transition-type(backward) ::view-transition-new(route-content) {
  animation-name: slideInLeft;
}

/* Fade */
:root:active-view-transition-type(fade) ::view-transition-old(route-content) {
  animation-name: fadeOut;
}
:root:active-view-transition-type(fade) ::view-transition-new(route-content) {
  animation-name: fadeIn;
}

/* Scale */
:root:active-view-transition-type(scale) ::view-transition-old(route-content) {
  animation-name: zoomOut;
}
:root:active-view-transition-type(scale) ::view-transition-new(route-content) {
  animation-name: zoomIn;
}

/* None (disable animation) */
:root:active-view-transition-type(none) ::view-transition-group(*),
:root:active-view-transition-type(none) ::view-transition-old(*),
:root:active-view-transition-type(none) ::view-transition-new(*) {
  animation: none !important;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
  }
}
`.trim();

  const style = document.createElement("style");
  style.setAttribute("data-nojs-animations", "");
  style.textContent = css;
  document.head.appendChild(style);
}

export function _animateIn(el, animName, transitionName, durationMs) {
  _injectBuiltInStyles();
  // || 0: fires on the next event-loop tick when no CSS transition is present,
  // instead of blocking for an arbitrary duration.
  const fallback = durationMs || 0;
  if (animName) {
    const target = el.firstElementChild || el;
    target.classList.add(animName);
    if (durationMs) target.style.animationDuration = durationMs + "ms";
    const done = () => target.classList.remove(animName);
    target.addEventListener("animationend", done, { once: true });
    // Fallback: remove the class on the next tick if animationend never fires
    // (e.g. CSS absent, element detached). Mirrors the transitionName branch.
    setTimeout(done, fallback);
  }
  if (transitionName) {
    const target = el.firstElementChild || el;
    target.classList.add(
      transitionName + "-enter",
      transitionName + "-enter-active",
    );
    requestAnimationFrame(() => {
      target.classList.remove(transitionName + "-enter");
      target.classList.add(transitionName + "-enter-to");
      const done = () => {
        target.classList.remove(
          transitionName + "-enter-active",
          transitionName + "-enter-to",
        );
      };
      target.addEventListener("transitionend", done, { once: true });
      // Fallback
      setTimeout(done, fallback);
    });
  }
}

export function _animateOut(el, animName, transitionName, callback, durationMs) {
  _injectBuiltInStyles();
  // || 0: fires on the next event-loop tick when no CSS animation/transition is
  // present, instead of blocking for an arbitrary duration.
  const fallback = durationMs || 0;
  if (!el.firstElementChild && !el.childNodes.length) {
    callback();
    return () => {};
  }
  if (animName) {
    const target = el.firstElementChild || el;
    target.classList.add(animName);
    if (durationMs) target.style.animationDuration = durationMs + "ms";
    let called = false;
    const done = () => {
      if (called) return;
      called = true;
      target.classList.remove(animName);
      callback();
    };
    target.addEventListener("animationend", done, { once: true });
    const timerId = setTimeout(done, fallback); // Fallback
    return () => {
      called = true;
      clearTimeout(timerId);
      target.removeEventListener("animationend", done);
    };
  }
  if (transitionName) {
    const target = el.firstElementChild || el;
    target.classList.add(
      transitionName + "-leave",
      transitionName + "-leave-active",
    );
    let called = false;
    let timerId;
    const rafId = requestAnimationFrame(() => {
      target.classList.remove(transitionName + "-leave");
      target.classList.add(transitionName + "-leave-to");
      const done = () => {
        if (called) return;
        called = true;
        target.classList.remove(
          transitionName + "-leave-active",
          transitionName + "-leave-to",
        );
        callback();
      };
      target.addEventListener("transitionend", done, { once: true });
      timerId = setTimeout(done, fallback);
    });
    return () => {
      called = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      target.classList.remove(
        transitionName + "-leave",
        transitionName + "-leave-active",
        transitionName + "-leave-to",
      );
    };
  }
  callback();
  return () => {};
}
