export function getTeamTag(name) {
  const match = String(name || "").match(/\[([^\]]{1,12})\]/);
  return match ? `[${match[1]}]` : "";
}
