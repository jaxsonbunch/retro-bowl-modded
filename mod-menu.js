(function () {
  function boot() {
    if (typeof GameMaker_Init === "function") GameMaker_Init();
    else setTimeout(boot, 40);
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
  document.getElementById("a-salary-max").onclick = function () {
    document.getElementById("v-salary").value = "999999999";
    setField("salary_cap", "999999999");
    setField("boost_salary_cap", "999999999");
    notifyRefresh();
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

  document.getElementById("a-export").onclick = function () {
    var key = findSaveKey();
    var s = localStorage.getItem(key);
    if (!s) {
      alert("Nothing to export.");
      return;
    }
    var obj = { localStorage: {} };
    obj.localStorage[key] = s;
    OPT_KEYS.forEach(function (ok) {
      var ov = localStorage.getItem(ok);
      if (ov) obj.localStorage[ok] = ov;
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: "application/json" }));
    a.download = "retrobowl-save.json";
    a.click();
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
