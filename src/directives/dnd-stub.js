import { _warn } from "../globals.js";
import { registerDirective } from "../registry.js";

const _STUB_MSG = (name) =>
  `[NoJS] "${name}" has moved to @erickxavier/nojs-elements. ` +
  `Install the plugin and call NoJS.use(NoJSElements) to enable it.`;

for (const name of ["drag", "drop", "drag-list", "drag-multiple"]) {
  registerDirective(name, {
    priority: name === "drag-multiple" ? 16 : name === "drag-list" ? 10 : 15,
    init(el, attrName) {
      _warn(_STUB_MSG(attrName));
    },
  });
}
