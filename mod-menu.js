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
  var modUiHidden = false;
  var MOD_SETTINGS_KEY = "jax_gameplay_mods";
  var gameplayMods = window.JaxMods = {
    fieldGoalAimbot: false,
    noTackles: false,
    noFumbles: false,
    noInjuries: false,
    infiniteQBThrowRange: false,
    freezeClock: false,
    unlimitedDowns: false
  };
  var frozenClock = null;
  var tickerMessageIndex = 0;

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
      if (typeof savedGameplayMods[name] === "boolean") gameplayMods[name] = savedGameplayMods[name];
    });
  } catch (err) {}

  function saveGameplayMods() {
    localStorage.setItem(MOD_SETTINGS_KEY, JSON.stringify(gameplayMods));
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
        if (gameplayMods.freezeClock) return;
        return originalSubtractTime.apply(this, arguments);
      };
      window._Ad1.__jaxHooked = true;
    }
    var originalTackle = window._f81;
    if (typeof originalTackle === "function" && !originalTackle.__jaxHooked) {
      window._f81 = function () {
        if (gameplayMods.noTackles) return;
        return originalTackle.apply(this, arguments);
      };
      window._f81.__jaxHooked = true;
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
        try {
          return originalAim.apply(this, arguments);
        } finally {
          window.min = nativeMin;
        }
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
      matches.forEach(function (match) {
        if (match._r11 === undefined || match._s11 === undefined || match._t11 === undefined) return;
        if (gameplayMods.freezeClock) {
          if (!frozenClock) frozenClock = { minutes: match._r11, seconds: match._s11 };
          match._r11 = frozenClock.minutes;
          match._s11 = frozenClock.seconds;
        } else {
          frozenClock = null;
        }
        if (gameplayMods.unlimitedDowns && match._t11 >= 4) match._t11 = 1;
      });
      window._si(64).forEach(function (controller) {
        if (controller._Gn !== undefined && typeof window._Yi === "function") {
          window._Yi(controller._Gn, "op_tips", 0);
        }
      });
    } catch (err) {}
  }

  installGameplayHooks();
  window.setInterval(applyMatchControls, 50);

  function activeController() {
    if (typeof window._si !== "function") return null;
    var controllers = window._si(64);
    return controllers && controllers.length ? controllers[0] : null;
  }

  function queueAction(message, run) {
    alert(message);
    run();
  }

  function clearGameDialogs(controller) {
    [46, 38, 47, 4].forEach(function (objectId) {
      if (typeof window._cr === "function") window._cr(controller, objectId);
    });
  }

  function maxTeamMorale() {
    if (typeof window._si !== "function" || typeof window._wi !== "function" || typeof window._zi !== "function" || typeof window._Yi !== "function") return;
    try {
      window._si(64).forEach(function (team) {
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

  function activeMatch() {
    if (typeof window._si !== "function") return null;
    var matches = window._si(71);
    var match = matches && matches.length ? matches[0] : null;
    if (!match || match._r11 === undefined || match._s11 === undefined || match._t11 === undefined) return null;
    return match;
  }

  function giveTouchdown() {
    var match = activeMatch();
    if (!match) {
      alert("You must be in a game.");
      return;
    }
    queueAction("Touchdown given. Choose 1 or 2 points after the touchdown.", function () {
      var controller = activeController();
      if (!controller || typeof window._hB !== "function") return;
      clearGameDialogs(controller);
      match._6F = 40;
      match._l61 = 10;
      match._UD = match._0z;
      setGamePaused(false);
      window._hB(controller, controller, 1);
      closeMenu();
    });
  }

  function winGame() {
    var match = activeMatch();
    if (!match) {
      alert("You must be in a game.");
      return;
    }
    queueAction("Win Game is running now. Close the menu when you are ready.", function () {
      var controller = activeController();
      if (!controller || typeof window._5g1 !== "function") return;
      if (match._Sb1 && match._0z !== undefined) {
        var playerSide = match._0z;
        var opponentSide = playerSide ? 0 : 1;
        match._Sb1[playerSide] = 67;
        match._Sb1[opponentSide] = 0;
      }
      window._5g1(controller, controller);
    });
  }

  function setGamePaused(paused) {
    if (typeof window._cg4 === "boolean") window._cg4 = paused;
  }

  function openMenu() {
    panel.classList.add("open");
    dimmer.classList.add("visible");
    openBtn.classList.add("hidden");
    setGamePaused(true);
  }

  function closeMenu() {
    panel.classList.remove("open");
    dimmer.classList.remove("visible");
    openBtn.classList.remove("hidden");
    setGamePaused(false);
  }

  function toggleMenuVisibility() {
    modUiHidden = !modUiHidden;
    panel.classList.toggle("mod-ui-hidden", modUiHidden);
    openBtn.classList.toggle("mod-ui-hidden", modUiHidden);
    dimmer.classList.toggle("mod-ui-hidden", modUiHidden);
    setGamePaused(!modUiHidden && panel.classList.contains("open"));
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

  function getSave() {
    return localStorage.getItem(findSaveKey()) || "";
  }

  function setSave(s) {
    localStorage.setItem(findSaveKey(), s);
  }

  function getField(name, fallback) {
    var match = getSave().match(new RegExp(name + '=["\\\']([^"\\\']*)["\\\']'));
    return match ? match[1] : fallback;
  }

  function rosterRecordCount(save) {
    var matches = save.match(/roster_[0-9]+="[^"\r\n]*"/g);
    return matches ? matches.length : 0;
  }

  function syncValues() {
    var save = getSave();
    document.getElementById("v-credits").value = getField("coach_credit", "0");
    document.getElementById("v-salary").value = getField("salary_cap", "150");
    document.getElementById("v-fans").value = getField("fans", "30");
    document.getElementById("v-roster").value = String(Math.min(
      parseInt(getField("roster", "0"), 10) || 0,
      rosterRecordCount(save)
    ));
    document.getElementById("v-draft").value = getField("draft_picks_0", "0");
    document.getElementById("v-fac").value = getField("facility_stadium", "1");
  }

  function replaceField(s, name, value) {
    var re = new RegExp(name + '="[^"]*"', "g");
    if (re.test(s)) return s.replace(re, name + '="' + value + '"');
    re = new RegExp(name + "='[^']*'", "g");
    if (re.test(s)) return s.replace(re, name + '="' + value + '"');
    if (s.indexOf("[savegame]") !== -1) {
      return s.replace("[savegame]", "[savegame]\r\n" + name + '="' + value + '"');
    }
    return s + "\r\n" + name + '="' + value + '"\r\n';
  }

  function setField(name, value) {
    var s = getSave();
    if (!s) {
      alert("No save yet. Start a career first.");
      return false;
    }
    setSave(replaceField(s, name, value));
    return true;
  }

  function notifyRefresh() {
    alert("Changes will show on refresh.");
  }

  function val(id) {
    return document.getElementById(id).value.replace(/[^0-9.\-eE+]/g, "");
  }

  function add(id, delta) {
    var el = document.getElementById(id);
    var n = parseFloat(el.value);
    if (isNaN(n)) n = 0;
    el.value = String(n + delta);
  }

  openBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    openMenu();
  };
  document.getElementById("jax-x").onclick = function () {
    closeMenu();
  };

  panel.addEventListener("keydown", function (e) { e.stopPropagation(); });
  panel.addEventListener("keyup", function (e) { e.stopPropagation(); });
  panel.addEventListener("keypress", function (e) { e.stopPropagation(); });
  panel.addEventListener("mousedown", function (e) { e.stopPropagation(); });
  panel.addEventListener("click", function (e) { e.stopPropagation(); });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-mod]"), function (input) {
    input.checked = gameplayMods[input.getAttribute("data-mod")];
    input.onchange = function () {
      gameplayMods[input.getAttribute("data-mod")] = input.checked;
      saveGameplayMods();
    };
  });
  document.getElementById("a-give-td").onclick = giveTouchdown;
  document.getElementById("a-win-game").onclick = winGame;
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

  document.getElementById("a-credits").onclick = function () {
    if (setField("coach_credit", val("v-credits"))) notifyRefresh();
  };
  document.getElementById("a-salary").onclick = function () {
    if (setField("salary_cap", val("v-salary"))) notifyRefresh();
  };
  document.getElementById("a-fans").onclick = function () {
    if (setField("fans", val("v-fans"))) notifyRefresh();
  };
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
    if (!s) {
      alert("No save yet.");
      return;
    }
    s = replaceField(s, "draft_picks_0", v);
    s = replaceField(s, "draft_picks_1", v);
    s = replaceField(s, "draft_picks_2", v);
    setSave(s);
    notifyRefresh();
  };

  function setFacilities(v) {
    var s = getSave();
    if (!s) {
      alert("No save yet.");
      return false;
    }
    [
      "facility_stadium",
      "facility_upgraded_stadium",
      "facility_training",
      "facility_upgraded_training",
      "facility_rehab",
      "facility_upgraded_rehab"
    ].forEach(function (k) {
      s = replaceField(s, k, v);
    });
    setSave(s);
    return true;
  }

  document.getElementById("a-fac").onclick = function () {
    if (setFacilities(val("v-fac"))) notifyRefresh();
  };
  document.getElementById("a-fac-max").onclick = function () {
    document.getElementById("v-fac").value = "10";
    if (setFacilities("10")) notifyRefresh();
  };
  document.getElementById("a-fac-reset").onclick = function () {
    document.getElementById("v-fac").value = "1";
    if (setFacilities("1")) notifyRefresh();
  };

  function exportFileName() {
    while (true) {
      var name = window.prompt("Enter a valid file name ending in .json:", "retrobowl-save.json");
      if (name === null) return null;
      name = name.trim();
      if (name && name !== "." && name !== ".." && /^[^<>:\"/\\|?*\x00-\x1F]+\.json$/.test(name)) return name;
      alert("File name must be valid and end in .json.");
    }
  }

  document.getElementById("a-export").onclick = function () {
    var key = findSaveKey();
    var s = localStorage.getItem(key);
    if (!s) {
      alert("Nothing to export.");
      return;
    }
    var fileName = exportFileName();
    if (!fileName) return;
    var obj = { localStorage: {} };
    obj.localStorage[key] = s;
    OPT_KEYS.forEach(function (ok) {
      var ov = localStorage.getItem(ok);
      if (ov) obj.localStorage[ok] = ov;
    });
    var a = document.createElement("a");
    var downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: "application/json" }));
    a.href = downloadUrl;
    a.download = fileName;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 0);
  };

  document.getElementById("a-import").onclick = function () {
    document.getElementById("f-import").click();
  };

  document.getElementById("f-import").onchange = function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var t = r.result;
        var ini = null;
        var target = findSaveKey();
        try {
          var o = JSON.parse(t);
          if (o.localStorage) {
            Object.keys(o.localStorage).forEach(function (k) {
              if (/savedata/i.test(k)) {
                ini = o.localStorage[k];
                target = k;
              } else {
                localStorage.setItem(k, o.localStorage[k]);
              }
            });
          }
        } catch (err) {}
        if (!ini && t.indexOf("coach_credit=") !== -1) ini = t;
        if (!ini) {
          alert("Could not read that file.");
          return;
        }
        localStorage.setItem(target, ini);
        notifyRefresh();
        showSiteAlert("Data imported successfully.");
      } catch (err) {
        alert("Import failed.");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  document.getElementById("a-reload").onclick = function () {
    location.reload();
  };

  window.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      toggleMenuVisibility();
    }
  });

  syncValues();

  var alertBox = document.getElementById("jax-alert");
  var alertMessage = document.getElementById("alert-message");
  var alertNo = document.getElementById("alert-no");
  var alertYes = document.getElementById("alert-yes");
  var alertClose = document.getElementById("alert-close");
  function showSiteAlert(message) {
    alertMessage.textContent = message;
    alertNo.style.display = "none";
    alertYes.style.display = "none";
    alertClose.style.display = "block";
    alertBox.classList.add("show");
  }
  function hideSiteAlert() {
    alertBox.classList.remove("show");
  }
  if (!localStorage.getItem("jax_starter_prompted")) {
    alertBox.classList.add("show");
  }
  alertNo.onclick = function () {
    localStorage.setItem("jax_starter_prompted", "1");
    hideSiteAlert();
  };
  alertYes.onclick = function () {
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
        hideSiteAlert();
      });
  };
  alertClose.onclick = hideSiteAlert;
})();