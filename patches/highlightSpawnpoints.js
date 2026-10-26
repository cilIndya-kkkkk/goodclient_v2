import ModUtils from "../modUtils.js";

// Highlight clan spawnpoints
export default (/** @type {ModUtils} */ { replaceCode, safeDictionary: dict }) => {
    // when rendered on game start
    replaceCode(
        `var x = (d.minX[i] + d.maxX[i] + 1 - hQ - 2) >> 1;
        var y = (d.minY[i] + d.maxY[i] + 1 - hQ - 2) >> 1;
        ctx.drawImage(a1e[game.gIsTeamGame ? ((game.gGameType === 9 && aD.a[i] === 5) ? 3 : t.ids[i]) : (i < game.gHumans ? 1 : 0)], x, y);`,
        `var highlight = __fx.settings.highlightClanSpawns && __fx.clanFilter.inOwnClan[i];
        if (highlight) hQ *= 2;
        var x = (d.minX[i] + d.maxX[i] + 1 - hQ - 2) >> 1;
        var y = (d.minY[i] + d.maxY[i] + 1 - hQ - 2) >> 1;
        if (highlight) ctx.drawImage(a1e[game.gIsTeamGame ? ((game.gGameType === 9 && aD.a[i] === 5) ? 3 : t.ids[i]) : (i < game.gHumans ? 1 : 0)], x, y, hQ, hQ);
        else ctx.drawImage(a1e[game.gIsTeamGame ? ((game.gGameType === 9 && aD.a[i] === 5) ? 3 : t.ids[i]) : (i < game.gHumans ? 1 : 0)], x, y);`,
    )

    // when rendered during spawn selection
    replaceCode(
        `var x = f.w * ((playerData.minX[i] + playerData.maxX[i] + 1) / 2 - gE) / (li - gE) - 0.5 * j7;
		var y = f.h * ((playerData.minY[i] + playerData.maxY[i] + 1) / 2 - ex) / (lj - ex) - 0.5 * j7;
		if (x > f.w || y > f.h || x < -j7 || y < -j7) { return; }
		mainCanvas.setTransform(bg, 0, 0, bg, x, y);
		mainCanvas.drawImage(vL[game.gIsTeamGame ? TeamManager.ids[i] : 1], 0, 0);`,

        `        var highlight = __fx.settings.showAllSpawnPoints || (__fx.settings.highlightClanSpawns && __fx.clanFilter.inOwnClan[i]);
        if (highlight) j7 *= 2;
		var x = f.w * ((playerData.minX[i] + playerData.maxX[i] + 1) / 2 - gE) / (li - gE) - 0.5 * j7;
		var y = f.h * ((playerData.minY[i] + playerData.maxY[i] + 1) / 2 - ex) / (lj - ex) - 0.5 * j7;
		if (x > f.w || y > f.h || x < -j7 || y < -j7) { return; }
		if (highlight) mainCanvas.setTransform(bg*2, 0, 0, bg*2, x, y);
		else mainCanvas.setTransform(bg, 0, 0, bg, x, y);
		mainCanvas.drawImage(vL[game.gIsTeamGame ? TeamManager.ids[i] : 1], 0, 0);
        if (__fx.settings.showSpawnPointNames) {
            var spawnName = playerData.${dict.rawPlayerNames}[i];
            if (spawnName) {
                mainCanvas.save();
                mainCanvas.setTransform(1, 0, 0, 1, 0, 0);
                mainCanvas.font = (__fx.settings.spawnPointNameSize || 12) + "px Trebuchet MS, Arial, sans-serif";
                mainCanvas.textAlign = "center";
                mainCanvas.textBaseline = "top";
                mainCanvas.lineWidth = 3;
                mainCanvas.strokeStyle = "rgba(0, 0, 0, 0.9)";
                mainCanvas.fillStyle = (i === __fx.selectedSpawnPlayer) ? "#ffd400" : "#ffffff";
                var spawnLabel = spawnName.length > 18 ? spawnName.slice(0, 18) + "…" : spawnName;
                var spawnLabelX = x + j7 / 2;
                var spawnLabelY = y + j7 + 2;
                mainCanvas.strokeText(spawnLabel, spawnLabelX, spawnLabelY);
                mainCanvas.fillText(spawnLabel, spawnLabelX, spawnLabelY);
                mainCanvas.restore();
            }
        }
        if (i === __fx.selectedSpawnPlayer) {
            mainCanvas.save();
            mainCanvas.setTransform(1, 0, 0, 1, 0, 0);
            mainCanvas.strokeStyle = "#ffd400";
            mainCanvas.lineWidth = 3;
            mainCanvas.beginPath();
            mainCanvas.arc(x + j7 / 2, y + j7 / 2, j7 / 2 + 4, 0, Math.PI * 2);
            mainCanvas.stroke();
            mainCanvas.restore();
        }`
    )
}