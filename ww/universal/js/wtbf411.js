var WTB = (function ($) {
	var WTB = function(){
		this.wwwHost = document.location.host;
		this.wwwDomain = "www.seagate.com";
		if(this.wwwHost.indexOf("wwwedit")!=-1){
			this.wwwDomain = "wwwedit.seagate.com";
		}else if(this.wwwHost.indexOf("wwwstgedit")!=-1){
			this.wwwDomain = "wwwstgedit.seagate.com";
		}else if(this.wwwHost.indexOf("wwwstg")!=-1){
			this.wwwDomain = "wwwstg.seagate.com";
		}
		
		this.wtbQueryBase = 'https://'+this.wwwDomain+'/ww/solrQueryResponseRetrieval?q=*&omitHeader=true&collection=wtb&wt=json&indent=true&start=0&rows=1000&fl=store_seagate_url,store_lacie_url,is_system,is_wtblogo_available,is_pdplogo_available,phone,name,logo_url_pdp,logo_url,website,lacie_website,is_external,is_internal,external_drives,internal_drives,lacie_external_drives&sort=wtbnewsortingweigth+asc';
		this.wtbQuerySeagateRetail = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_wtb:true&fq=is_seagate:true&fq=!website:%22%22';
		this.wtbQuerySeagateDistributor = '&fq=partner_type:Distributor&fq=is_active:true&fq=is_seagate:true&fq=!website:%22%22';
		this.wtbQueryLaCieRetail = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_wtb_lacie:true&fq=is_lacie:true&fq=!lacie_website:%22%22&facet=true&facet.field=lacie_external_drives';
		this.wtbQueryLaCieDistributor = '&fq=partner_type:Distributor&fq=is_active:true&fq=is_lacie:true&fq=is_laciesubdisti:false&fq=!lacie_website:%22%22&facet=true&facet.field=lacie_external_drives';
		this.wtbQuerySeagatePdp = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_pdp:true&fq=is_seagate:true&fq=!website:%22%22&fq=!account:%22%22';
		this.wtbQueryLaCiePdp = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_pdp_lacie:true&fq=is_lacie:true&fq=!lacie_website:%22%22&fq=!account:%22%22';
		this.wtbCountryCode = 'US';
		this.wtbDriveType = "";
		this.wtbExternalDrives = [];
		this.wtbInternalDrives = [];
		this.isExternal = false;
		this.isInternal = false;
		this.recordType = 'Retailer';
		this.$wtbContainer = $('.wtb-container');
		this.$countrySelector = $('.wtb-container .tab-pane.active select.country-selector');
		this.$driveTypeSelector = $(".wtb-container .tab-pane.active select.selectDriveType");
		this.$wtbcontent = $('.wtb-container .tab-pane.active div.wtb-displays');
		this.$wtbnocontent = $('.wtb-container .tab-pane.active div.wtb-no-data');
		this.$wtbPdpContent = $('div.wtb-displays');
		this.$wtbTabsLinks = $('ul.nav.nav-tabs.wtb-tabs a');
		this.$wtbTabs = $('div.wtb-container ul.nav.nav-tabs.wtb-tabs');
		this.site = this.wwwHost.indexOf('lacie.com') != -1 ? 'lacie' : 'seagate';
		this.loadFromRequest = false;
	}   
    
	WTB.prototype.restoreConsole = function() {
		var t = this;
    	var iframe = document.createElement('iframe');
    	iframe.style.display = 'none';
    	document.body.appendChild(iframe);
    	console = iframe.contentWindow.console;
    	window.console = console;
   	}
    
	WTB.prototype.countryChg = function() {	
		var t = this;
		var wtbQuery = t.getBaseQuery();
		t.wtbCountryCode = t.$countrySelector.val();
		t.hideChinaDistributor();
		var wtbFilter = '&fq=country:'+t.wtbCountryCode;		
		$.ajax({
			method: 'GET',
			url: wtbQuery + wtbFilter,
			dataType: 'json',
			cache: false
		}).done(function( msg ) {
			var docs = msg.response.docs;
			if(t.site=='lacie'){
				$.each(docs,function(i,item){				
					var facets = msg.facet_counts.facet_fields.lacie_external_drives;
					t.$driveTypeSelector.find('option').not(':first').remove();
					$.each(facets,function(i,j){ 
						if((typeof j) ==='string' && $.trim(j)!=='' && facets[i+1]!==0){
							var lb = labels['wtb_'+j.toLowerCase().replace(/[\(\) -]/g,'')]===undefined ? $.trim(j): labels['wtb_'+j.toLowerCase().replace(/[\(\) -]/g,'')];
							t.$driveTypeSelector.append('<option value="'+j+'">'+lb+'</option>');
						}	  
					});			
		    	});				
			}		
			t.showContent(docs);
		});
	}
	
	WTB.prototype.driveTypeChg = function() {
		var t = this;
		var wtbQuery = t.getBaseQuery();		
		t.wtbDriveType = t.$driveTypeSelector.val();		
		var wtbFilter = '&fq=country:'+t.wtbCountryCode;		
		if(t.site=='lacie' && t.wtbDriveType!=''){
			wtbFilter += '&fq=lacie_external_drives:'+'"'+t.wtbDriveType+'"';
		}else{
			if($.trim(t.wtbDriveType)=='external-drives'){
				wtbFilter += '&fq=is_external:true';
			}
			if($.trim(t.wtbDriveType)=='internal-drives'){
				wtbFilter += '&fq=is_internal:true';
			}
			if($.trim(t.wtbDriveType)=='system'){
				wtbFilter += '&fq=is_system:true';
			}
		}	
		$.ajax({
			method: 'GET',
			url: wtbQuery + wtbFilter,
			dataType: 'json',
			cache:false
		}).done(function( msg ) {
			var docs = msg.response.docs;	     
			$.each(docs,function(i,item){
				if(item.is_external){
					t.isExternal = true;
					if((typeof item.external_drives) !='undefined' ){
						$.each(item.external_drives,function(j,it){
							if($.trim(it)!=''){	   
								var lb = labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')]===undefined ? $.trim(it) : labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')];
								if($.inArray('<option value="'+it+'">'+lb+'</option>', t.wtbExternalDrives )==-1){
									t.wtbExternalDrives.push('<option value="'+it+'">'+lb+'</option>'); 
								}
							}
						});
					}
					
				}
				if(item.is_internal){
					t.isInternal = true;
					if((typeof item.internal_drives) !='undefined' ){
						$.each(item.internal_drives,function(j,it){
							if($.trim(it)!=''){	
								var lb = labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')]===undefined ? $.trim(it) : labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')];
								if($.inArray('<option value="'+it+'">'+lb+'</option>', t.wtbInternalDrives )==-1){								
									t.wtbInternalDrives.push('<option value="'+it+'">'+lb+'</option>'); 
								}	  
							}
						});
					}
					
				}				
			});
					
			if($.trim(t.wtbDriveType)=='external-drives' && t.isExternal && t.wtbExternalDrives.length>0){
				t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#" + t.wtbDriveType).show().find("select").append(t.wtbExternalDrives.join(''));
			}
			if($.trim(t.wtbDriveType)=='internal-drives' && t.isInternal && t.wtbInternalDrives.length>0){	
				t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#" + t.wtbDriveType).show().find("select").append(t.wtbInternalDrives.join(''));
			}
			t.showContent(docs);	
			
		});
	}
	
	WTB.prototype.getBaseQuery = function(){
		var t = this;
		var wtbQuery = '';
		if(t.site=='lacie'){
	    	if(t.recordType=='Retailer'){
	    		wtbQuery = t.wtbQueryBase + t.wtbQueryLaCieRetail;
	    	}else if(t.recordType=='Distributor'){
	    		wtbQuery = t.wtbQueryBase + t.wtbQueryLaCieDistributor;
	    	}	    	
	    }else{
	    	if(t.recordType=='Retailer'){
	    		wtbQuery = t.wtbQueryBase + t.wtbQuerySeagateRetail;	
	    	}else if(t.recordType=='Distributor'){
	    		wtbQuery = t.wtbQueryBase + t.wtbQuerySeagateDistributor;	
	    	}
	    }
		return wtbQuery;
	}
	
	WTB.prototype.driveChg = function(that){
		var t = this;
		var wtbQuery = t.getBaseQuery();	
		var $countrySelector =$('.tab-pane.active select.country-selector');
		var wtbFilter = '&fq=wtb_type:'+t.recordType+'&fq=country:'+$countrySelector.val();
		if($.trim(t.$driveTypeSelector.val())=='external-drives'){
			wtbFilter += '&fq=is_external:true';			  
		}
		if($.trim(t.$driveTypeSelector.val())=='internal-drives'){
			wtbFilter += '&fq=is_internal:true';  
		}
		if($.trim(t.$driveTypeSelector.val())=='system'){
			wtbFilter += '&fq=is_system:true';  
		}
		var category = that.data('category');
		if(!that.val()==''){
			wtbFilter += '&fq=' +category+':'+ '"'+that.val()+'"';
		}
		$.ajax({
			method: 'GET',
		    url: wtbQuery + wtbFilter,
		    dataType: 'json',
		    cache:false
		}).done(function( msg ) {
			var docs = msg.response.docs;
			t.showContent(docs);		      
		});
	}
	
	WTB.prototype.showContent = function(docs){
		var t = this;
		var hasContent = false;
		t.$wtbcontent.empty();
		t.$wtbnocontent =$('.wtb-container .tab-pane.active div.wtb-no-data');
		t.$wtbnocontent.hide();
		$.each(docs,function(i,item){
			var website = item.website.indexOf('http')===0?item.website:'http://'+item.website;
			var lacie_website = item.lacie_website.indexOf('http')===0?item.lacie_website:'http://'+item.lacie_website;
			
			var company_name  = item.is_wtblogo_available?'':'<span class="wtb-name">'+item.name+'</span>';
			if(t.recordType==='Retailer'){
				if(t.site==='lacie'){
					if(item.logo_url!=""){
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+lacie_website+'" target="_blank"><img alt= "'+item.name+'" src="'+item.logo_url+'"/>'+company_name+'</a></div>');
					}else{
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+lacie_website+'" target="_blank">'+company_name+'</a></div>');
					}				
					hasContent = true;
				}else if(t.site==='seagate'){
					if(item.logo_url!=""){
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+website+'" target="_blank"><img alt= "'+item.name+'" src="'+item.logo_url+'" />'+company_name+'</a></div>');	
					}else{
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+website+'" target="_blank">'+company_name+'</a></div>');	
					}								
					hasContent = true;
				}				
			}else if(t.recordType==='Distributor'){
				if(t.site==='lacie'){
					if(item.logo_url!=""){
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+lacie_website+'" target="_blank"><img alt="'+item.name+'" src="'+item.logo_url+'"/></a><span class="wtb-name">'+item.name+'</span><span class="wtb-des">'+item.phone+'</span></div>');
					}else{
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+lacie_website+'" target="_blank"><span class="wtb-name">'+item.name+'</span></a><span class="wtb-des">'+item.phone+'</span></div>');
					}										
					hasContent = true;
				}else if(t.site==='seagate'){
					if(item.logo_url!=""){
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+website+'" target="_blank"><img alt="'+item.name+'" src="'+item.logo_url+'"/></a><span class="wtb-name">'+item.name+'</span><span class="wtb-des">'+item.phone+'</span></div>');	
					}else{
						t.$wtbcontent.append('<div class="span3"><a class="wtb-box" href="'+website+'" target="_blank"><span class="wtb-name">'+item.name+'</span></a><span class="wtb-des">'+item.phone+'</span></div>');	
					}					
					hasContent = true;
				}
			}
		});
		if(!hasContent){
			t.$wtbnocontent.show();
		}
		setTimeout(function(){ 
			t.setSameHeightForTabWtbLogoBox();
	    }, 1000);		
	}	
	
	WTB.prototype.resetDriveType = function(){
		var t = this;
		t.$driveTypeSelector.val("");
		if(t.site=='lacie'){
			t.$driveTypeSelector.find('option').not(':first').remove();
		}
	}
	
	WTB.prototype.resetDriveCategory = function(){
		var t = this;
		var $container = t.$driveTypeSelector.parents(".wtb-selectors");
		var $categorySelectors = $container.find(".hide-select").find(".form-group");
		$.each($categorySelectors,function(i){
			console.log($(this).attr('id')+' '+$(this).find("option").val());
			$(this).hide().find("option").not(':first').remove();
		});
		t.wtbExternalDrives=[];
		t.wtbInternalDrives=[];
	}
	
	WTB.prototype.initCountryCode = function(){
		var t = this;
		var countryCode =rcLocaleJS.split('-')[1].toUpperCase();
		console.log('rcLocaleJS '+rcLocaleJS+ ' countryCode '+countryCode+ ' t.site '+t.site);
		
		if(t.site=='seagate'){
			if('en-as'==rcLocaleJS){
				countryCode = 'PH';
			}else if('en-em'==rcLocaleJS){
				countryCode = 'ZA';
			}else if('es-la'==rcLocaleJS){
				countryCode = 'MX';
			}
		}else if(t.site=='lacie'){
			if('en-as'==rcLocaleJS){
				countryCode = 'AU';
			}else if('es-la'==rcLocaleJS){
				countryCode = 'MX';
			}
		}
		t.wtbCountryCode = countryCode;
		console.log('country_code '+t.wtbCountryCode);
		if('' == t.wtbCountryCode){
			t.wtbCountryCode='US';
		}
		return t.wtbCountryCode;
	}
	
	WTB.prototype.hideChinaDistributor = function(){
		var t = this;
		if(t.wtbCountryCode=='CN'){
			t.$wtbTabs.addClass('hide');
		}else{
			t.$wtbTabs.removeClass('hide');
		}
	}
	
	
	WTB.prototype.init = function(){
		var t = this;
		if(t.$countrySelector!==undefined && t.$countrySelector.length>=1){
			t.restoreConsole();			
			if(t.site=='lacie'){
				t.$driveTypeSelector.find('option').not(':first').remove();				
			}
			
			t.initCountryCode();
			t.initLoad();
			t.loadInitFilters();
			t.$countrySelector.val(t.wtbCountryCode);

			t.$countrySelector.on('change',function(e){
				t.resetDriveType();
				t.resetDriveCategory();
				t.countryChg();
			});
			t.$driveTypeSelector.on('change',function(e){
				t.resetDriveCategory();
				t.driveTypeChg();
			});
			$('.drive_category').on('change',function(e){
				t.driveChg($(this));
			});	
			t.$wtbTabsLinks.on('click',function(e){
				console.log('entering '+$(this).data('wtbtype'));
				t.recordType=$(this).data('wtbtype');
				t.$countrySelector.off();
				t.$driveTypeSelector.off();
			});
			
			$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
				t.$wtbContainer = $('.wtb-container');
				t.$countrySelector = $('.wtb-container .tab-pane.active select.country-selector');
				t.$driveTypeSelector = $(".wtb-container .tab-pane.active select.selectDriveType");
				t.$wtbcontent = $('.wtb-container .tab-pane.active div.wtb-displays');
				t.$wtbTabsLinks = $('ul.nav.nav-tabs.wtb-tabs a');

				t.$countrySelector.val(t.wtbCountryCode);
				
				t.$countrySelector.on('change',function(e){
					t.resetDriveType();
					t.resetDriveCategory();
					t.countryChg();
				});
				t.$driveTypeSelector.on('change',function(e){
					t.resetDriveCategory();
					t.driveTypeChg();
				});
				t.resetDriveType();
				t.resetDriveCategory();
				t.countryChg();
				t.defaultCountryToTop();
			})			
			if(!t.loadFromRequest){
				t.countryChg();
			}
			t.defaultCountryToTop();
			t.hideChinaDistributor();
		}
		
	}
	
	WTB.prototype.defaultCountryToTop = function(){
		var t= this;
		var selected = [];
		var selectedCountryVal = '';
		var options = t.$countrySelector.find("option");
		  
		$.each(options,function() {
			if($(this).val()=='N/A'){
				$(this).remove();
			}else if($(this).val()==t.wtbCountryCode){
				selectedCountryVal = $(this).val();
				selected.push($(this));
				$(this).remove();
		    }
		});
		t.$countrySelector.prepend(selected);
		t.$countrySelector.val(selectedCountryVal);

	}
	
	WTB.prototype.defaultCountryToTopForPDP = function(){
		var t= this;
		var selected = [];
		var selectedCountryVal = '';
		$countrySelectorPDP = $('div#bbModal').find('select.form-control.pdp-country-selector');
		var options = $countrySelectorPDP.find("option");
		  
		$.each(options,function() {
			if($(this).val()=='N/A'){
				$(this).remove();
			}else if($(this).is(':selected')){
				selectedCountryVal = $(this).val();
				selected.push($(this));
				$(this).remove();
		    }
		});
		$countrySelectorPDP.prepend(selected);
		$countrySelectorPDP.val(selectedCountryVal);
		
		
	}
	
	WTB.prototype.defaultCountryToTopForPDPRestore = function(){
		var t= this;
		var selected = [];
		var selectedCountryVal = '';
		$countrySelectorPDP = $('div#bbModal').find('select.form-control.pdp-country-selector');
		var options = $countrySelectorPDP.find("option");
		  
		$.each(options,function() {
			if($(this).val()=='N/A'){
				$(this).remove();
			}else if($(this).val()==labels.countryDefault){
				selectedCountryVal = $(this).val();
				selected.push($(this));
				$(this).remove();
		    }
		});
		$countrySelectorPDP.prepend(selected);
		$countrySelectorPDP.val(selectedCountryVal);

		
		
	}
	

	WTB.prototype.setSameHeightForTabWtbLogoBox = function(){
		if($(".wtb-container .tab-pane").length > 0) {
			$(".wtb-container .tab-pane").each(function(){
				var $wtbBox = $(this).find(".wtb-displays .wtb-box");
				if($wtbBox.length > 0) {
					$wtbBox.css("height","auto");
					var max = 0;
					$wtbBox.each(function(index){
						var height = $(this).outerHeight();
						if(height > max){
							max = height;
						}
					});
					$wtbBox.css("height", max + "px");
				}
			});
		}
	}
	
	WTB.prototype.buildbbModal = function(){
		var t = this;
		var countryCodeStr = labels.countryCodes;
		var countryCode = countryCodeStr.split('|');
		var countryStr = labels.countryNames;
		var countryName = countryStr.split('|');
        var country_default = labels.countryDefault;
      
        $('#bbModal').remove();
        if(country_default == "EM") country_default = "AE";
	    
        if(t.site=='seagate'){
			if('en-as'==rcLocaleJS){
				country_default = 'PH';
			}else if('en-em'==rcLocaleJS){
				country_default = 'ZA';
			}else if('es-la'==rcLocaleJS){
				country_default = 'MX';
			}
		}else if(t.site=='lacie'){
			if('en-as'==rcLocaleJS){
				country_default = 'AU';
			}else if('es-la'==rcLocaleJS){
				country_default = 'MX';
			}
		}
	    var wtbHtml = "";
	     wtbHtml += "<div class=\"modal fade bbModal\" id=\"bbModal\" style=\"display:none;\">\n";
	   	 wtbHtml += "	<div class=\"close\" data-dismiss=\"modal\">\n";
	   	 wtbHtml +=	"		<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"30px\" height=\"30px\">\n";
	   	 wtbHtml +=	"			<path d=\"M 29.71 2.04C 29.71 2.04 16.75 15 16.75 15 16.75 15 29.7 27.95 29.7 27.95 30.08 28.33 30.08 28.96 29.7 29.35 29.7 29.35 29.35 29.7 29.35 29.7 28.96 30.08 28.33 30.08 27.95 29.7 27.95 29.7 15 16.75 15 16.75 15 16.75 2.04 29.71 2.04 29.71 1.65 30.09 1.02 30.09 0.63 29.71 0.63 29.71 0.28 29.36 0.28 29.36-0.1 28.97-0.1 28.34 0.28 27.96 0.28 27.96 13.24 14.99 13.24 14.99 13.24 14.99 0.29 2.04 0.29 2.04-0.09 1.66-0.09 1.03 0.29 0.64 0.29 0.64 0.64 0.29 0.64 0.29 1.03-0.09 1.66-0.09 2.04 0.29 2.04 0.29 14.99 13.24 14.99 13.24 14.99 13.24 27.96 0.28 27.96 0.28 28.34-0.1 28.97-0.1 29.36 0.28 29.36 0.28 29.71 0.63 29.71 0.63 30.09 1.02 30.09 1.65 29.71 2.04Z\" fill=\"rgb(255,255,255)\"></path>\n";
	   	 wtbHtml +=	"		</svg>\n";
	   	 wtbHtml += "	</div>\n";
	   	 wtbHtml += "	<div class=\"close mobile\" data-dismiss=\"modal\">\n";
	   	 wtbHtml +=	"		<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20px\" height=\"20px\">\n";
	   	 wtbHtml +=	"			<path fillrule=\"evenodd\" d=\"M 19.8 1.36C 19.8 1.36 11.16 10 11.16 10 11.16 10 19.8 18.63 19.8 18.63 20.06 18.89 20.06 19.31 19.8 19.56 19.8 19.56 19.56 19.8 19.56 19.8 19.31 20.06 18.89 20.06 18.63 19.8 18.63 19.8 10 11.16 10 11.16 10 11.16 1.36 19.8 1.36 19.8 1.1 20.06 0.68 20.06 0.42 19.8 0.42 19.8 0.19 19.57 0.19 19.57-0.07 19.31-0.07 18.89 0.19 18.64 0.19 18.64 8.83 10 8.83 10 8.83 10 0.2 1.36 0.2 1.36-0.06 1.1-0.06 0.69 0.2 0.43 0.2 0.43 0.43 0.2 0.43 0.2 0.69-0.06 1.1-0.06 1.36 0.2 1.36 0.2 10 8.83 10 8.83 10 8.83 18.64 0.19 18.64 0.19 18.89-0.07 19.31-0.07 19.57 0.19 19.57 0.19 19.8 0.42 19.8 0.42 20.06 0.68 20.06 1.1 19.8 1.36Z\" fill=\"rgb(25,25,25)\"></path>\n";
	   	 wtbHtml +=	"		</svg>\n";
	   	 wtbHtml += "	</div>\n";
	   	
	   	 wtbHtml += "	<div class=\"modal-body\">\n";
	   	 wtbHtml +=	"		<div class=\"row-fluid row-header\">\n";
	   	 wtbHtml +=	"			<div class=\"wtb-header\">\n";
	   	 wtbHtml +=	"				<div class=\"header-image\">\n";
	   	 wtbHtml +=	"				</div>\n";
	   	 wtbHtml +=	"				<div class=\"header-des\">\n";
	   	 wtbHtml +=	"					<p class=\"header-title\">\n";
	   	 wtbHtml +=	"					</p>\n";
	   	 wtbHtml +=	"					<p class=\"header-number\">\n";
	   	 wtbHtml +=	"					</p>\n";
	   	 wtbHtml +=	"				</div>\n";
	   	 wtbHtml +=	"			</div>\n";
	   	 wtbHtml += "			<div class=\"wtb-selectors\">\n";
	   	 wtbHtml += "					<div class=\"form-group\">\n";
	   	 wtbHtml += "						<label for=\"selectCountry\" class=\"col-sm-2 control-label\">"+labels.wtb_selectcountry+"</label>\n";
	   	 wtbHtml += "						<select class=\"form-control pdp-country-selector\">\n";
	   	 for (var u = 0; u < countryCode.length; u++) {
					if (country_default == countryCode[u]) {
						wtbHtml += "<option value=" + countryCode[u] + " selected=\"selected\">" + countryName[u] + "</option>\n";
					} else {
						wtbHtml += "<option value=" + countryCode[u] + ">" + countryName[u] + "</option>\n";
					}
				 }
	   	 wtbHtml += "						</select>\n";
	   	 wtbHtml += "					</div>\n";
	   	 wtbHtml += "			</div>\n";        	 
	   	 wtbHtml +=	"		</div>\n";
	   	 wtbHtml += "		<div class=\"row-fluid\">\n";
	   	 wtbHtml += "			<div class=\"wtb-no-data hide\" >"+labels.wtb_noresellerlist+"</div>\n";
	   	 wtbHtml += "			<div class=\"wtb-loading\"><span></span></div>\n";
	   	 wtbHtml += "			<div class=\"wtb-displays\">\n";
	   	 
	   	 wtbHtml += "			</div>\n";
	   	 wtbHtml += "		</div>\n";
	   	 wtbHtml += "	</div>\n";
	   	 
	   	 
	   	 wtbHtml += "</div>\n";
	   	$('body').append(wtbHtml);
	}
	
	WTB.prototype.buildResellersButton = function(sku){
		var t = this;
        var country_default = labels.countryDefault;
        if(country_default == "EM") country_default = "AE";
		var wtbLinkHtml = '<br/><div class="wtb-widget"><a data-ps-country="'+country_default+'" data-ps-sku="'+sku+'" class="btn btn-primary btn-small" href="#bbModal" data-toggle="modal">' + labels.wtb_findaretailer + '</a></div>'; 
		return wtbLinkHtml;
	}
	
	WTB.prototype.buildBlueBoard = function(sku,country,categories,isexternal){
		var t = this;
		t.getBlueBoardRetailers(sku,country,categories,isexternal);
	}
	
	WTB.prototype.getWTBResellers = function(sku,country,categories,isexternal){
		var t=this;
		var wtbQueryBase = 'https://'+t.wwwDomain+'/ww/solrQueryResponseRetrieval?q=*&collection=wtb&wt=json&indent=true&start=0&rows=1000&omitHeader=true&fl=store_seagate_url,store_lacie_url,is_wtblogo_available,is_pdplogo_available,phone,name,logo_url_pdp,logo_url,website,lacie_website,is_external,is_internal,external_drives,internal_drives,lacie_external_drives&sort=wtbnewsortingweigth+asc';
		var wtbQuerySeagatePdp = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_pdp:true&fq=is_seagate:true&fq=!website:%22%22&fq=!account:%22%22';
		var wtbQueryLaCiePdp = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_pdp_lacie:true&fq=is_lacie:true&fq=!lacie_website:%22%22&fq=!account:%22%22';
		var wtbQuery = '';
        var wtbCategories = categories;        
		var isExternal = isexternal;
		if(t.site=='lacie'){
			wtbQuery = wtbQueryBase + wtbQueryLaCiePdp+"&fq=country:"+country;
		}else{
			wtbQuery = wtbQueryBase + wtbQuerySeagatePdp+"&fq=country:"+country;
		}
		if(wtbCategories!=""){
			var wtbCategoriesArray = wtbCategories.split(',');
			var wtbCategoriesNewArray =[];
			if(isExternal && t.site=="seagate"){		
				for(var i=0;i<wtbCategoriesArray.length;i++){
					wtbCategoriesNewArray[i]= 'external_drives:"'+wtbCategoriesArray[i]+'"';
				}
				wtbCategories = "("+wtbCategoriesNewArray.join(" OR ")+")";
				wtbQuery = wtbQuery + "&fq="+ wtbCategories;
			}else if(!isExternal && t.site=="seagate"){
				for(var i=0;i<wtbCategoriesArray.length;i++){
					wtbCategoriesNewArray[i]= 'internal_drives:"'+wtbCategoriesArray[i]+'"';
				}
				wtbCategories = "("+wtbCategoriesNewArray.join(" OR ")+")";
				wtbQuery = wtbQuery + "&fq="+ wtbCategories;
			}else if(t.site=="lacie"){
				for(var i=0;i<wtbCategoriesArray.length;i++){
					wtbCategoriesNewArray[i]= 'lacie_external_drives:"'+wtbCategoriesArray[i]+'"';
				}
				wtbCategories = "("+wtbCategoriesNewArray.join(" OR ")+")";
				wtbQuery = wtbQuery + "&fq="+ wtbCategories;
			}
		}
		console.log('wtbQuery '+wtbQuery);
		var $wtbloading = $('div#bbModal').find('div.wtb-loading');
		$.ajax({
			method: 'GET',
		    url: wtbQuery,
		    dataType: 'json',
		    cache:false
		}).done(function( msg ) {
			var docs = msg.response.docs;
			var $wtdcontent = $('div#bbModal').find('div.wtb-displays');
			var $wtdnocontent = $('div#bbModal').find('div.wtb-no-data');
			$wtdcontent.empty();
			$wtdnocontent.hide();
			var hasContent = false;
			$.each(docs,function(i,item){
				var website = item.website.indexOf('http')==0?item.website:'http://'+item.website;
				var lacie_website = item.lacie_website.indexOf('http')==0?item.lacie_website:'http://'+item.lacie_website;
				var company_name  = item.is_wtblogo_available?'':'<span class="wtb-name">'+item.name+'</span>';
				var content ='';
				if(t.site=="lacie"){					
					content = content+'<div class="row-fluid">\n';
					content = content+'<div class="wtb-item">\n';
					content = content+'<div class="span4">\n';
					content = content+'<img alt="'+item.name+'" src="'+item.logo_url_pdp+'"/>\n';
					content = content+'</div>\n';
					content = content+'<div class="span4">\n';
					content = content+'</div>\n';
					content = content+'<div class="span4">\n';
					content = content+'<a class="btn btn-primary gtm-wtb" target="_blank" href="'+lacie_website+'">'+labels.shop+'</a>\n';					
					content = content+'</div>\n';
					content = content+'</div>\n';
					content = content+'</div>\n';
					$wtdcontent.append(content);
					hasContent = true;
				}else if(t.site=='seagate'){
					content = content+'<div class="row-fluid">\n';
					content = content+'<div class="wtb-item">\n';
					content = content+'<div class="span4">\n';
					content = content+'<img alt="'+item.name+'" src="'+item.logo_url_pdp+'"/>\n';
					content = content+'</div>\n';
					content = content+'<div class="span4">\n';
					content = content+'</div>\n';
					content = content+'<div class="span4">\n';
					content = content+'<a class="btn btn-primary gtm-wtb" target="_blank" href="'+website+'">'+labels.shop+'</a>\n';					
					content = content+'</div>\n';
					content = content+'</div>\n';
					content = content+'</div>\n';
					$wtdcontent.append(content);
					hasContent = true;
				}
			});	 
			
			if(!hasContent){
				$wtdnocontent.show();
				$wtbloading.removeClass('loading');
			}else{
				$wtbloading.removeClass('loading');

			}		
			$('div#bbModal').find('select.form-control.pdp-country-selector').unbind('change');
			$('div#bbModal').find('select.form-control.pdp-country-selector').on("change",function(){
				t.getBlueBoardRetailers(sku,$(this).val(),categories,isexternal);
			});
		});
	}
	
	WTB.prototype.getBlueBoardRetailers = function(sku,country,categories,isexternal){
		var t=this;
		t.restoreConsole();		
		var $wtdcontent = $('div#bbModal').find('div.wtb-displays');
		var $wtdnocontent = $('div#bbModal').find('div.wtb-no-data');
		var $wtbloading = $('div#bbModal').find('div.wtb-loading');
	
		$wtdcontent.empty();
		$wtdnocontent.hide();
		$wtbloading.addClass('loading');
		var hasContent = false;
		var bbQueryBase = 'https://'+t.wwwDomain+'/ww/solrQueryResponseRetrieval?q=*&collection=blueboard&wt=json&indent=true&start=0&rows=1000&omitHeader=true&fl=is_seagate,is_lacie,is_pdp,is_pdp_lacie,logo_url_pdp,is_blueboard,country,url,product_url,product_sku,current_price,currency_code,retailer_name&sort=current_price+asc';
		var bbQuery = bbQueryBase + '&fq=country:'+country;
		bbQuery  = bbQuery + '&fq=product_sku:'+sku;
		if(t.site=='lacie'){
			bbQuery = bbQuery + '&fq=((is_lacie:true AND is_pdp_lacie:true AND is_blueboard:lacie) OR is_blueboard:both)';
		}else{
			bbQuery = bbQuery + '&fq=((is_seagate:true AND is_pdp:true AND is_blueboard:seagate) OR is_blueboard:both)';
		}	
		console.log('bbQuery '+bbQuery);
		var showPrice = false;
		var isEmeaCountry = false;
		var isBlueBoardEmeaCountry = labels.is_blueboard_emea_country.split(",");
		var isBlueBoardLocales = labels.is_blueboard_locale.split(",");
		for(var i=0;i<isBlueBoardEmeaCountry.length;i++){
			if(country==isBlueBoardEmeaCountry[i]){
				isEmeaCountry=true;
				break;
			}
		}
		if(!isEmeaCountry){
			for(var i=0;i<isBlueBoardLocales.length;i++){
				if(rcLocaleJS==isBlueBoardLocales[i]){
					showPrice=true;
					break;
				}
			}
		}
		
		$.ajax({
			method: 'GET',
		    url: bbQuery,
		    dataType: 'json',
		    cache:false
		}).done(function( msg ) {
			var docs = msg.response.docs;
			if(docs.length>0){	
				$.each(docs,function(i,item){
					var product_url = item.product_url;
					var current_price = item.current_price;
					var currency_code = item.currency_code;
					var retailer_name  = item.retailer_name;
					var img = item.logo_url_pdp;
					var country= item.country;
					var content='';
					if(showPrice && current_price>0){
						var price=new Intl.NumberFormat(country, { style: 'currency',currency: currency_code }).format(current_price);
						content = content+'<div class="row-fluid">\n';
						content = content+'<div class="wtb-item">\n';
						content = content+'<div class="span4">\n';
						content = content+'<img alt="'+retailer_name+'" src="'+img+'"/>\n';
						content = content+'</div>\n';
						content = content+'<div class="span4">\n';
						content = content+'<p class="item-price">'+price+'</p>\n';
						content = content+'</div>\n';
						content = content+'<div class="span4">\n';
						content = content+'<a class="btn btn-primary gtm-wtb-bb" target="_blank" href="'+product_url+'">'+labels.shop+'</a>\n';
						content = content+'</div>\n';
						content = content+'</div>\n';
						content = content+'</div>\n';
						$wtdcontent.append(content);
						hasContent = true;
					}else{													
						content = content+'<div class="row-fluid">\n';
						content = content+'<div class="wtb-item">\n';
						content = content+'<div class="span4">\n';
						content = content+'<img alt="'+retailer_name+'" src="'+img+'"/>\n';
						content = content+'</div>\n';
						content = content+'<div class="span4">\n';
						content = content+'</div>\n';
						content = content+'<div class="span4">\n';
						content = content+'<a class="btn btn-primary gtm-wtb-bb" target="_blank" href="'+product_url+'">'+labels.shop+'</a>\n';
						content = content+'</div>\n';
						content = content+'</div>\n';
						content = content+'</div>\n';
						$wtdcontent.append(content);
						hasContent = true;
					}					
				});					
			}
			if(!hasContent){
				t.getWTBResellers(sku,country,categories,isexternal);
			}else{
				$wtbloading.removeClass('loading');

			}
			
			$('div#bbModal').find('select.form-control.pdp-country-selector').unbind('change');
			$('div#bbModal').find('select.form-control.pdp-country-selector').on("change",function(){
				t.getBlueBoardRetailers(sku,$(this).val(),categories,isexternal);
			});	
		});
	}
		
		
	
		WTB.prototype.loadProductInfo = function(sku){
		var t=this;
		t.restoreConsole();		
		var locale = rcLocaleJS.split('-')[0];
		var skuName = 'skuName_'+locale;
		var bbQuery = 'https://'+t.wwwDomain+'/ww/solrQueryResponseRetrieval?q=*&collection=product&wt=json&indent=true&start=0&rows=1&omitHeader=true&fq=seaLocale:'+rcLocaleJS.replace('-','_')+'&fq=brand:'+t.site+'&fq=modelNumber:'+sku+'&fl=modelNumber,imagePath,'+skuName;
		console.log('prodQuery '+bbQuery);		
		$.ajax({
			method: 'GET',
		    url: bbQuery,
		    dataType: 'json',
		    cache:false
		}).done(function( msg ) {
			var docs = msg.response.docs;
			if(docs.length>0){	
				$.each(docs,function(i,item){
					var skuNameVale = item[skuName];
					var img = item['imagePath'];
					var modelNumber = item['modelNumber'];
					$wtbheaderimage = $('div.wtb-header').find('div.header-image');
					$wtbheadertitle = $('div.wtb-header').find('p.header-title');
					$wtbheadernumber = $('div.wtb-header').find('p.header-number');
					$wtbheaderimage.empty();
					$wtbheaderimage.html('<img src="'+img+'"/>');
					$wtbheadertitle.empty();
					$wtbheadertitle.html(skuNameVale);
					$wtbheadernumber.empty();
					$wtbheadernumber.html(modelNumber);
				});					
			}			
		});
	}
	
	WTB.prototype.loadProductInfoForPF = function(sku,img,skuName){
		var t=this;
		t.restoreConsole();		
		$wtbheaderimage = $('div.wtb-header').find('div.header-image');
		$wtbheadertitle = $('div.wtb-header').find('p.header-title');
		$wtbheadernumber = $('div.wtb-header').find('p.header-number');
		$wtbheaderimage.empty();
		$wtbheaderimage.html('<img src="'+img+'"/>');
		$wtbheadertitle.empty();
		$wtbheadertitle.html(skuName);
		$wtbheadernumber.empty();
		$wtbheadernumber.html(sku);
	}
	
	WTB.prototype.initLoad = function(){
		var t=this;
		var countrycode = $(document).getUrlParam("countrycode");
		var drivetype = $(document).getUrlParam("drivetype");
		var category = $(document).getUrlParam("category");
		var pagetype = $(document).getUrlParam("pagetype");
		//Retailer Distributor
		if(countrycode!=null || drivetype!=null || category!=null || pagetype!=null){
			t.loadFromRequest=true;
			if(countrycode!=null){
				t.wtbCountryCode = countrycode;
			}else{
				countrycode='US';
				t.wtbCountryCode = countrycode;
			}			
			if(pagetype!=null){
				t.recordType = 	pagetype;
			}else{
				pagetype= 'Retailer';
				t.recordType = 	pagetype;
			}
			var wtbQuery = t.getBaseQuery();
			var wtbFilter = '&fq=country:'+t.wtbCountryCode;
			if(t.site=='lacie' && drivetype!=null){
				t.wtbDriveType = drivetype;
				wtbFilter += '&fq=lacie_external_drives:'+'"'+t.wtbDriveType+'"';
			}else{
				t.wtbDriveType = drivetype;				
				if($.trim(t.wtbDriveType)=='external-drives'){
					wtbFilter += '&fq=is_external:true';
					if(category!=null && $.trim(category)!=''){
						wtbFilter += '&fq=external_drives:'+ '"'+category+'"';
					}
				}
				if($.trim(t.wtbDriveType)=='internal-drives'){
					wtbFilter += '&fq=is_internal:true';
					if(category!=null && $.trim(category)!=''){
						wtbFilter += '&fq=internal_drives:'+ '"'+category+'"';
					}
				}
				if($.trim(t.wtbDriveType)=='system'){
					wtbFilter += '&fq=is_system:true';
				}
				
			}
			console.log('initLoad '+wtbQuery);
			$.ajax({
				method: 'GET',
			    url: wtbQuery + wtbFilter,
			    dataType: 'json',
			    cache:false
			}).done(function( msg ) {
				var docs = msg.response.docs;
				t.showContent(docs);		      
			});
			
			
				
		}
	}
	
	WTB.prototype.loadInitFilters = function(){
		var t=this;
		var countrycode = $(document).getUrlParam("countrycode");
		var drivetype = $(document).getUrlParam("drivetype");
		var category = $(document).getUrlParam("category");
		var pagetype = $(document).getUrlParam("pagetype");
		if(countrycode!=null){
			t.wtbCountryCode = countrycode;
		}else{
			t.initCountryCode();
		}			
		if(pagetype!=null){
			t.recordType = 	pagetype;
		}else{
			pagetype= 'Retailer';
			t.recordType = 	pagetype;
		}
		if(category==null){
			category = '';
		}
		if(drivetype==null){
			drivetype = '';
		}
		var wtbQuery = t.getBaseQuery();
		var wtbFilter = '&fq=country:'+t.wtbCountryCode;		
		if(t.site=='seagate' ){
			if(drivetype=='external-drives'){
				wtbFilter = wtbFilter+'&facet=true&facet.field=external_drives';
			}else if(drivetype=='internal-drives'){
				wtbFilter = wtbFilter+'&facet=true&facet.field=internal_drives';
			}
		}
		if(pagetype=='Retailer'){
			$('ul.nav.nav-tabs.wtb-tabs a[id="retailer_link"]').parent().addClass('active');
			$('ul.nav.nav-tabs.wtb-tabs a[id="distributor_link"]').parent().removeClass('active');

		}else if(pagetype=='Distributor'){
			$('ul.nav.nav-tabs.wtb-tabs a[id="retailer_link"]').parent().removeClass('active');
			$('ul.nav.nav-tabs.wtb-tabs a[id="distributor_link"]').parent().addClass('active');

		}
		
		$.ajax({
			method: 'GET',
			url: wtbQuery + wtbFilter,
			dataType: 'json',
			cache: false
		}).done(function( msg ) {
			if(t.site=='lacie'){
				var facets = msg.facet_counts.facet_fields.lacie_external_drives;
				t.$driveTypeSelector.find('option').not(':first').remove();
				$.each(facets,function(i,j){ 
					if((typeof j) ==='string' && $.trim(j)!=='' && facets[i+1]!==0){
						var lb = labels['wtb_'+j.toLowerCase().replace(/[\(\) -]/g,'')]===undefined ? $.trim(j): labels['wtb_'+j.toLowerCase().replace(/[\(\) -]/g,'')];
						t.$driveTypeSelector.append('<option value="'+j+'">'+lb+'</option>');
					}	  
				});	
				drivetype= drivetype.replace(/\+/g,' ');
				drivetype= drivetype.replace(/%20/g,' ');

				t.$driveTypeSelector.val(drivetype);

			}else{
				var facets = {};
				if(drivetype=='external-drives'){
					t.isExternal = true;
					facets =msg.facet_counts.facet_fields.external_drives;
					$.each(facets,function(j,it){
						if((typeof it) ==='string' && $.trim(it)!='' && facets[j+1]!==0){	   
							var lb = labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')]===undefined ? $.trim(it) : labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')];
							if($.inArray('<option value="'+it+'">'+lb+'</option>', t.wtbExternalDrives )==-1){
								t.wtbExternalDrives.push('<option value="'+it+'">'+lb+'</option>'); 
							}
						}
					});
				}else if(drivetype=='internal-drives'){
					t.isInternal = true;
					facets =msg.facet_counts.facet_fields.internal_drives;
					$.each(facets,function(j,it){
						if((typeof it) ==='string' && $.trim(it)!='' && facets[j+1]!==0){	
							var lb = labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')]===undefined ? $.trim(it) : labels['wtb_'+it.toLowerCase().replace(/[\(\) -]/g,'')];
							if($.inArray('<option value="'+it+'">'+lb+'</option>', t.wtbInternalDrives )==-1){								
								t.wtbInternalDrives.push('<option value="'+it+'">'+lb+'</option>'); 
							}	  
						}
					});
				}	
				category= category.replace(/\+/g,' ');
				category= category.replace(/%20/g,' ');

				if(drivetype=='external-drives' && t.isExternal && t.wtbExternalDrives.length>0){
					t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#external-drives").show().find("select").append(t.wtbExternalDrives.join(''));
					t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#external-drives").show().find("select").val(category);
					
				}else{
					t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#external-drives").hide();
				}
				if(drivetype=='internal-drives' && t.isInternal && t.wtbInternalDrives.length>0){	
					t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#internal-drives").show().find("select").append(t.wtbInternalDrives.join(''));
					t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#internal-drives").show().find("select").val(category);

				}else{
					t.$driveTypeSelector.parents(".wtb-selectors").find(".hide-select").find("#internal-drives").hide();
				}
				t.$driveTypeSelector.val(drivetype);
			}		
		});
	}
	
	return WTB;
	
})(jQuery);

