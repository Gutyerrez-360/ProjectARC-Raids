var sitehost=window.location.hostname;var defaultdomianforCookie=".seagate.com";var lacie=false;var activeEcommLocale=null;if(sitehost.indexOf("lacie.com")!=-1){defaultdomianforCookie=".lacie.com";lacie=true;}function localeParamRedirect(){var param_index=document.URL.indexOf("stxLoc");if(param_index!=-1){currentLocale=document.URL.substring(param_index+7,param_index+12);}}var SUPPORTED_ECOMM_LOCALE=[""];var SUPPORTED_PS_LOCALE=["en-us","en-ca","de-de","en-gb","fr-fr","fr-ca"];if(lacie){var SUPPORTED_COUNTRY_For_getCountryForLocale=["us","gb","as","cn","jp","la","es","it","fr","de","ca","nl","ca","ch","ch","be","be"];}else{var SUPPORTED_COUNTRY_For_getCountryForLocale=["us","gb","as","cn","tw","jp","kr","la","es","it","fr","tr","pl","ru","de","br","in","sg","au","em","id","ar","ca","nl","be","be","ie","se","ca","ch","ch","at","pt"];}var SUPPORTED_COUNTRY=["us","gb","as","cn","tw","jp","kr","la","es","it","fr","tr","pl","ru","de","br","in","sg","au","em","id","ar","ca","nl","be","be","ie","se","ca","ch","ch","at","pt"];var COUNTRY_KEYS=["country.unitedStates","country.unitedKingdom","country.asean","country.china","country.taiwan","country.japan","country.republicofKorea","country.americaLatina","country.spain","country.italy","country.france","country.turkey","country.poland","country.russia","country.germany","country.brazil","country.india","country.singapore","country.australia","country.menaEnglish","country.indonesia","country.menaArabic","country.canada","country.netherlands","country.belgiumf","country.belgiumn","country.eurozone","country.sweden","country.canadaf","country.switzerlandg","country.switzerlandf","country.austria","country.portugal"];if(lacie){var SUPPORTED_LOCALE=["en-us","en-gb","en-as","zh-cn","ja-jp","es-la","es-es","it-it","fr-fr","de-de","en-ca","nl-nl","fr-ca","de-ch","fr-ch","nl-be","fr-be"];}else{var SUPPORTED_LOCALE=["en-us","en-gb","en-as","zh-cn","zh-tw","ja-jp","ko-kr","es-la","es-es","it-it","fr-fr","tr-tr","pl-pl","ru-ru","de-de","pt-br","en-in","en-sg","en-au","en-em","id-id","en-ca","nl-nl","fr-ca","nl-be","fr-be","pt-pt"];}var SUPPORTED_LOCALE_STR="/us/en,/gb/en,/as/en,/cn/zh,/tw/zh,/jp/ja,/kr/ko,/la/es,/es/es,/it/it,/fr/fr,/tr/tr,/pl/pl,/ru/ru,/de/de,/br/pt,/in/en,/sg/en,/au/en,/em/en,/id/id,/ca/en,/em/ar,/nl/nl,/be/fr,/be/nl,/ca/fr,/ch/de,/ch/fr,/pt/pt";var DOMAIN_LOCALE_ARR=["en-us","en-us","zh-cn","ja-jp","fr-fr"];var DOMAIN_ARR=["/www",".com",".cn",".co.jp",".fr"];var DOMAIN_LANG_ARR=["en","en","zh","ja","fr"];var DOMAIN_COUNTRY_ARR=["us","us","cn","jp","fr"];var DEFAULT_LOCALE="en-us";var DEFAULT_COUNTRY="us";var DEFAULT_LANGUAGE="English";var DEFAULT_DOMAIN=".com";var LOCALE_COOKIE_NAME_TEMP="userSelectedLocaleCookie";var LOCALE_COOKIE_NAME_PERMANENT="permanentLocaleCookie";var LOCALE_COOKIE_NAME_ECOMM_TEMP="ecommSessionCookie";var LOCALE_COOKIE_NAME_ECOMM_PERMANENT="ecommLocaleCookie";function getCookie(c_name){var i,x,y,ARRcookies=document.cookie.split(";");for(i=0;i<ARRcookies.length;i++){x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);x=x.replace(/^\s+|\s+$/g,"");if(x==c_name){return unescape(y);}}}function deleteCookie(name,path,domain){if(getCookie(name)){document.cookie=name+"="+((path)?"; path="+path:"")+((domain)?"; domain="+domain:"")+"; expires=Thu, 01-Jan-70 00:00:01 GMT";}}function setPermanentCookie(c_name,value,exdays){var exdate=new Date();exdate.setDate(exdate.getDate()+exdays);var c_value=escape(value)+((exdays==null)?"":"; expires="+exdate.toUTCString());document.cookie=c_name+"="+c_value+"; path=/ ; domain="+defaultdomianforCookie;}function setSessionCookie(c_name,value){document.cookie=c_name+"="+escape(value)+"; path=/ ;domain="+defaultdomianforCookie;}function removeCookie(c_name){document.cookie=c_name+"=;path=/;expires=Thu, 01-Jan-1970 00:00:01 GMT;domain="+defaultdomianforCookie;}function setLocaleOnLoadEdit(){domain=DEFAULT_DOMAIN;domainLang="en";domainCountry="us";localeUrl=DEFAULT_LOCALE;for(var i=0;i<DOMAIN_ARR.length;i++){localeUrl=getLocaleFromURL(DOMAIN_ARR[i]+"/",DOMAIN_LOCALE_ARR[i]);if(localeUrl!=0){domain=DOMAIN_ARR[i];domainLang=DOMAIN_LANG_ARR[i];domainCountry=DOMAIN_COUNTRY_ARR[i];break;}}currentLocale=localeUrl;currentCountry=getCountryForLocale(currentLocale);chkForwardLocale(localeUrl,domain,domainLang,domainCountry);}function updateLocale(this_locale){setNewLocale(this_locale);window.location.reload();}function setNewLocale(value,cookieFlag){var cookieExists=getCookie(LOCALE_COOKIE_NAME_ECOMM_PERMANENT)!=null||getCookie(LOCALE_COOKIE_NAME_ECOMM_TEMP)!=null;var ecommValue="";var revisedValue=value;if(!/^[a-zA-Z]{2,2}-[a-zA-Z]{2,2}$/.test(value)){value="en-us";}if(cookieFlag==undefined){var rememberMe=true;if(document.getElementById("nav-footer-remember")!=null){rememberMe=document.getElementById("nav-footer-remember").checked;}if(rememberMe){removeCookie(LOCALE_COOKIE_NAME_ECOMM_PERMANENT);setPermanentCookie(LOCALE_COOKIE_NAME_PERMANENT,value,60);setSessionCookie(LOCALE_COOKIE_NAME_TEMP,value);if(ecommValue!=""){setPermanentCookie(LOCALE_COOKIE_NAME_ECOMM_PERMANENT,ecommValue,60);setSessionCookie(LOCALE_COOKIE_NAME_ECOMM_TEMP,ecommValue);}else{removeCookie(LOCALE_COOKIE_NAME_ECOMM_TEMP);removeCookie(LOCALE_COOKIE_NAME_ECOMM_PERMANENT);}}else{removeCookie(LOCALE_COOKIE_NAME_ECOMM_TEMP);setSessionCookie(LOCALE_COOKIE_NAME_TEMP,value);if(ecommValue!=""){setSessionCookie(LOCALE_COOKIE_NAME_ECOMM_TEMP,ecommValue);}}}for(var i=0;i<DOMAIN_ARR.length;i++){localeUrl=getLocaleFromURL(DOMAIN_ARR[i]+"/",DOMAIN_LOCALE_ARR[i]);if(localeUrl!=0){domain=DOMAIN_ARR[i];domainLang=DOMAIN_LANG_ARR[i];domainCountry=DOMAIN_COUNTRY_ARR[i];break;}}chkForwardLocale(value,domain,domainLang,domainCountry);}function chkForwardLocale(value,domain,lang,country){if(/^(origin-www|www).*\.(seagate|lacie)\.com$/.test(document.location.host)){if(value=="ru-ru"){value="en-gb";}var newLangShort=value.substr(0,2);var newCountry=value.substr(3,2);var currentUrl=window.location;var currentUrlStr=currentUrl.toString();var currentUrlLength=currentUrlStr.length;var domainLength=domain.length;var domainToChk=DEFAULT_DOMAIN;for(var domainIndex=0;domainIndex<DOMAIN_ARR.length;domainIndex++){if(domainToChk==DOMAIN_ARR[domainIndex]){domainCountry=DOMAIN_COUNTRY_ARR[domainIndex];domainLang=DOMAIN_LANG_ARR[domainIndex];break;}}var domainString="";if(domainCountry!=newCountry||domainLang!=newLangShort){domainString="/"+newCountry+"/"+newLangShort+"/";}if(currentUrlLength==currentUrlStr.indexOf(domain)+domainLength&&(newLangShort!=lang||newCountry!=country)){window.location=currentUrlStr+domainString;}else{if(currentUrlStr.indexOf(domain+"/")>0){var comIndex=currentUrlStr.indexOf(domain+"/");if(domain=="/www"){domain="";}if((currentUrlLength<comIndex+10||(currentUrlLength>=comIndex+10&&SUPPORTED_LOCALE_STR.indexOf(currentUrlStr.substr(comIndex+domainLength,6).toLowerCase())<0))&&(newLangShort!=lang||newCountry!=country)){window.location=currentUrlStr.replace(currentUrlStr.substr(comIndex,5),domain+domainString);}else{if(currentUrlLength>=comIndex+10&&SUPPORTED_LOCALE_STR.indexOf(currentUrlStr.substr(comIndex+domainLength,6).toLowerCase())>=0&&currentUrlStr.substr(comIndex+domainLength,6).toLowerCase()!="/"+newCountry+"/"+newLangShort){domainString=domainString.substr(0,domainString.length-1);currentUrlStr=currentUrlStr.replace(currentUrlStr.substr(comIndex,10),domain+domainString);currentUrlStr=currentUrlStr.replace(/[?&]stxLoc=(\w{2,2}[-_]\w{2,2})?/,"");if(currentUrlStr.indexOf("?")==-1){currentUrlStr=currentUrlStr.replace("&","?");}window.location=currentUrlStr;}}}}}}function getCountryForLocale(locale){if(locale!=null){var passedLocale=locale.toLowerCase();for(var i=0;i<SUPPORTED_LOCALE.length;i++){var slocale=SUPPORTED_LOCALE[i].toLowerCase();if(slocale==passedLocale){return SUPPORTED_COUNTRY_For_getCountryForLocale[i];}}return DEFAULT_COUNTRY;}}function getLocaleForCountry(country){var passedCountry=country.toLowerCase();if("nz"==passedCountry.toLowerCase()){passedCountry="au";}else{if("th"==passedCountry.toLowerCase()){passedCountry="as";}}for(var i=0;i<SUPPORTED_COUNTRY.length;i++){var sCountry=SUPPORTED_COUNTRY[i].toLowerCase();if(sCountry==passedCountry){return SUPPORTED_LOCALE[i];}}return DEFAULT_LOCALE;}function setGlobeLocaleCountry(){var selectorCountry=null;var selectorLanguage=null;var ecommTempCookie=getCookie(LOCALE_COOKIE_NAME_ECOMM_TEMP);var ecommPermCookie=getCookie(LOCALE_COOKIE_NAME_ECOMM_PERMANENT);var localeTempCookie=getCookie(LOCALE_COOKIE_NAME_TEMP);var localePermCookie=getCookie(LOCALE_COOKIE_NAME_PERMANENT);if(ecommTempCookie!=null&&isSupportedEcommLocale(ecommTempCookie)){selectorLanguage=ecommTempCookie.substr(0,2);selectorCountry=ecommTempCookie.substr(3,5);}else{if(localeTempCookie!=null){selectorLanguage=localeTempCookie.substr(0,2);selectorCountry=localeTempCookie.substr(3,5);}else{if(ecommPermCookie!=null&&isSupportedEcommLocale(ecommPermCookie)){selectorLanguage=ecommPermCookie.substr(0,2);selectorCountry=ecommPermCookie.substr(3,5);}else{if(localePermCookie!=null){selectorLanguage=localePermCookie.substr(0,2);selectorCountry=localePermCookie.substr(3,5);}else{selectorCountry=currentCountry;}}}}var countryKey="country.unitedStates";var languageKey="country.unitedStates.lang";if(selectorCountry=="be"){if(selectorLanguage=="fr"){countryKey="country.belgiumf";languageKey="country.belgiumf.lang";}else{if(selectorLanguage=="nl"){countryKey="country.belgium";languageKey="country.belgium.lang";}else{countryKey="country.belgiumn";languageKey="country.belgiumn.lang";}}}else{if(selectorCountry=="em"){if(selectorLanguage=="en"){countryKey="country.menaEnglish";languageKey="country.menaEnglish.lang";}else{countryKey="country.menaArabic";languageKey="country.menaArabic.lang";}}else{if(selectorCountry=="ca"){if(selectorLanguage=="en"){countryKey="country.canada";languageKey="country.canada.lang";}else{countryKey="country.canadaf";languageKey="country.canadaf.lang";}}else{if(selectorCountry=="ch"){if(selectorLanguage=="fr"){countryKey="country.switzerlandf";languageKey="country.switzerlandf.lang";}else{countryKey="country.switzerlandg";languageKey="country.switzerlandg.lang";}}else{for(var i=0;i<SUPPORTED_COUNTRY.length;i++){var country=SUPPORTED_COUNTRY[i].toLowerCase();if(country==selectorCountry){countryKey=COUNTRY_KEYS[i];languageKey=countryKey+".lang";}}}}}}if(document.getElementById("currentCountryText")!=undefined){if(document.getElementById(countryKey)==null){document.getElementById("currentCountryText").innerHTML=document.getElementById("country.unitedStates").innerHTML+" "+document.getElementById("country.unitedStates.lang").innerHTML;}else{document.getElementById("currentCountryText").innerHTML=document.getElementById(countryKey).innerHTML+" "+document.getElementById(languageKey).innerHTML;}}else{if(document.getElementById("currentCountry")!=undefined){if(document.getElementById(countryKey)==null){document.getElementById("currentCountry").innerHTML=document.getElementById("country.unitedStates").innerHTML+" "+document.getElementById("country.unitedStates.lang").innerHTML;}else{document.getElementById("currentCountry").innerHTML=document.getElementById(countryKey).innerHTML+" "+document.getElementById(languageKey).innerHTML;}}}}function isSupportedEcommLocale(locale){return false;}function isSupportedCountry(country){var passedCountry=country.toLowerCase();if("nz"==passedCountry.toLowerCase()){passedCountry="au";}else{if("th"==passedCountry.toLowerCase()){passedCountry="as";}}for(var i=0;i<SUPPORTED_COUNTRY.length;i++){var sCountry=SUPPORTED_COUNTRY[i].toLowerCase();if(sCountry==passedCountry){return true;}}return false;}function getLocaleFromURL(domain,defaultLocale){var currentUrl=window.location;var currentUrlStr=currentUrl.toString();if(currentUrlStr.indexOf(domain)>0){var currentIndex=currentUrlStr.indexOf(domain);var subString=currentUrlStr.substring(currentIndex+domain.length,currentIndex+domain.length+5);if(subString!=""&&SUPPORTED_LOCALE_STR.indexOf(subString)>-1){var localeArr=subString.split("/");return localeArr[1]+"-"+localeArr[0];}else{return defaultLocale;}}else{return 0;}}function localeParamRedirect(){var param_index=document.URL.indexOf("stxLoc");if(param_index!=-1){requestedLocale=document.URL.substring(param_index+7,param_index+12);if(requestedLocale!=rcLocaleJS&&SUPPORTED_LOCALE.indexOf(requestedLocale)!=-1){setSessionCookie(LOCALE_COOKIE_NAME_TEMP,requestedLocale);localeRedirect(window.location.href,requestedLocale);}}}function localeRedirect(url,locale){var newURL=url;var localeInURL="";if(locale.indexOf("-")!=-1&&locale!="en-us"){localeInURL="/"+locale.split("-")[1]+"/"+locale.split("-")[0];}var replaced=false;var supportLocales=SUPPORTED_LOCALE_STR.split(",");for(var i=0;i<supportLocales.length;i++){var supportLocale=supportLocales[i];if(newURL.indexOf(".com"+supportLocale)!=-1){newURL=newURL.replace(".com"+supportLocale,".com"+localeInURL);replaced=true;break;}}if(!replaced){newURL=newURL.replace(".com",".com"+localeInURL);}if(newURL!=url){window.location=newURL;}}function setLocaleOnLoad(){var selectedLocaleCookie=getCookie(LOCALE_COOKIE_NAME_TEMP);if("th-th"==selectedLocaleCookie||"vi-vn"==selectedLocaleCookie){selectedLocaleCookie="en-as";setSessionCookie(LOCALE_COOKIE_NAME_TEMP,selectedLocaleCookie);}var permanentLocaleCookie=getCookie(LOCALE_COOKIE_NAME_PERMANENT);var cookieFlag=false;localeParamRedirect();if(selectedLocaleCookie!=null&&selectedLocaleCookie!="null"&&selectedLocaleCookie!=""){currentLocale=selectedLocaleCookie;currentCountry=getCountryForLocale(currentLocale);}else{if(permanentLocaleCookie!=null&&permanentLocaleCookie!=""&&/^[a-z]{2,2}-[a-z]{2,2}$/.test(permanentLocaleCookie)){currentLocale=permanentLocaleCookie;currentCountry=getCountryForLocale(currentLocale);}else{for(var i=0;i<DOMAIN_ARR.length;i++){localeUrl=getLocaleFromURL(DOMAIN_ARR[i]+"/",DOMAIN_LOCALE_ARR[i]);if(localeUrl!=0){break;}}currentLocale=localeUrl;currentCountry=getCountryForLocale(currentLocale);}}setNewLocale(currentLocale,cookieFlag);}function getKeyValueFromCookie(cookieName,key){if(cookieName==""){return"";}else{if(key==""){return"";}else{if(getCookie(cookieName)===null||getCookie("stxEdgescape")==undefined){return"";}var cookieValue=getCookie(cookieName);if(cookieValue!=""){var i,x,y,ARRcookies=cookieValue.split(",");for(i=0;i<ARRcookies.length;i++){x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);x=x.replace(/^\s+|\s+$/g,"");if(x==key){return unescape(y);}}}return"";}}}function setSegmentCookie(){var cookieVals=["external","external","internal","enterprise"];var segments=["consumer","services-software","internal-hard-drives","enterprise-storage"];var seagateReferrer=document.referrer.indexOf("www.seagate.com")!=-1;var segment=window.location.pathname;if(segment.match(/^\/..\/..\//)!=null){segment=segment.replace(/^\/..\/../,"");}segment=segment.slice("1");segment=segment.substr(0,segment.indexOf("/"));if(segment==""&&seagateReferrer){setPermanentCookie("prodSegment","none",60);}else{if(segment==""){segmentRedirect();}else{for(i=0;i<segments.length;i++){if(segments[i]==segment){setPermanentCookie("prodSegment",cookieVals[i],60);break;}}}}}function segmentRedirect(){var segmentCookie=getCookie("prodSegment");var segmentTarget={"external":"/consumer/","internal":"/internal-hard-drives/","enterprise":"/enterprise-storage/"};if(window.location.hostname.indexOf("www.seagate.com")!=-1&&segmentCookie!=null&&segmentCookie!="none"){window.location="//"+window.location.hostname+segmentTarget[segmentCookie];}}