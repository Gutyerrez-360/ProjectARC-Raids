try {
	console.log("nomudule");
	
	seagate.Modal();
    seagate.PrimaryNav();            
    seagate.SecondaryNav();
    seagate.NavigationMenu();
    seagate.MobileMenu();		
    seagate.Footer(); 
	if(document.querySelectorAll('.Chatbot')){
		seagate.Chatbot(); 
	}
	if(document.querySelectorAll('.NavigationProductTour')){
		seagate.NavigationProductTour();
	}
	if (document.querySelectorAll(".ContentLayoutProductTour")) {
		var pcarousels = document.querySelectorAll('.ContentLayoutProductTour');
		pcarousels.forEach(function (element) {
			seagate.ContentLayoutProductTour({
			  el: element
			});
		});
	}
	
	var formComplete = document.createEvent('Event');
	formComplete.initEvent('formComplete', true, true);
	document.addEventListener('formComplete', function (e) {
		seagate.Form();
	}, false);
    
} catch (e) {
    console.error(e);
}
