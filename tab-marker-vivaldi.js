/**
 * Vivaldi Tab Marker v1.0
 *
 * Small Vivaldi UI mod for visually marking tabs with a coloured star.
 * Primarily designed and tested with vertical tabs.
 *
 * Usage:
 *   - Right-click a tab.
 *   - A compact three-star palette appears next to Vivaldi's normal menu.
 *   - Available colours: blue, yellow, red.
 *   - If the current colour is active, that star is crossed out; clicking it
 *     removes the marker.
 *
 * Notes:
 *   - This is a Vivaldi UI JavaScript mod, not a Chromium extension.
 *   - Markers are stored only for the current browser UI session. Reliable
 *     restore after fully closing/restarting Vivaldi is intentionally not part
 *     of v1.0.
 */
(() => {
  "use strict";

  const MOD_ID = "vivaldi-tab-marker-v10";
  const STORE_KEY = "vivaldi-tab-marker-v10-session-state";
  const ATTR = "data-vtm-mark";
  const PALETTE_ID = "vtm-palette";
  const STAR_CLASS = "vtm-tab-star";

  const MARKS = {
    blue:   { label: "Blue",   color: "#4da3ff" },
    yellow: { label: "Yellow", color: "#ffd84a" },
    red:    { label: "Red",    color: "#ff5d5d" }
  };

  let state = loadState();
  let currentTarget = null;
  let observerTimer = null;
  let nativeCloseTimer = null;
  let paletteMode = "none"; // "none" | "paired"

  function loadState() {
    try {
      const v = JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch (_) {
      return {};
    }
  }

  function saveState() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function getTabPosition(node) {
    const el = node && node.closest ? node.closest(".tab-strip .tab-position") : null;
    return el && document.documentElement.contains(el) ? el : null;
  }

  function getChromeTabId(tabPos) {
    const inner = tabPos?.querySelector?.('[data-id^="tab-"]');
    const raw = inner?.getAttribute?.("data-id") || "";
    const m = raw.match(/^tab-(\d+)$/);
    return m ? Number(m[1]) : null;
  }

  function cssEscapeValue(v) {
    if (window.CSS && CSS.escape) return CSS.escape(String(v));
    return String(v).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function findTabPosById(tabId) {
    const inner = document.querySelector(`[data-id="tab-${cssEscapeValue(tabId)}"]`);
    return inner?.closest?.(".tab-position") || null;
  }

  function ensureStar(tabPos, markId) {
    const tab = tabPos?.querySelector?.(".tab");
    if (!tab) return false;

    let star = tab.querySelector(`:scope > .${STAR_CLASS}`);
    if (!star) {
      star = document.createElement("span");
      star.className = STAR_CLASS;
      star.setAttribute("aria-hidden", "true");
      star.textContent = "★";
      tab.appendChild(star);
    }
    star.style.color = MARKS[markId]?.color || MARKS.yellow.color;
    return true;
  }

  function removeStar(tabPos) {
    const star = tabPos?.querySelector?.(`.${STAR_CLASS}`);
    if (star) star.remove();
  }

  function applyVisual(tabId, markId) {
    const tabPos = findTabPosById(tabId);
    if (!tabPos) return false;

    if (markId && MARKS[markId]) {
      tabPos.setAttribute(ATTR, markId);
      ensureStar(tabPos, markId);
    } else {
      tabPos.removeAttribute(ATTR);
      removeStar(tabPos);
    }
    return true;
  }

  function setMark(tabId, markId) {
    if (!Number.isFinite(tabId)) return;

    if (!markId) {
      delete state[String(tabId)];
      applyVisual(tabId, null);
    } else {
      state[String(tabId)] = markId;
      applyVisual(tabId, markId);
    }
    saveState();
  }

  function injectStyle() {
    if (document.getElementById(`${MOD_ID}-style`)) return;

    const css = `
      .tab-strip .tab-position[${ATTR}] .tab {
        position: relative !important;
      }

      .tab-strip .tab-position[${ATTR}] .${STAR_CLASS} {
        position: absolute !important;
        z-index: 35 !important;
        right: 5px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 18px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        margin: 0 !important;
        pointer-events: none !important;
        user-select: none !important;
        font-family: "Segoe UI Symbol", "Segoe UI", sans-serif !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        line-height: 20px !important;
        text-align: center !important;
        text-shadow: 0 1px 2px rgba(0,0,0,.75), 0 0 1px rgba(0,0,0,.8) !important;
      }

      /* Fade the end of the title under the permanent star. */
      .tab-strip .tab-position[${ATTR}] .tab .title {
        clip-path: none !important;
        -webkit-mask-image: linear-gradient(
          to right,
          #000 0,
          #000 calc(100% - 42px),
          rgba(0,0,0,.78) calc(100% - 34px),
          rgba(0,0,0,.48) calc(100% - 28px),
          rgba(0,0,0,.18) calc(100% - 22px),
          transparent calc(100% - 16px),
          transparent 100%
        ) !important;
        mask-image: linear-gradient(
          to right,
          #000 0,
          #000 calc(100% - 42px),
          rgba(0,0,0,.78) calc(100% - 34px),
          rgba(0,0,0,.48) calc(100% - 28px),
          rgba(0,0,0,.18) calc(100% - 22px),
          transparent calc(100% - 16px),
          transparent 100%
        ) !important;
      }

      /* On hover, keep the star at the normal close-button position and move
         Vivaldi's X to the left of it. */
      .tab-strip .tab-position[${ATTR}] .tab .close {
        transform: translateX(-20px) !important;
      }

      .tab-strip .tab-position[${ATTR}]:hover .tab .title {
        -webkit-mask-image: linear-gradient(
          to right,
          #000 0,
          #000 calc(100% - 33px),
          rgba(0,0,0,.72) calc(100% - 28px),
          rgba(0,0,0,.32) calc(100% - 23px),
          transparent calc(100% - 18px),
          transparent 100%
        ) !important;
        mask-image: linear-gradient(
          to right,
          #000 0,
          #000 calc(100% - 33px),
          rgba(0,0,0,.72) calc(100% - 28px),
          rgba(0,0,0,.32) calc(100% - 23px),
          transparent calc(100% - 18px),
          transparent 100%
        ) !important;
      }

      #${PALETTE_ID} {
        position: fixed;
        display: none;
        align-items: center;
        gap: 4px;
        padding: 4px 6px;
        border-radius: 7px;
        background: var(--colorBg, #2e2e2e);
        color: var(--colorFg, #eee);
        border: 1px solid var(--colorBorder, rgba(255,255,255,.18));
        box-shadow: 0 4px 16px rgba(0,0,0,.35);
        z-index: 2147483647;
        user-select: none;
        font: 12px/1.2 sans-serif;
      }

      #${PALETTE_ID}.show { display: flex; }

      #${PALETTE_ID}.vertical {
        flex-direction: column;
        padding: 5px 4px;
        gap: 2px;
      }

      #${PALETTE_ID} button {
        width: 24px;
        height: 24px;
        min-width: 24px;
        padding: 0;
        margin: 0;
        border: 0;
        border-radius: 5px;
        background: transparent;
        color: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      #${PALETTE_ID} button:hover {
        background: rgba(128,128,128,.24);
      }

      #${PALETTE_ID} .vtm-star-choice {
        font-family: "Segoe UI Symbol", "Segoe UI", sans-serif;
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        text-shadow: 0 1px 2px rgba(0,0,0,.65);
      }

      #${PALETTE_ID} .vtm-active-clear {
        position: relative;
      }

      #${PALETTE_ID} .vtm-active-clear::after {
        content: "";
        position: absolute;
        width: 18px;
        height: 2px;
        left: 3px;
        top: 11px;
        border-radius: 1px;
        background: rgba(0,0,0,.92);
        transform: rotate(-48deg);
        transform-origin: center;
        box-shadow: 0 1px 0 rgba(255,255,255,.18);
        pointer-events: none;
      }
    `;

    const style = document.createElement("style");
    style.id = `${MOD_ID}-style`;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildPalette() {
    let p = document.getElementById(PALETTE_ID);
    if (p) return p;

    p = document.createElement("div");
    p.id = PALETTE_ID;
    p.setAttribute("role", "menu");
    p.setAttribute("aria-label", "Tab marker");

    const addButton = (markId) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vtm-star-choice";
      b.title = `${MARKS[markId].label} star`;
      b.dataset.mark = markId;
      b.dataset.action = "set";
      b.textContent = "★";
      b.style.color = MARKS[markId].color;

      /* Commit on pointerdown. Clicking our palette closes Vivaldi's native
         context menu too, so waiting for a later click event can lose the
         target tab. */
      b.addEventListener("pointerdown", ev => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        const target = currentTarget;
        const action = b.dataset.action;
        if (!target) return;

        hidePalette();
        setMark(target.tabId, action === "clear" ? null : markId);
      }, true);

      b.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
      }, true);

      p.appendChild(b);
    };

    /* Vertical order requested for v1.0: blue, yellow, red. */
    addButton("blue");
    addButton("yellow");
    addButton("red");

    document.body.appendChild(p);
    return p;
  }

  function hidePalette() {
    if (nativeCloseTimer) {
      clearTimeout(nativeCloseTimer);
      nativeCloseTimer = null;
    }
    const p = document.getElementById(PALETTE_ID);
    if (p) p.classList.remove("show");
    currentTarget = null;
    paletteMode = "none";
  }

  function attachNativeMenuLifecycle() {
    try {
      const api = (typeof vivaldi !== "undefined") ? vivaldi?.menubarMenu : null;
      if (!api) return false;

      if (api.onOpen?.addListener) {
        api.onOpen.addListener(() => {
          if (nativeCloseTimer) {
            clearTimeout(nativeCloseTimer);
            nativeCloseTimer = null;
          }
        });
      }

      if (api.onClose?.addListener) {
        api.onClose.addListener(() => {
          if (paletteMode !== "paired") return;
          if (nativeCloseTimer) clearTimeout(nativeCloseTimer);

          /* Short grace period prevents Vivaldi's menu from closing our
             palette before a star press has been committed. */
          nativeCloseTimer = setTimeout(() => {
            nativeCloseTimer = null;
            if (paletteMode === "paired") hidePalette();
          }, 80);
        });
      }
      return true;
    } catch (err) {
      console.warn("[Tab Marker] Could not attach Vivaldi menu lifecycle:", err);
      return false;
    }
  }

  function showPalette(x, y, tabPos, tabId) {
    if (nativeCloseTimer) {
      clearTimeout(nativeCloseTimer);
      nativeCloseTimer = null;
    }

    const p = buildPalette();
    currentTarget = { tabPos, tabId };
    paletteMode = "paired";

    /* Exactly three icons are always shown. If a colour is active, that same
       star is crossed out; clicking it removes the marker. */
    const activeMark = tabPos.getAttribute(ATTR) || state[String(tabId)] || null;
    for (const markId of Object.keys(MARKS)) {
      const b = p.querySelector(`button[data-mark="${markId}"]`);
      if (!b) continue;

      const isActive = markId === activeMark;
      b.classList.toggle("vtm-active-clear", isActive);
      b.dataset.action = isActive ? "clear" : "set";
      b.title = isActive
        ? `Remove ${MARKS[markId].label.toLowerCase()} star`
        : `${MARKS[markId].label} star`;
    }

    const strip = tabPos.closest?.(".tab-strip");
    const stripRect = strip?.getBoundingClientRect?.();
    const tabRect = tabPos.getBoundingClientRect();
    const verticalTabs = !!stripRect && stripRect.height > stripRect.width * 1.35;

    p.classList.toggle("vertical", verticalTabs);
    p.classList.add("show");

    p.style.left = "0px";
    p.style.top = "0px";
    const r = p.getBoundingClientRect();
    const pad = 6;
    let left;
    let top;

    if (verticalTabs) {
      /* Vivaldi's native menu opens at the pointer. Keep the small marker
         palette on the outer edge of the tab bar, centred on the clicked tab. */
      const tabsOnLeft = stripRect.left < window.innerWidth / 2;
      left = tabsOnLeft ? stripRect.left + 3 : stripRect.right - r.width - 3;
      top = tabRect.top + tabRect.height / 2 - r.height / 2;
    } else {
      /* Horizontal tabs are supported as a fallback; v1.0 is primarily tested
         with vertical tabs. */
      left = x - r.width / 2;
      top = y - r.height - 10;
    }

    left = Math.max(pad, Math.min(left, window.innerWidth - r.width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - r.height - pad));
    p.style.left = `${Math.round(left)}px`;
    p.style.top = `${Math.round(top)}px`;
  }

  function onContextMenu(ev) {
    const tabPos = getTabPosition(ev.target);
    if (!tabPos) {
      hidePalette();
      return;
    }

    const tabId = getChromeTabId(tabPos);
    if (!Number.isFinite(tabId)) return;

    showPalette(ev.clientX, ev.clientY, tabPos, tabId);
  }

  function reapplyKnownMarks() {
    for (const [id, mark] of Object.entries(state)) {
      if (mark && MARKS[mark]) applyVisual(Number(id), mark);
    }
  }

  function attachObservers() {
    const obs = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(reapplyKnownMarks, 50);
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });

    if (chrome?.tabs?.onUpdated?.addListener) {
      chrome.tabs.onUpdated.addListener((tabId) => {
        const mark = state[String(tabId)];
        if (mark && MARKS[mark]) setTimeout(() => applyVisual(tabId, mark), 30);
      });
    }

    if (chrome?.tabs?.onReplaced?.addListener) {
      chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
        const oldKey = String(removedTabId);
        const newKey = String(addedTabId);
        const mark = state[oldKey];
        if (!mark) return;

        state[newKey] = mark;
        delete state[oldKey];
        saveState();
        setTimeout(() => applyVisual(addedTabId, mark), 50);
      });
    }

    if (chrome?.tabs?.onRemoved?.addListener) {
      chrome.tabs.onRemoved.addListener((tabId) => {
        const key = String(tabId);
        if (!(key in state)) return;
        delete state[key];
        saveState();
      });
    }
  }

  function init() {
    if (window.__VIVALDI_TAB_MARKER_V10__) return;
    window.__VIVALDI_TAB_MARKER_V10__ = true;

    injectStyle();
    buildPalette();
    attachNativeMenuLifecycle();

    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("pointerdown", ev => {
      const p = document.getElementById(PALETTE_ID);
      if (p && !p.contains(ev.target) && ev.button !== 2) hidePalette();
    }, true);

    window.addEventListener("blur", () => setTimeout(hidePalette, 100));
    attachObservers();

    setTimeout(reapplyKnownMarks, 500);
    setTimeout(reapplyKnownMarks, 1200);

    console.info("[Tab Marker] Vivaldi UI mod v1.0 loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
