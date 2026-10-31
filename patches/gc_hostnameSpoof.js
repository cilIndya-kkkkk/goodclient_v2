import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replace(
      /this\.(\w+)=this\.hostname\.indexOf\([^)]*\)(?:>=0)?/g,
      "this.$1=true",
    );
  });
});
