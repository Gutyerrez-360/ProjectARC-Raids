//metodo para la asignacion de los vectores de los RAID'S
var RaidCalculator = (function () {
  var rc = function () {
    var t = this;
    t.uom = "TB";
    t.uomGB = "GB";
    t.raidTypes = [
      "RAID 0",
      "RAID 1",
      "RAID 3",
      "RAID 5",
      "RAID 01",
      "RAID 10",
    ];
    t.defaultRaidType = "RAID 0";
    t.defaultDrive = 8;
    t.maxDrive = 24;
    //estos valores son los tamaños de discos HDD que existen en el mercado
    t.drivesHDD = [1, 2, 3, 4, 6, 8, 10, 12, 14, 16];
    //estos valores son los tamaños de discos SSD que existen en el mercado
    //--------------------Han sido convertidos para manipularlos en formato de TeraBytes "TB"--------------------
    t.drivesSSD = [0.24, 0.48, 0.96, 1.92, 3.84];
    t.selectedDrives = [];
    t.container = document.querySelector(".calculator-container");
    t.raidTypesSelectors = t.container.querySelector(
      ".rcc-select-raid .selectors"
    );
    t.drivesDiv = t.container.querySelector(".rcc-select-drives");
    t.drivesHDDSelectors = t.drivesDiv.querySelector(
      ".rcc-select-drives #tabHDD .selectors"
    );
    t.drivesSSDSelectors = t.drivesDiv.querySelector(
      ".rcc-select-drives #tabSSD .selectors"
    );
    t.selectedDrivesBoxes = t.container.querySelectorAll(".nas-box");
    t.results = t.container.querySelector(".result-bar");
    t.refreshSelectedDrives();
  };

  rc.prototype.init = function () {
    var t = this;
    for (var i = 0; i < t.raidTypes.length; i++) {
      var rt = t.raidTypes[i];
      var span = document.createElement("span");
      span.classList.add("item");
      span.appendChild(document.createTextNode(rt));
      if (rt == t.defaultRaidType) {
        span.classList.add("active");
      }
      t.raidTypesSelectors.appendChild(span);
    }

    var raidTypesItems = t.raidTypesSelectors.getElementsByTagName("span");
    for (var i = 0; i < raidTypesItems.length; i++) {
      var raidTypesItem = raidTypesItems[i];
      raidTypesItem.addEventListener("click", function (e) {
        t.scroll();
        if (t.raidTypesSelectors.querySelector(".active")) {
          t.raidTypesSelectors
            .querySelector(".active")
            .classList.remove("active");
        }
        this.classList.add("active");
        t.refreshRequiredDrives();
        t.calculator();

        var raidType = this.innerHTML;
        t.displayInfo(raidType);
      });
    }
    if (t.drivesHDDSelectors) {
      for (var i = 0; i < t.drivesHDD.length; i++) {
        var d = t.drivesHDD[i];
        t.drivesHDDSelectors.appendChild(
          t.createItem(d, t.getDisplayCapacity(d))
        );
      }
    }
    if (t.drivesSSDSelectors) {
      for (var i = 0; i < t.drivesSSD.length; i++) {
        var d = t.drivesSSD[i];
        t.drivesSSDSelectors.appendChild(
          t.createItem(d, t.getDisplayCapacity(d))
        );
      }
    }
    var items = t.drivesDiv.querySelectorAll(".item");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.addEventListener("click", function (e) {
        t.scroll();
        var capacity = this.getAttribute("data-capacity");
        if (t.selectedDrives.length < t.maxDrive) {
          t.selectedDrives.push(Number(capacity));
          t.refreshSelectedDrives();
          t.calculator();
        }
      });
    }

    var selectorPop = t.container.querySelector("a.selector-pop");
    if (selectorPop) {
      selectorPop.addEventListener("click", function (e) {
        if (window.innerWidth < 980) {
          e.preventDefault();
        }
      });
    }

    t.displayInfo(t.defaultRaidType);

    window.addEventListener("scroll", function () {
      try {
        var st = window.pageYOffset;
        var hh = document.querySelector(".nm-container").offsetHeight;
        //var e1h = document.getElementById("content-row-id-1").offsetHeight;
        var e1h = document.querySelectorAll(".content-row")[0].offsetHeight;
        var e2h = document.querySelector(".row-ele").offsetHeight;
        var bh = e1h + e2h + 30;
        var wh = window.innerHeight;

        if (st > hh + bh - wh) {
          t.container.querySelector(".rcc-results").classList.remove("fixed");
        } else {
          t.container.querySelector(".rcc-results").classList.add("fixed");
        }
      } catch (e) {}
    });
  };

  rc.prototype.displayInfo = function (raidType) {
    var t = this;
    var infoItems = t.container
      .querySelector(".raidModal")
      .querySelectorAll(".item");
    var infoDiv = t.container.querySelectorAll(".raid-info");
    for (var i = 0; i < infoItems.length; i++) {
      for (var j = 0; j < infoDiv.length; j++) {
        var infoType = infoItems[i].getAttribute("data-type");
        if (infoType == raidType) {
          infoDiv[j].innerHTML = infoItems[i].outerHTML;
        }
      }
    }
  };

  rc.prototype.refreshRequiredDrives = function () {
    var t = this;
    var selectedDrive = t.defaultRaidType;
    if (t.raidTypesSelectors.querySelector("span.item.active")) {
      selectedDrive =
        t.raidTypesSelectors.querySelector("span.item.active").innerHTML;
    }
    var selectedMiniDrive = t.getMiniDrive(selectedDrive);

    for (var i = t.selectedDrives.length; i < selectedMiniDrive; i++) {
      for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
        var selectedDrivesBox = t.selectedDrivesBoxes[j];
        if (
          !selectedDrivesBox
            .querySelectorAll(".slot")
            [i].querySelector(".drive.empty")
        ) {
          selectedDrivesBox
            .querySelectorAll(".slot")
            [i].appendChild(t.createRequiredItem(null, "Required"));
        }
      }
    }
    for (var i = selectedMiniDrive; i < t.maxDrive; i++) {
      for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
        var selectedDrivesBox = t.selectedDrivesBoxes[j];
        if (
          selectedDrivesBox
            .querySelectorAll(".slot")
            [i].querySelector(".drive.empty")
        ) {
          var child = selectedDrivesBox
            .querySelectorAll(".slot")
            [i].querySelector(".drive.empty");
          selectedDrivesBox.querySelectorAll(".slot")[i].removeChild(child);
        }
      }
    }
  };

  rc.prototype.refreshSelectedDrives = function () {
    var t = this;
    for (var i = 0; i < t.selectedDrivesBoxes.length; i++) {
      var selectedDrivesBox = t.selectedDrivesBoxes[i];
      selectedDrivesBox.innerHTML = "";
    }
    for (var i = 0; i < t.selectedDrives.length; i++) {
      if (i < t.maxDrive) {
        var sd = t.selectedDrives[i];
        for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
          var selectedDrivesBox = t.selectedDrivesBoxes[j];
          selectedDrivesBox.appendChild(
            t.createBoxItem(sd, t.getDisplayCapacity(sd))
          );
        }
      }
    }
    var selectedDrive = t.getSelectDriveType();
    var selectedMiniDrive = t.getMiniDrive(selectedDrive);
    if (t.selectedDrives.length < selectedMiniDrive) {
      for (var i = 0; i < selectedMiniDrive - t.selectedDrives.length; i++) {
        for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
          var selectedDrivesBox = t.selectedDrivesBoxes[j];
          selectedDrivesBox.appendChild(t.createBoxItem(null, "Required"));
        }
      }
    }
    var emptyItem = t.maxDrive - t.selectedDrives.length;
    var emptyItemShow = t.selectedDrives.length - t.defaultDrive;
    if (selectedMiniDrive - t.selectedDrives.length > 0) {
      emptyItem = emptyItem - (selectedMiniDrive - t.selectedDrives.length);
    }
    if (emptyItem > 0) {
      for (var i = 0; i < emptyItem; i++) {
        for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
          var selectedDrivesBox = t.selectedDrivesBoxes[j];
          var slot = document.createElement("div");
          slot.classList.add("slot");
          if (emptyItemShow > 0) {
            //if(i + emptyItemShow > t.selectedDrives.length - 1 ){
            slot.classList.add("hide");
            //}
          } else {
            if (t.selectedDrives.length > selectedMiniDrive) {
              if (i + t.selectedDrives.length > t.defaultDrive - 1) {
                slot.classList.add("hide");
              }
            } else {
              if (i + selectedMiniDrive > t.defaultDrive - 1) {
                slot.classList.add("hide");
              }
            }
          }
          selectedDrivesBox.appendChild(slot);
        }
      }
    } else {
      //
    }
    for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
      var selectedDrivesBox = t.selectedDrivesBoxes[j];
      var utility = document.createElement("div");
      utility.classList.add("utility");
      var span = document.createElement("span");
      span.appendChild(
        document.createTextNode(
          t.container.querySelector(".text-select").innerHTML
        )
      );
      var p = document.createElement("p");
      p.classList.add("reset-btn");
      var i = document.createElement("i");
      i.classList.add("ss-icon");
      i.appendChild(document.createTextNode("↻"));
      var em = document.createElement("em");
      em.appendChild(
        document.createTextNode(
          t.container.querySelector(".text-reset").innerHTML
        )
      );
      p.appendChild(i);
      p.appendChild(em);
      utility.appendChild(span);
      utility.appendChild(p);
      selectedDrivesBox.appendChild(utility);
      p.addEventListener("click", function (e) {
        t.selectedDrives = [];
        t.refreshSelectedDrives();
        t.calculator();
      });
    }
    for (var j = 0; j < t.selectedDrivesBoxes.length; j++) {
      var selectedDrivesBox = t.selectedDrivesBoxes[j];
      if (t.selectedDrives.length > 0) {
        selectedDrivesBox.classList.remove("empty");
        selectedDrivesBox.classList.add("loaded");
      } else {
        selectedDrivesBox.classList.remove("loaded");
        selectedDrivesBox.classList.add("empty");
      }
    }

    t.container.querySelector(".rcc-results .warning .warning-num").innerHTML =
      t.getMiniDrive(selectedDrive);
    t.container.querySelector(".rcc-results .warning .warning-type").innerHTML =
      selectedDrive;
  };

  rc.prototype.getSelectDriveType = function () {
    var t = this;
    var selectedDrive = t.defaultRaidType;
    if (t.raidTypesSelectors.querySelector("span.item.active")) {
      selectedDrive =
        t.raidTypesSelectors.querySelector("span.item.active").innerHTML;
    }
    return selectedDrive;
  };

  rc.prototype.createItem = function (value, text) {
    var div = document.createElement("div");
    div.classList.add("item");
    div.setAttribute("data-capacity", value);
    var span = document.createElement("span");
    span.appendChild(document.createTextNode(text));
    var iconSpan = document.createElement("span");
    iconSpan.classList.add("ss-icon");
    iconSpan.appendChild(document.createTextNode("+"));
    div.appendChild(span);
    div.appendChild(iconSpan);
    return div;
  };

  rc.prototype.createRequiredItem = function (value, text) {
    var t = this;

    var div = document.createElement("div");
    div.classList.add("drive");
    if (text == "Required") {
      div.classList.add("empty");
    }

    var i = document.createElement("i");
    var span = document.createElement("span");
    span.appendChild(
      document.createTextNode(
        t.container.querySelector(".text-required").innerHTML
      )
    );
    var em = document.createElement("em");

    div.appendChild(i);
    div.appendChild(span);
    div.appendChild(em);

    return div;
  };

  rc.prototype.createBoxItem = function (value, text) {
    var t = this;
    var slot = document.createElement("div");
    slot.classList.add("slot");

    var div = document.createElement("div");
    div.classList.add("drive");
    if (text == "Required") {
      div.classList.add("empty");
    } else {
      div.classList.add("loaded");
      slot.addEventListener("click", function (e) {
        var index = Array.prototype.indexOf.call(
          this.parentNode.querySelectorAll(".slot"),
          this
        );
        t.selectedDrives.splice(index, 1);
        t.refreshSelectedDrives();
        t.calculator();
      });
    }

    var i = document.createElement("i");
    var span = document.createElement("span");
    if (text == "Required") {
      span.appendChild(
        document.createTextNode(
          t.container.querySelector(".text-required").innerHTML
        )
      );
    } else {
      span.appendChild(document.createTextNode(text));
    }
    var em = document.createElement("em");

    div.appendChild(i);
    div.appendChild(span);
    div.appendChild(em);
    slot.appendChild(div);

    return slot;
  };

  rc.prototype.scroll = function () {
    try {
      var st = window.pageYOffset;
      var hh = document.querySelector(".nm-container").offsetHeight;
      var ch = document.getElementById("content-row-id-1").offsetHeight;
      var bh = document.querySelector(".content-row").offsetHeight;
      var th = hh + bh;
      if (st < th) {
        var scrollInterval = setInterval(function () {
          if (window.pageYOffset < hh + ch) {
            window.scrollBy(0, 10);
          } else clearInterval(scrollInterval);
        }, 15);
        //window.scrollTo(0, th);
        //console.log(window.pageYOffset;)
      }
    } catch (e) {}
  };

  rc.prototype.getDisplayCapacity = function (capacity) {
    var t = this;
    if (capacity < 1) {
      capacity = capacity * 1000;
      capacity += t.uomGB;
    } else {
      capacity += t.uom;
    }
    return capacity;
  };

  rc.prototype.getActualCapacity = function (capacity) {
    var t = this;
    if (typeof capacity == "number") {
      var actualCapacity = (capacity * Math.pow(10, 12)) / Math.pow(1024, 4);
      return actualCapacity.toFixed(2);
    } else {
      return "";
    }
  };

  rc.prototype.getTotalCapacity = function () {
    var t = this;
    var totalCapacity = 0;
    for (var i = 0; i < t.selectedDrives.length; i++) {
      if (i < t.maxDrive) {
        totalCapacity += t.selectedDrives[i];
      }
    }
    return totalCapacity;
  };

  rc.prototype.getMinCapacity = function () {
    var t = this;
    return Math.min.apply(null, t.selectedDrives);
  };

  rc.prototype.calculator = function () {
    var t = this;
    var selectedRaidType = t.getSelectDriveType();
    if (
      t.selectedDrives.length >= t.getMiniDrive(selectedRaidType) &&
      t.selectedDrives.length <= t.maxDrive
    ) {
      var total = t.getTotalCapacity();
      var c = t.calculatorCapacity(selectedRaidType);
      var p = t.calculatorProtection(selectedRaidType);
      var u = total - c - p;
      var cp = (c / total) * 100;
      var pp = (p / total) * 100;
      var up = (u / total) * 100;
      //t.results.querySelector(".capacity").innerHTML = c + t.uom;
      //t.results.querySelector(".protection").innerHTML = p + t.uom;
      //t.results.querySelector(".unused").innerHTML = u + t.uom;
      t.results.querySelector(".capacity").style.width = cp + "%";
      t.results.querySelector(".protection").style.width = pp + "%";
      t.results.querySelector(".unused").style.width = up + "%";
      t.container
        .querySelector(".rcc-results .warning")
        .classList.add("hidden");
      t.container.querySelector(
        ".rcc-results .legends .capacity em"
      ).innerHTML = c.toFixed(2) + t.uom;
      t.container.querySelector(
        ".rcc-results .legends .protection em"
      ).innerHTML = p.toFixed(2) + t.uom;
      t.container.querySelector(".rcc-results .legends .unused em").innerHTML =
        u.toFixed(2) + t.uom;
      //t.results.classList.remove("warning");
      //t.results.classList.add("valid");
    } else if (t.selectedDrives.length < t.getMiniDrive(selectedRaidType)) {
      //t.results.querySelector(".capacity").innerHTML = "";
      //t.results.querySelector(".protection").innerHTML = "";
      //t.results.querySelector(".unused").innerHTML = "";
      t.results.querySelector(".capacity").style.width = "0%";
      t.results.querySelector(".protection").style.width = "0%";
      t.results.querySelector(".unused").style.width = "0%";
      t.container
        .querySelector(".rcc-results .warning")
        .classList.remove("hidden");
      t.container.querySelector(
        ".rcc-results .warning .warning-num"
      ).innerHTML = t.getMiniDrive(selectedRaidType);
      t.container.querySelector(
        ".rcc-results .warning .warning-type"
      ).innerHTML = selectedRaidType;
      t.container.querySelector(
        ".rcc-results .legends .capacity em"
      ).innerHTML = "";
      t.container.querySelector(
        ".rcc-results .legends .protection em"
      ).innerHTML = "";
      t.container.querySelector(".rcc-results .legends .unused em").innerHTML =
        "";
      //t.results.classList.remove("valid");
      //t.results.classList.add("warning");
    }
  };

  //validacion y selector de los requerimientos para los discos dentro del server
  rc.prototype.getMiniDrive = function (raidType) {
    var t = this;

    switch (raidType) {
      case "RAID 0":
        return 2;
      case "RAID 1":
        return 2;
      case "RAID 5":
        return 3;
      case "RAID 3":
        return 3;
      case "RAID 01":
        return 4;
      case "RAID 10":
        return 4;
      default:
        return 2;
    }
  };

  //asignacion de calculos a "Capacidad Disponible"
  rc.prototype.calculatorCapacity = function (raidType) {
    var t = this;
    var total = t.getTotalCapacity();
    var min = t.getMinCapacity();
    var size = t.selectedDrives.length;

    switch (raidType) {
      case "RAID 0":
        return total;
      case "RAID 1":
        if (size > 1) {
          return min;
        }
        return 0;
      case "RAID 5":
        if (size > 2) {
          return (size - 1) * min;
        }
        return 0;
      case "RAID 3":
        if (size > 2) {
          return (size - 1) * min;
        }
        return 0;
      case "RAID 01":
        if (size > 7) {
          return Math.floor(size / 4) * min;
        } else if (size > 5) {
          return Math.floor(size / 3) * min;
        } else if (size > 3) {
          return Math.floor(size / 2) * min;
        }
        return 0;
      case "RAID 10":
        if (size > 7) {
          return 4 * min;
        } else if (size > 5) {
          return 3 * min;
        } else if (size > 3) {
          return 2 * min;
        }
        return 0;
      default:
        return 0;
    }
  };
  //asignacion de calculos a "Respaldo Calculado"
  rc.prototype.calculatorProtection = function (raidType) {
    var t = this;
    var total = t.getTotalCapacity();
    var min = t.getMinCapacity();
    var size = t.selectedDrives.length;
    var c = t.calculatorCapacity(raidType);

    switch (raidType) {
      case "RAID 0 - Netgear":
        return 0;
      case "RAID 0 - Synology":
        return 0;
      case "RAID 1":
        return (size - 1) * min;
      case "RAID 5":
        return min;
      case "RAID 3":
        return min;
      case "RAID 01":
        if (c != 0) {
          if (size > 7) {
            return 3 * Math.floor(size / 4) * min;
          } else if (size > 5) {
            return 2 * Math.floor(size / 3) * min;
          } else if (size > 3) {
            return c;
          }
        }
        return 0;
      case "RAID 10":
        if (c != 0) {
          if (size > 7) {
            return c;
          } else if (size > 5) {
            return c;
          } else if (size > 3) {
            return (Math.floor(size / 2) - 1) * min * 2;
          }
        }
        return 0;
      default:
        return 0;
    }
  };

  return rc;
})();

//Instancia de la entidad RaidCalculator e invocar sus metodos determinados
var raidCalculator = new RaidCalculator();
raidCalculator.init();
