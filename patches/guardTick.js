import { definePatch } from "../modUtils.js";

export default definePatch(({ replaceCode }) => {
  replaceCode(
    `if (aWD === 0) {
      bi.a2Q.aWV(bK.aD);
    } else {
      aWW();
    }`,
    `if (aWD === 0) {
      if (bi.a2Q && typeof bi.a2Q.aWV === "function") {
        bi.a2Q.aWV(bK.aD);
      } else if (!window.__fxTickGuardWarned) {
        window.__fxTickGuardWarned = true;
        console.warn("[fx] tick handler missing aWV; skipped server tick data");
      }
    } else {
      aWW();
    }`
  );
});