$(document).ready(function(){
	if($(".wtb-container .tab-pane").length > 0) {
		var wtb = new WTB();
		wtb.init();
		
		
	}else if($(".product-finder-filter-area").length > 0 && $(".product-finder-results-grid").length > 0){
		var wtb = new WTB();
		wtb.restoreConsole();
		wtb.buildbbModal();
		wtb.defaultCountryToTopForPDP();
		$(document).on('show.bs.modal', '#bbModal', function (e) {
			wtb.restoreConsole();
			console.log('modal clicked');
			var $a = $(e.relatedTarget);
			var sku = $a.data('ps-sku');
			var country = $a.data('ps-country');
			var img = $a.data('ps-img');
			var skuName = $a.data('ps-skuname');
			var categories =$a.data('ps-categories');
			var isexternal = $a.data('ps-isexternal');	
			console.log(country);
			wtb.buildBlueBoard(sku,country,categories,isexternal);
			wtb.loadProductInfoForPF(sku,img,skuName);
		});	
		$(document).on('hide.bs.modal','#bbModal',function(e){
			wtb.restoreConsole();
			console.log('modal hidden');
			wtb.defaultCountryToTopForPDPRestore();
		});
	}else{
		var wtb = new WTB();
		wtb.buildbbModal();
		wtb.defaultCountryToTopForPDP();
		if($('div.ps-widget.ps-enabled[data-ps-sku]').length>0){
			$('div.ps-widget.ps-enabled[data-ps-sku]').each(function( index ) {
				$(this).removeClass('ps-widget');
				$(this).removeClass('ps-enabled');
				$(this).addClass('stx-bb-widget');
				$(this).addClass('stx-bb-enabled');
				var $html = $(this).html();
				var sku = $(this).data('ps-sku');
				var country_default = labels.countryDefault;
		        if(country_default == "EM") country_default = "AE";
		        var categories ='';
				var isexternal = false;
				if(typeof ProductInfoStruct!='undefined' && typeof ProductInfoStruct.releaseList[0]!='undefined' && typeof ProductInfoStruct.releaseList[0].categories!='undefined'){
					categories = ProductInfoStruct.releaseList[0].categories;
				}
				if(typeof ProductInfoStruct!='undefined' && typeof ProductInfoStruct.releaseList[0]!='undefined' && typeof ProductInfoStruct.releaseList[0].external!='undefined'){
					isexternal = ProductInfoStruct.releaseList[0].external;
				}
				var $a = '<a data-ps-isexternal="'+isexternal+'" data-ps-categories="'+categories+'" data-ps-country="'+country_default+'" data-ps-sku="'+sku+'" href="#bbModal" data-toggle="modal" class="btn btn-primary btn-small">'+$html+'</a>';
				$(this).html($a);					
			});
		}else{
			$('div.stx-bb-widget.stx-bb-enabled[data-ps-sku]').each(function( index ) {
				if($(this).find("a[href='#bbModal']").length==0){
					var $html = $(this).html();
					var sku = $(this).data('ps-sku');
					var country_default = labels.countryDefault;
			        if(country_default == "EM") country_default = "AE";
			        var categories ='';
					var isexternal = false;
					if(typeof ProductInfoStruct!='undefined' && typeof ProductInfoStruct.releaseList[0]!='undefined' && typeof ProductInfoStruct.releaseList[0].categories!='undefined'){
						categories = ProductInfoStruct.releaseList[0].categories;
					}
					if(typeof ProductInfoStruct!='undefined' && typeof ProductInfoStruct.releaseList[0]!='undefined' && typeof ProductInfoStruct.releaseList[0].external!='undefined'){
						isexternal = ProductInfoStruct.releaseList[0].external;
					}
					var $a = '<a data-ps-isexternal="'+isexternal+'" data-ps-categories="'+categories+'" data-ps-country="'+country_default+'" data-ps-sku="'+sku+'" href="#bbModal" data-toggle="modal" class="btn btn-primary btn-small">'+$html+'</a>';
					$(this).html($a);		
				}		
				
			});
		}
		$(document).on('show.bs.modal', '#bbModal', function (e) {
			wtb.restoreConsole();
			console.log('modal clicked');
			var $a = $(e.relatedTarget);
			var sku = $a.data('ps-sku');
			var country = $a.data('ps-country');
			var categories =$a.data('ps-categories');
			var isexternal = $a.data('ps-isexternal');			
			wtb.loadProductInfo(sku);
			wtb.buildBlueBoard(sku,country,categories,isexternal);			
		});	
		$(document).on('hide.bs.modal','#bbModal',function(e){
			wtb.restoreConsole();
			console.log('modal hidden');
			wtb.defaultCountryToTopForPDPRestore();
		});
	}

});

