import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    const oldHostnameCheck = /this\.vf=(?:0<=)?this\.hostname\.indexOf\([^)]*\)(?:>=0)?/g;
    const newHostnameCheck = /this\.lV=(?:0<=)?this\.hostname\.indexOf\([^)]*\)(?:>=0)?/g;
    const newModCheck = /this\.uj=(?:0<=)?this\.hostname\.indexOf\([^)]*\)(?:>=0)?/g;

    if (oldHostnameCheck.test(modUtils.script)) {
      oldHostnameCheck.lastIndex = 0;
      modUtils.replaceOne(oldHostnameCheck, "this.vf=true");
      return;
    }

    modUtils.replaceOne(newHostnameCheck, "this.lV=true");
    modUtils.replaceOne(newModCheck, "this.uj=true");
  });
});
