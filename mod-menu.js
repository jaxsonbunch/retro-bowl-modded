(function () {
  function boot() {
    if (typeof GameMaker_Init !== "function") {
      setTimeout(boot, 40);
      return;
    }
    GameMaker_Init();
    installGameplayHooks();
  }
  window.addEventListener("load", function () {
    window.PokiSDK = null;
    window.PokiSDK_OK = false;
    boot();
  });

  var SAVE_KEYS = ["RetroBowl.0.savedata.ini", "RetroBowlModded.0.savedata.ini"];
  var OPT_KEYS = ["RetroBowl.0.optiondata.dat", "RetroBowlModded.0.optiondata.dat"];
  var panel = document.getElementById("jax-panel");
  var openBtn = document.getElementById("jax-open");
  var dimmer = document.getElementById("jax-dimmer");
  var exportBox = document.getElementById("jax-export");
  var exportName = document.getElementById("export-name");
  var MOD_SETTINGS_KEY = "jax_gameplay_mods";
  var gameplayMods = (window.JaxMods = {
    fieldGoalAimbot: false,
    noTackles: false,
    noFumbles: false,
    noInjuries: false,
    infiniteQBThrowRange: false,
    freezeClock: false,
    unlimitedDowns: false,
    infiniteStamina: false,
    noInterceptions: false,
    autoStiffArm: false,
    playerSpeedMult: 1
  });
  var frozenClock = null;
  var tickerMessageIndex = 0;
  var playerObjectIds = null;
  var stiffArmCooldown = 0;
  var uiState = 0;

  if (typeof window._Q_ === "function") {
    window._Q_ = function () {
      tickerMessageIndex = (tickerMessageIndex + 1) % 2;
      return tickerMessageIndex === 0
        ? "this mod so tuff boiiii"
        : "Mod made by Jaxson and available on GitHub :)";
    };
  }

  try {
    var savedGameplayMods = JSON.parse(localStorage.getItem(MOD_SETTINGS_KEY) || "{}");
    Object.keys(gameplayMods).forEach(function (name) {
      if (typeof savedGameplayMods[name] === "boolean" || typeof savedGameplayMods[name] === "number") {
        gameplayMods[name] = savedGameplayMods[name];
      }
    });
    if (typeof gameplayMods.playerSpeedMult === "number") {
      gameplayMods.playerSpeedMult = Math.max(1, Math.min(gameplayMods.playerSpeedMult, 3));
    } else {
      gameplayMods.playerSpeedMult = 1;
    }
  } catch (err) {
    gameplayMods.playerSpeedMult = 1;
  }

  function saveGameplayMods() {
    localStorage.setItem(MOD_SETTINGS_KEY, JSON.stringify(gameplayMods));
  }

  function isTypingBox(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toUpperCase();
    if (tag === "TEXTAREA") return true;
    if (tag !== "INPUT") return false;
    var type = (el.type || "text").toLowerCase();
    return type === "text" || type === "number" || type === "search" || type === "tel" || type === "url" || type === "password" || type === "";
  }

  function eachList(list, fn) {
    if (!list) return;
    if (typeof list.forEach === "function") {
      list.forEach(fn);
      return;
    }
    for (var key in list) {
      if (!Object.prototype.hasOwnProperty.call(list, key)) continue;
      fn(list[key], key);
    }
  }

  function findPlayerObjectIds() {
    if (playerObjectIds && playerObjectIds.length) return playerObjectIds;
    var ids = [];
    if (typeof window._si !== "function") return ids;
    for (var id = 0; id < 140; id++) {
      var list;
      try { list = window._si(id); } catch (err) { continue; }
      if (!list) continue;
      var hit = false;
      eachList(list, function (inst) {
        if (hit || !inst) return;
        if (inst._O01 !== undefined && (inst._j51 !== undefined || inst._W1 !== undefined)) hit = true;
      });
      if (hit) ids.push(id);
    }
    if (ids.length) playerObjectIds = ids;
    return ids;
  }

  function eachFieldPlayer(fn) {
    if (typeof window._si !== "function") return;
    findPlayerObjectIds().forEach(function (id) {
      var list;
      try { list = window._si(id); } catch (err) { return; }
      eachList(list, function (inst) {
        if (inst && inst._O01 !== undefined) fn(inst);
      });
    });
  }

  function getBallHolder() {
    try {
      if (window.global && window.global._d01 !== undefined) {
        var balls = window._si(window.global._d01);
        var holder = null;
        eachList(balls, function (b) {
          if (!holder && b && b._X_ !== undefined && b._X_ !== null && b._X_ !== -4) holder = b._X_;
        });
        return holder;
      }
    } catch (err) {}
    return null;
  }

  function getInstanceById(id) {
    if (id === null || id === undefined || id === -4) return null;
    var found = null;
    eachFieldPlayer(function (inst) {
      if (found) return;
      if (inst.id === id || inst === id) found = inst;
    });
    if (found) return found;
    if (typeof id === "object" && id && id._O01 !== undefined) return id;
    return null;
  }

  function dist2(a, b) {
    var dx = (a.x || 0) - (b.x || 0);
    var dy = (a.y || 0) - (b.y || 0);
    return dx * dx + dy * dy;
  }

  function applyAutoStiffArm() {
    if (!gameplayMods.autoStiffArm) return;
    if (stiffArmCooldown > 0) { stiffArmCooldown -= 1; return; }
    var holderId = getBallHolder();
    if (holderId === null) return;
    var carrier = getInstanceById(holderId);
    if (!carrier || carrier._lT === false || carrier._lT === 0) return;
    carrier._p51 = 2;
    if (carrier._u51 !== undefined) carrier._u51 = 2;
    var near = [];
    eachFieldPlayer(function (player) {
      if (!player || player === carrier) return;
      if (player._lT === true || player._lT === 1) return;
      if (player._v21 || player._k31) return;
      if (dist2(carrier, player) < 900) near.push(player);
    });
    if (!near.length) return;
    near.sort(function (a, b) { return dist2(carrier, a) - dist2(carrier, b); });
    var target = near[0];
    carrier._p51 = 2;
    carrier._l31 = target.id !== undefined ? target.id : target;
    try {
      if (typeof target.y === "number" && typeof carrier.y === "number") target._Ea = carrier.y < target.y ? 2.2 : -2.2;
      if (typeof target.x === "number" && typeof carrier.x === "number") {
        var push = carrier.x < target.x ? 3.5 : -3.5;
        target.x = target.x + push;
        if (target._Da !== undefined) target._Da = push * 0.6;
      }
    } catch (err) {}
    stiffArmCooldown = 8;
  }

  function forceClockFrozen(match) {
    if (!match) return;
    if (!frozenClock) {
      frozenClock = { minutes: match._r11, seconds: match._s11, quarter: match._Wy };
    }
    match._r11 = frozenClock.minutes;
    match._s11 = frozenClock.seconds;
    if (match._Yc1 !== undefined) match._Yc1 = 0;
    if (match._Tb1 !== undefined) match._Tb1 = frozenClock.minutes * 60 + frozenClock.seconds;
    if (match._Vb1 !== undefined) match._Vb1 = frozenClock.minutes * 60 + frozenClock.seconds;
  }

  function installGameplayHooks() {
    var originalDropBall = window._W31;
    if (typeof originalDropBall === "function" && !originalDropBall.__jaxHooked) {
      window._W31 = function () {
        if (gameplayMods.noFumbles) return;
        return originalDropBall.apply(this, arguments);
      };
      window._W31.__jaxHooked = true;
    }
    var originalInjuryCheck = window._mf1;
    if (typeof originalInjuryCheck === "function" && !originalInjuryCheck.__jaxHooked) {
      window._mf1 = function () {
        if (gameplayMods.noInjuries) return 0;
        return originalInjuryCheck.apply(this, arguments);
      };
      window._mf1.__jaxHooked = true;
    }
    var originalSubtractTime = window._Ad1;
    if (typeof originalSubtractTime === "function" && !originalSubtractTime.__jaxHooked) {
      window._Ad1 = function () {
        if (gameplayMods.freezeClock) { forceClockFrozen(arguments[0] || activeMatch()); return; }
        return originalSubtractTime.apply(this, arguments);
      };
      window._Ad1.__jaxHooked = true;
    }
    var originalTimeAccum = window._0c1;
    if (typeof originalTimeAccum === "function" && !originalTimeAccum.__jaxHooked) {
      window._0c1 = function () {
        if (gameplayMods.freezeClock) { forceClockFrozen(arguments[0] || activeMatch()); return; }
        return originalTimeAccum.apply(this, arguments);
      };
      window._0c1.__jaxHooked = true;
    }
    var originalApplyTime = window._Id1;
    if (typeof originalApplyTime === "function" && !originalApplyTime.__jaxHooked) {
      window._Id1 = function () {
        if (gameplayMods.freezeClock) { forceClockFrozen(activeMatch()); return; }
        return originalApplyTime.apply(this, arguments);
      };
      window._Id1.__jaxHooked = true;
    }
    var originalTackle = window._f81;
    if (typeof originalTackle === "function" && !originalTackle.__jaxHooked) {
      window._f81 = function () {
        if (gameplayMods.noTackles) return;
        if (gameplayMods.autoStiffArm && arguments[0]) {
          var self = arguments[0];
          if (self && (self._lT === true || self._lT === 1)) {
            self._p51 = 2;
            if (self._u51 !== undefined) self._u51 = 2;
          }
        }
        return originalTackle.apply(this, arguments);
      };
      window._f81.__jaxHooked = true;
    }
    var originalCatch = window._j31;
    if (typeof originalCatch === "function" && !originalCatch.__jaxHooked) {
      window._j31 = function (_bi, _ci) {
        if (gameplayMods.noInterceptions && _bi && !_bi._lT) return 0;
        return originalCatch.apply(this, arguments);
      };
      window._j31.__jaxHooked = true;
    }
    var originalAim = window._k01;
    if (typeof originalAim === "function" && !originalAim.__jaxHooked) {
      window._k01 = function () {
        if (!gameplayMods.infiniteQBThrowRange || typeof window.min !== "function") {
          return originalAim.apply(this, arguments);
        }
        var nativeMin = window.min;
        window.min = function (first, second) {
          if (second === 100 && first > 100) return first;
          return nativeMin.apply(this, arguments);
        };
        try { return originalAim.apply(this, arguments); }
        finally { window.min = nativeMin; }
      };
      window._k01.__jaxHooked = true;
    }
    var originalKick = window._y11;
    if (typeof originalKick === "function" && !originalKick.__jaxHooked) {
      window._y11 = function () {
        if (gameplayMods.fieldGoalAimbot && arguments[0]) {
          arguments[0]._D11 = 55;
          arguments[0]._101 = 300;
        }
        return originalKick.apply(this, arguments);
      };
      window._y11.__jaxHooked = true;
    }
  }

  function applyMatchControls() {
    if (typeof window._si !== "function") return;
    try {
      installGameplayHooks();
      var matches = window._si(71);
      eachList(matches, function (match) {
        if (!match || match._r11 === undefined || match._s11 === undefined || match._t11 === undefined) return;
        if (gameplayMods.freezeClock) forceClockFrozen(match);
        else frozenClock = null;
        if (gameplayMods.unlimitedDowns && match._t11 >= 4 && match._t11 < 6) match._t11 = 1;
      });
      if (gameplayMods.infiniteStamina) {
        eachFieldPlayer(function (player) {
          if (player._B51 !== undefined) player._B51 = 10;
          if (player._7j && typeof window._Yi === "function") {
            try { window._Yi(player._7j, "stamina", 10); } catch (err) {}
          }
        });
      }
      if (gameplayMods.autoStiffArm) {
        eachFieldPlayer(function (player) {
          if (player && (player._lT === true || player._lT === 1)) {
            if (player._p51 !== undefined && player._p51 < 2) player._p51 = 2;
            if (player._u51 !== undefined) player._u51 = 2;
          }
        });
        applyAutoStiffArm();
      }
      try {
        eachFieldPlayer(function (player) {
          if (!player || !player._7j) return;
          if (!(player._lT === true || player._lT === 1)) return;
          if (player._jaxBaseSpeed !== undefined && typeof window._Yi === "function") {
            try {
              window._Yi(player._7j, "speed", player._jaxBaseSpeed);
              if (player._jaxBaseMax !== undefined) window._Yi(player._7j, "max_speed", player._jaxBaseMax);
            } catch (e) {}
            delete player._jaxBaseSpeed;
            delete player._jaxBaseMax;
          }
        });
      } catch (e) {}
    } catch (err) {}
  }

  installGameplayHooks();
  window.setInterval(applyMatchControls, 33);

  function activeController() {
    if (typeof window._si !== "function") return null;
    var controllers = window._si(64);
    if (!controllers) return null;
    if (controllers.length) return controllers[0];
    for (var key in controllers) {
      if (Object.prototype.hasOwnProperty.call(controllers, key)) return controllers[key];
    }
    return null;
  }

  function activeMatch() {
    if (typeof window._si !== "function") return null;
    var matches = window._si(71);
    var match = null;
    if (matches && matches.length) match = matches[0];
    else eachList(matches, function (item) { if (!match) match = item; });
    if (!match || match._r11 === undefined || match._s11 === undefined || match._t11 === undefined) return null;
    return match;
  }

  function setGamePaused(paused) {
    if (typeof window._cg4 === "boolean") window._cg4 = paused;
  }

  function openMenu() {
    uiState = 2;
    panel.classList.add("open");
    dimmer.classList.add("visible");
    openBtn.classList.add("hidden");
    setGamePaused(true);
  }

  function closeMenu() {
    panel.classList.remove("open");
    dimmer.classList.remove("visible");
    openBtn.classList.add("hidden");
    uiState = 1;
    setGamePaused(false);
  }

  function cycleSlashUI() {
    if (uiState === 0) {
      openBtn.classList.add("hidden");
      panel.classList.remove("open");
      dimmer.classList.remove("visible");
      setGamePaused(false);
      uiState = 1;
    } else if (uiState === 1) {
      openBtn.classList.add("hidden");
      panel.classList.add("open");
      dimmer.classList.add("visible");
      setGamePaused(true);
      uiState = 2;
    } else {
      panel.classList.remove("open");
      dimmer.classList.remove("visible");
      openBtn.classList.remove("hidden");
      setGamePaused(false);
      uiState = 0;
    }
  }

  function findSaveKey() {
    var i, k, v, n;
    for (i = 0; i < SAVE_KEYS.length; i++) {
      v = localStorage.getItem(SAVE_KEYS[i]);
      if (v && v.length > 50) return SAVE_KEYS[i];
    }
    for (n = 0; n < localStorage.length; n++) {
      k = localStorage.key(n);
      if (k && /savedata/i.test(k)) {
        v = localStorage.getItem(k);
        if (v && v.indexOf("coach_credit") !== -1) return k;
      }
    }
    return SAVE_KEYS[0];
  }

  function getSave() { return localStorage.getItem(findSaveKey()) || ""; }
  function setSave(s) { localStorage.setItem(findSaveKey(), s); }

  function getField(name, fallback) {
    var match = getSave().match(new RegExp(name + '=["\\\']([^"\\\']*)["\\\']'));
    return match ? match[1] : fallback;
  }

  function rosterRecordCount(save) {
    var matches = save.match(/roster_[0-9]+="[^"\r\n]*"/g);
    return matches ? matches.length : 0;
  }

  function replaceField(s, name, value) {
    var re = new RegExp(name + '="[^"]*"', "g");
    if (re.test(s)) return s.replace(re, name + '="' + value + '"');
    re = new RegExp(name + "='[^']*'", "g");
    if (re.test(s)) return s.replace(re, name + '="' + value + '"');
    if (s.indexOf("[savegame]") !== -1) return s.replace("[savegame]", "[savegame]\r\n" + name + '="' + value + '"');
    return s + "\r\n" + name + '="' + value + '"\r\n';
  }

  function setField(name, value) {
    var s = getSave();
    if (!s) { alert("No save yet. Start a career first."); return false; }
    setSave(replaceField(s, name, value));
    return true;
  }

  function notifyRefresh() { alert("Changes will show on refresh."); }
  function val(id) { return document.getElementById(id).value.replace(/[^0-9.\-eE+]/g, ""); }
  function add(id, delta) {
    var el = document.getElementById(id);
    var n = parseFloat(el.value);
    if (isNaN(n)) n = 0;
    el.value = String(n + delta);
  }

  function syncValues() {
    var save = getSave();
    document.getElementById("v-credits").value = getField("coach_credit", "0");
    document.getElementById("v-salary").value = getField("salary_cap", "150");
    document.getElementById("v-fans").value = getField("fans", "30");
    document.getElementById("v-roster").value = String(Math.min(parseInt(getField("roster", "0"), 10) || 0, rosterRecordCount(save)));
    document.getElementById("v-draft").value = getField("draft_picks_0", "0");
    document.getElementById("v-fac").value = getField("facility_stadium", "1");
    var speedEl = document.getElementById("v-speed");
    if (speedEl) {
      speedEl.value = gameplayMods.playerSpeedMult;
      document.getElementById("v-speed-label").textContent = Number(gameplayMods.playerSpeedMult).toFixed(1) + "x";
    }
  }

  function clearGameDialogs(controller) {
    [46, 38, 47, 4].forEach(function (objectId) {
      if (typeof window._cr === "function") window._cr(controller, objectId);
    });
  }

  function maxTeamMorale() {
    if (typeof window._si !== "function" || typeof window._wi !== "function" || typeof window._zi !== "function" || typeof window._Yi !== "function") return;
    try {
      eachList(window._si(64), function (team) {
        if (!team) return;
        [team._Ln, team._Pz].forEach(function (roster) {
          if (roster === undefined || roster === null) return;
          for (var index = 0; index < window._wi(roster); index++) {
            var player = window._zi(roster, index);
            if (player !== undefined && player !== null) window._Yi(player, "attitude", 100);
          }
        });
      });
    } catch (err) {}
  }

  openBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    openMenu();
  };
  document.getElementById("jax-x").onclick = function () { closeMenu(); };

  panel.addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key !== "Tab") return;
    if (!isTypingBox(e.target)) {
      e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
  });
  panel.addEventListener("keyup", function (e) { e.stopPropagation(); });
  panel.addEventListener("keypress", function (e) { e.stopPropagation(); });
  panel.addEventListener("mousedown", function (e) { e.stopPropagation(); });
  panel.addEventListener("click", function (e) { e.stopPropagation(); });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-mod]"), function (input) {
    input.checked = !!gameplayMods[input.getAttribute("data-mod")];
    input.onchange = function () {
      var name = input.getAttribute("data-mod");
      gameplayMods[name] = input.checked;
      if (name === "freezeClock" && !input.checked) frozenClock = null;
      if (name === "freezeClock" && input.checked) {
        var m = activeMatch();
        if (m) frozenClock = { minutes: m._r11, seconds: m._s11, quarter: m._Wy };
      }
      saveGameplayMods();
    };
  });

  var speedSlider = document.getElementById("v-speed");
  if (speedSlider) {
    speedSlider.max = 3;
    speedSlider.value = gameplayMods.playerSpeedMult;
    document.getElementById("v-speed-label").textContent = Number(gameplayMods.playerSpeedMult).toFixed(1) + "x";
    speedSlider.oninput = function () {
      var v = parseFloat(this.value);
      if (isNaN(v)) v = 1;
      v = Math.max(1, Math.min(v, 3));
      gameplayMods.playerSpeedMult = v;
      document.getElementById("v-speed-label").textContent = v.toFixed(1) + "x";
      saveGameplayMods();
    };
  }

  document.getElementById("a-give-td").onclick = function () {
    var match = activeMatch();
    if (!match) { alert("You must be in a game."); return; }
    alert("Give td is running now. Close the menu when you are ready.");
    var controller = activeController();
    if (!controller || typeof window._hB !== "function") return;
    clearGameDialogs(controller);
    match._6F = 40;
    match._l61 = 10;
    match._UD = match._0z;
    if (match._t11 >= 6) match._t11 = 1;
    setGamePaused(false);
    window._hB(controller, controller, 1);
  };

  document.getElementById("a-win-game").onclick = function () {
    var match = activeMatch();
    if (!match) { alert("You must be in a game."); return; }
    alert("Win Game is running now. Close the menu when you are ready.");
    var controller = activeController();
    if (!controller || typeof window._5g1 !== "function") return;
    if (match._Sb1 && match._0z !== undefined) {
      var playerSide = match._0z;
      var opponentSide = playerSide ? 0 : 1;
      match._Sb1[playerSide] = 67;
      match._Sb1[opponentSide] = 0;
    }
    window._5g1(controller, controller);
  };

  document.getElementById("a-morale-max").onclick = function () {
    maxTeamMorale();
    alert("Team morale is now maxed.");
  };

  document.getElementById("c-plus").onclick = function () { add("v-credits", 1000); };
  document.getElementById("c-minus").onclick = function () { add("v-credits", -1000); };
  document.getElementById("c-100").onclick = function () { add("v-credits", 100); };
  document.getElementById("c-500").onclick = function () { add("v-credits", 500); };
  document.getElementById("c-1000").onclick = function () { add("v-credits", 1000); };
  document.getElementById("s-plus").onclick = function () { add("v-salary", 100000); };
  document.getElementById("s-minus").onclick = function () { add("v-salary", -100000); };
  document.getElementById("f-plus").onclick = function () { add("v-fans", 5); };
  document.getElementById("f-minus").onclick = function () { add("v-fans", -5); };
  document.getElementById("r-plus").onclick = function () { add("v-roster", 1); };
  document.getElementById("r-minus").onclick = function () { add("v-roster", -1); };
  document.getElementById("d-plus").onclick = function () { add("v-draft", 1); };
  document.getElementById("d-minus").onclick = function () { add("v-draft", -1); };
  document.getElementById("fac-plus").onclick = function () { add("v-fac", 1); };
  document.getElementById("fac-minus").onclick = function () { add("v-fac", -1); };

  document.getElementById("a-credits").onclick = function () { if (setField("coach_credit", val("v-credits"))) notifyRefresh(); };
  document.getElementById("a-salary").onclick = function () { if (setField("salary_cap", val("v-salary"))) notifyRefresh(); };
  document.getElementById("a-fans").onclick = function () { if (setField("fans", val("v-fans"))) notifyRefresh(); };
  document.getElementById("a-roster").onclick = function () {
    var save = getSave();
    var requested = parseInt(val("v-roster"), 10);
    var available = rosterRecordCount(save);
    if (isNaN(requested)) requested = 0;
    requested = Math.max(0, Math.min(requested, available));
    document.getElementById("v-roster").value = String(requested);
    if (setField("roster", String(requested))) notifyRefresh();
  };
  document.getElementById("a-draft").onclick = function () {
    var v = val("v-draft");
    var s = getSave();
    if (!s) { alert("No save yet."); return; }
    s = replaceField(s, "draft_picks_0", v);
    s = replaceField(s, "draft_picks_1", v);
    s = replaceField(s, "draft_picks_2", v);
    setSave(s);
    notifyRefresh();
  };

  function setFacilities(v) {
    var s = getSave();
    if (!s) { alert("No save yet."); return false; }
    ["facility_stadium", "facility_upgraded_stadium", "facility_training", "facility_upgraded_training", "facility_rehab", "facility_upgraded_rehab"].forEach(function (k) {
      s = replaceField(s, k, v);
    });
    setSave(s);
    return true;
  }
  document.getElementById("a-fac").onclick = function () { if (setFacilities(val("v-fac"))) notifyRefresh(); };
  document.getElementById("a-fac-max").onclick = function () {
    document.getElementById("v-fac").value = "10";
    if (setFacilities("10")) notifyRefresh();
  };
  document.getElementById("a-fac-reset").onclick = function () {
    document.getElementById("v-fac").value = "1";
    if (setFacilities("1")) notifyRefresh();
  };

  function collectExportData() {
    saveGameplayMods();
    var data = { localStorage: {} };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      data.localStorage[k] = localStorage.getItem(k);
    }
    return data;
  }

  function applyImportData(obj) {
    if (!obj || !obj.localStorage) return false;
    Object.keys(obj.localStorage).forEach(function (k) {
      localStorage.setItem(k, obj.localStorage[k]);
    });
    return true;
  }

  function exportFileName(raw) {
    var name = String(raw || "").trim();
    name = name.replace(/\\/g, "/").split("/").pop();
    name = name.replace(/[<>:"|?*\u0000-\u001f]/g, "");
    name = name.replace(/(\.[A-Za-z0-9]+)+$/, "");
    name = name.replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim();
    if (!name) name = "retrobowl-save";
    return name + ".json";
  }

  function downloadExport(filename) {
    var data = collectExportData();
    if (!data.localStorage || !Object.keys(data.localStorage).length) {
      alert("Nothing to export.");
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  document.getElementById("a-export").onclick = function () {
    exportName.value = "retrobowl-save";
    exportBox.classList.add("show");
  };
  document.getElementById("export-cancel").onclick = function () { exportBox.classList.remove("show"); };
  document.getElementById("export-ok").onclick = function () {
    var filename = exportFileName(exportName.value);
    exportBox.classList.remove("show");
    downloadExport(filename);
  };
  document.getElementById("a-import").onclick = function () { document.getElementById("f-import").click(); };
  document.getElementById("f-import").onchange = function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var t = r.result;
        var loaded = false;
        try {
          var o = JSON.parse(t);
          if (o && o.localStorage) loaded = applyImportData(o);
        } catch (err) {}
        if (!loaded && t.indexOf("coach_credit=") !== -1) {
          localStorage.setItem(findSaveKey(), t);
          loaded = true;
        }
        if (!loaded) { alert("Could not read that file."); return; }
        location.reload();
      } catch (err) { alert("Import failed."); }
    };
    r.readAsText(f);
    e.target.value = "";
  };
  document.getElementById("a-reload").onclick = function () { location.reload(); };

  window.addEventListener("keydown", function (e) {
    if (e.key === "Tab" && panel.classList.contains("open") && !isTypingBox(e.target)) e.preventDefault();
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      cycleSlashUI();
    }
  });

  syncValues();

  var alertBox = document.getElementById("jax-alert");
  if (!localStorage.getItem("jax_starter_prompted")) {
    alertBox.classList.add("show");
  }
  document.getElementById("alert-no").onclick = function () {
    localStorage.setItem("jax_starter_prompted", "1");
    alertBox.classList.remove("show");
  };
  document.getElementById("alert-yes").onclick = function () {
    localStorage.setItem("jax_starter_prompted", "1");
    fetch("saves/starter.json")
      .then(function (r) { return r.json(); })
      .then(function (o) {
        if (o.localStorage) {
          Object.keys(o.localStorage).forEach(function (k) {
            localStorage.setItem(k, o.localStorage[k]);
          });
        }
        location.reload();
      })
      .catch(function () {
        alert("Could not load starter save.");
        alertBox.classList.remove("show");
      });
  };
})();