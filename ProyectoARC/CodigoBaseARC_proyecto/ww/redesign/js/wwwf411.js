if (typeof(www) != "undefined") {
	www.screenType = "desktop";
	
	www.checkScreenType = function () {
		if (window.innerWidth < 767) {
			www.screenType = "mobile";
		} else if (window.innerWidth >= 767 && window.innerWidth <= 1023) {
			www.screenType = "tablet";
		}
	};
	
	www.checkScreenType();
	
    www.throttle = function (type, name, obj) {
        obj = obj || window;
        var running = false;
        var func = function () {
            if (running) {
                return;
            }
            running = true;
            requestAnimationFrame(function () {
                obj.dispatchEvent(new CustomEvent(name));
                running = false;
            });
        };
        obj.addEventListener(type, func);
    };

    www.throttle("resize", "optimizedResize");
	
	if (typeof window.addEventListener == 'function') {
	    window.addEventListener("optimizedResize", function () {
	    	www.checkScreenType();
	    });
	} else if (typeof window.attachEvent == 'function') {
		node.attachEvent('onresize', function () {
	    	www.checkScreenType();
	    });
	}
	
	www.getCookie = function (c_name) {
	    var i, x, y, ARRcookies = document.cookie.split(";");
	    for (i = 0; i < ARRcookies.length; i++) {
	        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
	        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
	        x = x.replace(/^\s+|\s+$/g, "");
	        if (x == c_name) {
	            return unescape(y);
	        }
	    }
	};
	
	www.setPermanentCookie = function (c_name, value, exdays) {
	    var exdate = new Date();
	    exdate.setDate(exdate.getDate() + exdays);
	    var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
	    document.cookie = c_name + "=" + c_value + "; path=/ ; domain=" + www.defaultdomianforCookie;
	}
	
	www.setSessionCookie = function (c_name, value) {
	    document.cookie = c_name + "=" + escape(value) + "; path=/ ;domain=" + www.defaultdomianforCookie;
	}
	
	www.removeCookie = function (c_name) {
	    document.cookie = c_name + "=;path=/;expires=Thu, 01-Jan-1970 00:00:01 GMT;domain=" + www.defaultdomianforCookie;
	}
	
	www.deleteCookie = function (name, path, domain) {
	    if (www.getCookie(name)) {
	        document.cookie = name + "=" + ((path) ? "; path=" + path : "") + ((domain) ? "; domain=" + domain : "") + "; expires=Thu, 01-Jan-70 00:00:01 GMT";
	    }
	};
	    
	www.goToLocale = function (locale) {
	    var locales = locale.split("-");
		var localeURL = "";
		if (locale != "en-us") {
			localeURL = "/" + locales[1] + "/" + locales[0];
		}
		var param = document.location.search;
		if (param.length > 0) {
			param = param.replace(/[?&]stxLoc=[^&]*/, "");
			if (param.length > 0 && param[0] == "&") {
	            param = "?" + param.substring(1);
	        }
        }
		document.location = document.location.origin + localeURL + document.location.pathname.replace(/^\/\w{2,2}\/\w{2,2}/, "") + param + document.location.hash;
	};
	

	www.userDetail = www.getCookie("USERDETAIL");
	www.userRole = www.getCookie("USERROLE");


}


// Polyfill - closest
if (!Element.prototype.matches) {
    Element.prototype.matches =
        Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
        var el = this;

        do {
            if (Element.prototype.matches.call(el, s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

// Polyfill - append
(function (arr) {
    arr.forEach(function (item) {
        if (item.hasOwnProperty('append')) {
            return;
        }
        Object.defineProperty(item, 'append', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function append() {
                var argArr = Array.prototype.slice.call(arguments),
                    docFrag = document.createDocumentFragment();

                argArr.forEach(function (argItem) {
                    var isNode = argItem instanceof Node;
                    docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
                });

                this.appendChild(docFrag);
            }
        });
    });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);

// Polyfill - remove
(function (arr) {
    arr.forEach(function (item) {
        if (item.hasOwnProperty('remove')) {
            return;
        }
        Object.defineProperty(item, 'remove', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function remove() {
                this.parentNode.removeChild(this);
            }
        });
    });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
