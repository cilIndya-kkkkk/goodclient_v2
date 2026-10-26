import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /this\.vf=(?:0<=)?this\.hostname\.indexOf\([^)]*\)(?:>=0)?/g,
      "this.vf=true"
    );
  });
});
