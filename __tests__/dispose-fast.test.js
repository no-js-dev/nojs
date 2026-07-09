/**
 * WS4 — disposal fast path pins.
 *
 * Covers: bulk clear via Range/textContent keeps Safety Rule 1 (dispose
 * before removal), the `discard` flag skips ONLY `_elOnly`-tagged disposers
 * (element-local removeEventListener), and global watcher registries return
 * to baseline after a loop clear (no leaks).
 */
import { _disposeTree, _disposeChildren, processTree } from "../src/registry.js";
import { createContext } from "../src/context.js";
import { _storeWatchers, _i18nListeners, _onDispose, _setCurrentEl } from "../src/globals.js";
import "../src/directives/loops.js";
import "../src/directives/state.js";
import "../src/directives/binding.js";
import "../src/directives/events.js";

function flush() {
  return new Promise((res) => setTimeout(res, 0));
}

describe("WS4 — disposal fast path", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("discard=true skips _elOnly disposers but runs all others", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const calls = [];
    _setCurrentEl(el);
    const listenerDisposer = () => calls.push("listener");
    listenerDisposer._elOnly = true;
    _onDispose(listenerDisposer);
    _onDispose(() => calls.push("timer"));
    _setCurrentEl(null);

    _disposeTree(el, true);
    expect(calls).toEqual(["timer"]);
  });

  test("discard=false (default) runs every disposer", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const calls = [];
    _setCurrentEl(el);
    const listenerDisposer = () => calls.push("listener");
    listenerDisposer._elOnly = true;
    _onDispose(listenerDisposer);
    _onDispose(() => calls.push("timer"));
    _setCurrentEl(null);

    _disposeTree(el);
    expect(calls).toEqual(["listener", "timer"]);
  });

  test("loop clear removes all clones and markers stay functional (re-render works)", async () => {
    document.body.innerHTML = `
      <div state='{"rows": [{"id":1,"label":"a"},{"id":2,"label":"b"},{"id":3,"label":"c"}]}'>
        <ul>
          <li each="row in rows" key="row.id" bind="row.label"></li>
        </ul>
        <button on:click="rows = []">clear</button>
        <button id="refill" on:click='rows = [{"id":9,"label":"z"}]'>refill</button>
      </div>`;
    processTree(document.body);
    await flush();
    expect(document.querySelectorAll("li").length).toBe(3);

    document.querySelector("button").click();
    await flush();
    expect(document.querySelectorAll("li").length).toBe(0);

    // Markers must survive the bulk clear: re-render into the same range.
    document.querySelector("#refill").click();
    await flush();
    const lis = document.querySelectorAll("li");
    expect(lis.length).toBe(1);
    expect(lis[0].textContent).toBe("z");
  });

  test("store/i18n watcher registries return to baseline after loop clear", async () => {
    const storeBaseline = [..._storeWatchers.values()].reduce((n, s) => n + s.size, 0);
    const i18nBaseline = _i18nListeners.size;

    document.body.innerHTML = `
      <div state='{"rows": [{"id":1,"label":"a"},{"id":2,"label":"b"}]}'>
        <ul><li each="row in rows" key="row.id" bind="row.label"></li></ul>
      </div>`;
    processTree(document.body);
    await flush();
    expect(document.querySelectorAll("li").length).toBe(2);

    const rootCtx = document.querySelector("div").__ctx;
    rootCtx.rows = [];
    await flush();
    expect(document.querySelectorAll("li").length).toBe(0);

    const storeAfter = [..._storeWatchers.values()].reduce((n, s) => n + s.size, 0);
    expect(storeAfter).toBe(storeBaseline);
    expect(_i18nListeners.size).toBe(i18nBaseline);
  });

  test("full-replacement reconcile (no surviving keys) still disposes and re-renders", async () => {
    document.body.innerHTML = `
      <div state='{"rows": [{"id":1,"label":"a"},{"id":2,"label":"b"}]}'>
        <ul><li each="row in rows" key="row.id" bind="row.label"></li></ul>
      </div>`;
    processTree(document.body);
    await flush();

    const rootCtx = document.querySelector("div").__ctx;
    rootCtx.rows = [{ id: 10, label: "x" }, { id: 11, label: "y" }, { id: 12, label: "w" }];
    await flush();

    const lis = document.querySelectorAll("li");
    expect([...lis].map((li) => li.textContent)).toEqual(["x", "y", "w"]);
  });

  test("partial-overlap reconcile keeps surviving rows (fast path must not fire)", async () => {
    document.body.innerHTML = `
      <div state='{"rows": [{"id":1,"label":"a"},{"id":2,"label":"b"}]}'>
        <ul><li each="row in rows" key="row.id" bind="row.label"></li></ul>
      </div>`;
    processTree(document.body);
    await flush();
    const surviving = document.querySelectorAll("li")[1];

    const rootCtx = document.querySelector("div").__ctx;
    rootCtx.rows = [{ id: 2, label: "b" }, { id: 3, label: "c" }];
    await flush();

    const lis = document.querySelectorAll("li");
    expect([...lis].map((li) => li.textContent)).toEqual(["b", "c"]);
    expect(lis[0]).toBe(surviving); // reused node, not a rebuild
  });

  test("timer disposer still runs when a loop clear discards its row", async () => {
    jest.useFakeTimers();
    try {
      document.body.innerHTML = `
        <div state='{"rows": [{"id":1,"label":"a"}]}'>
          <ul><li each="row in rows" key="row.id" bind="row.label"></li></ul>
        </div>`;
      processTree(document.body);
      jest.runOnlyPendingTimers();
      expect(document.querySelectorAll("li").length).toBe(1);

      // Plant a non-_elOnly disposer on the rendered clone (simulates a
      // directive-registered clearInterval cleanup).
      const li = document.querySelector("li");
      let timerCleaned = false;
      li.__disposers = li.__disposers || [];
      li.__disposers.push(() => { timerCleaned = true; });

      const rootCtx = document.querySelector("div").__ctx;
      rootCtx.rows = [];
      jest.runOnlyPendingTimers();
      expect(document.querySelectorAll("li").length).toBe(0);
      expect(timerCleaned).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
