import { definePatch } from "../modUtils.js";

export default definePatch(({ replaceCode }) => {
  replaceCode(
    `if (aWD === 0) {
      bi.a2Q.aWV(bK.aD);
    } else {
      aWW();
    }`,
    `if (aWD === 0) {
      if (!bi.a2Q || typeof bi.a2Q.aWV !== "function") {
        bi.a2Q = new ae6();
        bi.a2Q.dk();
        if (!window.__fxTickFallbackWarned) {
          window.__fxTickFallbackWarned = true;
          console.warn("[fx] tick handler missing aWV; switched to multiplayer tick handler");
        }
      }
      bi.a2Q.aWV(bK.aD);
    } else {
      aWW();
    }`
  );
});
