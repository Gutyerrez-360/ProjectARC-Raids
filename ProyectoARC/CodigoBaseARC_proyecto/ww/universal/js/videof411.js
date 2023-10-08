(function() { 
	
	$(document).ready(function() {
		
		function join(obj,s){
			var res = new Array();
			$.each(obj,function(key,value){
			  res.push(key+"="+value);
			});
			return res.join(s);
			
		}
		
		var youtube_embedded_url_enablejsapi="1";
		var youtube_embedded_url_autoplay="0";
		var youtube_embedded_url_rel="0";
		var youtube_embedded_url_autohide="1";
		var youtube_embedded_url_showinfo="0";
		var youtube_embedded_url_cc_lang_pref="@";
		var youtube_embedded_url_cc_load_policy="0";
		var youtube_embedded_url_modestbranding="1";
		var youtube_embedded_url_html5="1";
		var youtube_embedded_url_feature="oembed";
		var youtube_embedded_url_enablejsapi="1";
		var youtube_embedded_url_wmode="opaque";
		var youtube_embedded_url_controls="1";
		
		var youtube_modal_url_enablejsapi="1";
		var youtube_modal_url_autoplay="1";
		var youtube_modal_url_rel="0";
		var youtube_modal_url_autohide="1";
		var youtube_modal_url_showinfo="0";
		var youtube_modal_url_cc_lang_pref="@";
		var youtube_modal_url_cc_load_policy="0";
		var youtube_modal_url_modestbranding="1";
		
		var youtube_embedded_iframe_width="560";
		var youtube_embedded_iframe_height="315";
		var youtube_embedded_iframe_frameborder="0";
		var youtube_embedded_iframe_allow="autoplay; encrypted-media";
		var youtube_embedded_iframe_allowfullscreen="true";
		
		var tencent_embedded_iframe_frameborder="0";
		var tencent_embedded_iframe_allowfullscreen="true";
		
		var youtube_modal_iframe_allow="autoplay; encrypted-media";

		
		var youtube_embedded_url_default = {
			"enablejsapi":youtube_embedded_url_enablejsapi,
			"autoplay":youtube_embedded_url_autoplay,
			"rel":youtube_embedded_url_rel,
			"autohide":youtube_embedded_url_autohide,
			"showinfo":youtube_embedded_url_showinfo,
			"cc_lang_pref":youtube_embedded_url_cc_lang_pref,
			"cc_load_policy":youtube_embedded_url_cc_load_policy,
			"modestbranding":youtube_embedded_url_modestbranding			
		};
		
		var youtube_modal_url_default = {
			"enablejsapi":youtube_modal_url_enablejsapi,
			"autoplay":youtube_modal_url_autoplay,
			"rel":youtube_modal_url_rel,
			"autohide":youtube_modal_url_autohide,
			"showinfo":youtube_modal_url_showinfo,
			"cc_lang_pref":youtube_modal_url_cc_lang_pref,
			"cc_load_policy":youtube_modal_url_cc_load_policy,
			"modestbranding":youtube_modal_url_modestbranding			
		};
		
		var youtube_embedded_iframe_default = {
			"width":youtube_embedded_iframe_width,
			"height":youtube_embedded_iframe_height,
			"frameborder":youtube_embedded_iframe_frameborder,
			"allow":"\""+youtube_embedded_iframe_allow+"\"",
			"allowfullscreen":youtube_embedded_iframe_allowfullscreen		
		};
			
		var youtube_modal_iframe_default = {};
		
		var tencent_embedded_url_default = {};
			
		var tencent_modal_url_default = {};

		var tencent_embedded_iframe_default = {
			"frameborder":tencent_embedded_iframe_frameborder,
			"allowfullscreen":tencent_embedded_iframe_allowfullscreen		

		};
		
		var tencent_modal_iframe_default = {};
		
		var dv082_youtube_embedded_iframe_default = {
			"frameborder":youtube_embedded_iframe_default.frameborder,
			"allowfullscreen":youtube_embedded_iframe_default.allowfullscreen
		}
		
		var dv082_youtube_embedded_url_default = {
			"html5":youtube_embedded_url_html5,
			"enablejsapi":youtube_embedded_url_enablejsapi,
			"rel":youtube_embedded_url_rel,
			"autohide":youtube_embedded_url_autohide,
			"showinfo":youtube_embedded_url_showinfo,
			"cc_lang_pref":youtube_modal_url_cc_lang_pref,
			"cc_load_policy":youtube_embedded_url_cc_load_policy,
			"modestbranding":youtube_embedded_url_modestbranding,
			"controls":youtube_embedded_url_controls
		};
		
		var dv199_youtube_embedded_iframe_default = {
			"width":"640",
			"height":"360",
			"frameborder":youtube_embedded_iframe_frameborder,
			"allowfullscreen":youtube_embedded_iframe_allowfullscreen
		}
		
		var dv199_youtube_embedded_url_default = {
			"feature":youtube_embedded_url_feature,
			"enablejsapi":youtube_embedded_url_enablejsapi,
			"wmode":youtube_embedded_url_wmode,
			"showinfo":youtube_embedded_url_showinfo
		}
		
		var dv201_youtube_embedded_iframe_default = {
			"frameborder":youtube_embedded_iframe_frameborder,
			"allow":"\""+youtube_embedded_iframe_allow+"\"",
			"allowfullscreen":youtube_embedded_iframe_allowfullscreen
		}
			
		var dv201_youtube_embedded_url_default = {
			"feature":youtube_embedded_url_feature,
			"enablejsapi":youtube_embedded_url_enablejsapi,
			"wmode":youtube_embedded_url_wmode,
			"showinfo":youtube_embedded_url_showinfo
		}
		
		
		
		
		
		var youtube_embedded_url = "https://www.youtube.com/embed/";
		var youtube_watch_url = "https://www.youtube.com/watch?v="
		var tencent_embedded_url = "https://v.qq.com/txp/iframe/player.html?vid=";
		var tencent_watch_url = "https://v.qq.com/txp/iframe/player.html?vid="

		
		var videos_list = $("a[href^='#video_format']");
		var vidList = [];
	    if(videos_list!=='undefined' && videos_list.length>0){   
	        var popUpInModals = false;
	    	for(var i = 0;i<videos_list.length;i++){
	    		var embeddedClass = "video-wrapper";
	    		var video = videos_list[i];
		        var videoObj = $(video);
		        var iframe = "";
		        var iframeSrcParameter ="";
		        var iframeSrcObj = {};
		        var iframeAttrObj = {};
		        var targetModal = "#vidModal";
		        var popUpInModal = false;
		        var dv = videoObj.data("dv");	        
		        var videoString = videoObj.attr('href');
		        var videoStringArray = videoString.split('#');
		        var videoFormat= "";
		        var videoId = "";
		        if(videoStringArray.length==3){
		        	videoId = $.trim(videoStringArray[2]);
		        	videoFormat = videoStringArray[1];     
		        }
		        if(dv!==undefined){
		        	if("dv199"===dv){
		        		if("video_format_youtube"===videoFormat){
			        		iframeSrcObj = dv199_youtube_embedded_url_default;
			        		iframeAttrObj = dv199_youtube_embedded_iframe_default;
		        		}else if("video_format_tencent"===videoFormat){
		        			iframeSrcObj = tencent_embedded_url_default;
			        		iframeAttrObj = tencent_embedded_iframe_default;
		        			
		        		}
		        		
		        	}
		        	if("dv082"===dv){
		        		if("video_format_youtube"===videoFormat){	        			
			        		iframeSrcObj = dv082_youtube_embedded_url_default;
			        		iframeAttrObj = dv082_youtube_embedded_iframe_default;
		        		}else if("video_format_tencent"===videoFormat){
		        			iframeSrcObj = tencent_embedded_url_default;
			        		iframeAttrObj = tencent_embedded_iframe_default;
		        			
		        		}	        		
		        	}
		        	if("dv201"===dv){
		        		if("video_format_youtube"===videoFormat){
			        		iframeSrcObj = dv201_youtube_embedded_url_default;
			        		iframeAttrObj = dv201_youtube_embedded_iframe_default;
		        		}else if("video_format_tencent"===videoFormat){
		        			iframeSrcObj = tencent_embedded_url_default;
			        		iframeAttrObj = tencent_embedded_iframe_default;
		        		}	  
		        	}	        	
		        	
		        }
		        popUpInModal = videoObj.data("modal")!==undefined && videoObj.data("modal") =="1";
		        popUpInModals = videoObj.data("modals")!==undefined && videoObj.data("modals") =="1";
		        
		        if(popUpInModal || popUpInModals){
		        	if("video_format_youtube"===videoFormat){
		        		iframeSrcObj = youtube_modal_url_default;
		        		iframeAttrObj = {};
		        	}else if("video_format_tencent"===videoFormat){
		        		iframeSrcObj = tencent_modal_url_default;
		        		iframeAttrObj = {};
		        	}	        	
		        }
		        var classValue = "";
		        videoObj.each(function() {
		       		 $.each(this.attributes, function() {
			        		var attributeName='';
				            var attributeValue = this.value;
				            
				            if(this.name.indexOf('data-url-')!=-1){
				            	if("video_format_youtube"===videoFormat && this.name.split('-').length==3){
				            		attributeName = this.name.split('-')[2];
				            	}else if("video_format_tencent"===videoFormat && 
				            			this.name.indexOf('data-url-tencent-')!=-1 && this.name.split('-').length==4){
				            		attributeName = this.name.split('-')[3];
				            	}
				            	iframeSrcObj[attributeName] = attributeValue;
				            }else if(this.name.indexOf('data-iframe-')!=-1){
				            	if("video_format_youtube"===videoFormat && this.name.split('-').length==3){
				            		attributeName = this.name.split('-')[2];
				            	}else if("video_format_tencent"===videoFormat && 
				            			this.name.indexOf('data-iframe-tencent-')!=-1 && this.name.split('-').length==4){
				            		attributeName = this.name.split('-')[3];
				            	}
				            	iframeAttrObj[attributeName] = attributeValue;
				            }else if(this.name.indexOf('data-wrapper-class')!=-1){
				            	embeddedClass = attributeValue;
				            } else if (this.name == "class") {
				            	iframeAttrObj["class"] = attributeValue;
				            	classValue = attributeValue;
				            }
			        	}); 
		       	 });
		        
		        if(iframeSrcObj["cc_lang_pref"]!==undefined &&iframeSrcObj["cc_lang_pref"]=="@" ){
		        	iframeSrcObj["cc_lang_pref"]=rcLocaleJS.split("-")[0];
		        }
		        
		        iframeSrcParameter = join(iframeSrcObj,"&");
	    		iframe = join(iframeAttrObj," ");
		        
		        if($.trim(iframe)==""){
		        	iframe = join(youtube_embedded_iframe_default," ");
		        }    	   	
		        var src ="";

		        if(videoStringArray.length==3){
	    
		            if(videoId==''){
		            	videoObj.remove();
		            }else{
		            	var newHrefBody = videoObj.html();
		            	var newHref = "";
		            	if(videoFormat==='video_format_youtube'){
		            		src = youtube_embedded_url+videoId;
		            		if($.trim(iframeSrcParameter)!=""){
		                    	src = src +"?"+iframeSrcParameter;              	   
		                    }
							newHref = "<a class='" + classValue + "' data-src=\""+src+"\" data-video-id=\""+videoId+"\" data-toggle=\"modal\" target=\"_blank\" data-target=\"#vidModal\" href=\""+youtube_watch_url+""+videoId+"\">"+newHrefBody+"</a>";
		            	}else if(videoFormat==='video_format_tencent'){
		            		src = tencent_embedded_url+videoId;
		            		if($.trim(iframeSrcParameter)!=""){
		                    	src = src +"&"+iframeSrcParameter;              	   
		                    }
		            		newHref = "<a class='" + classValue + "' data-src=\""+src+"\" data-video-id=\""+videoId+"\" data-toggle=\"modal\" target=\"_blank\" data-target=\"#vidModal\" href=\""+tencent_watch_url+""+videoId+"\">"+newHrefBody+"</a>";
		            		
		            	}
		            	if(popUpInModal){                
							videoObj.replaceWith(newHref);
	                    }else if(popUpInModals){
	                    	var name = videoObj.html();
	                    	videoObj.remove();
	                    	vidList.push({key:videoId, name:name, format:videoFormat});
	                    }else{
	                    	iframe = "<div class=\""+embeddedClass+"\"><iframe "+iframe+" src=\""+src+"\"></iframe></div>"; 
		                    videoObj.replaceWith(iframe);
	                    }	
		            	
		            }                  
		        }                
	    	}   
	    	
	    	if(popUpInModals){
	        	var sVideoGallary = new SVideoGallaryNew();
	    		sVideoGallary.init(vidList);
	        }    	
	    	
	    }
	    
	    $(document).on('click', '[data-target="#vidModal"]', function(e) {
			e.preventDefault();
			var theVideo = '';
			if($(this).attr("href").indexOf("youtube.com")!=-1){
				theVideo = youtube_embedded_url + $(this).attr("data-video-id");
			}else if($(this).attr("href").indexOf("qq.com")!=-1){
				theVideo = tencent_embedded_url + $(this).attr("data-video-id");
			}		 
			
			var theModal = $(this).data("target");
			var videoSRC = theVideo;
			var videoSRCauto = videoSRC;
			if($(this).data("src")!==undefined){
				videoSRCauto=$(this).data("src");
			}
			
			
			$(theModal + ' iframe').attr('src', videoSRCauto);
			$(theModal + ' iframe').attr('allow', youtube_modal_iframe_allow);
			
			$(theModal + ' button.close').click(function() {
				$(theModal + ' iframe').attr('src', videoSRC);
			});
			$('.modal').click(function() {
				$(theModal + ' iframe').attr('src', videoSRC);
				window.setTimeout(function() {
					$('#myStyle').remove();
				}, 1000);
			});
			$('<style type="text/css" id="myStyle">.modal-backdrop {background-color: #dddddd !important;opacity: .8 !important;}.modal{background-color:inherit;}</style>').appendTo($('body'));
		});
	    	
	});
})()


var SVideoGallaryNew = (function ($) {
	var sVideoGallary = function (options) {
		this.$VgElem = $("#vg_elem");
		this.$Container = $("#vg_elem > .container");
		this.$VgOuter = this.$VgElem.find("#vg_outer");
		this.$VgInner = this.$VgElem.find("#vg_inner");
		this.$VgLeftOver = this.$VgElem.find("#vg_leftOver");
		this.$VgRightOver = this.$VgElem.find("#vg_rightOver");
		this.$VgImgBox = this.$VgElem.find(".imgBox");
		this.$VgControls = this.$VgElem.find(".vg-controls");
		this.$VgControlsBtn = this.$VgControls.find(".vg-button");
		this.$VgFlag = this.$VgElem.find(".vg_falg");
		
		this.currentClass = "currentFirst";
		this.prevClass = "prev";
		this.nextClass = "next";
		this.disabledClass = "disabled";
		this.displayCount = 4;
		
		this.index = 0;
		this.hover = false;
		if (options) {
			$.extend(this.options, options);
		}
	};

	sVideoGallary.prototype.init = function (vidList) {
		var t = this;

		
	  	t.populateVids(vidList); 	  				

		t.$VgControlsBtn.click(function (e) {
			e.preventDefault();
			var that = $(this);
			if(!that.hasClass(t.disabledClass)) {
				var $vgImgBoxVisibleFirst = t.$VgElem.find("." + t.currentClass);
				t.index = t.$VgImgBox.index($vgImgBoxVisibleFirst);
				if(that.hasClass(t.nextClass)){
					if(t.$VgFlag.css("display") == "none"){
						t.index = t.index + 1;
					}
					else {
						t.index = t.index + t.displayCount;
					}
					
				}else {
					if(t.$VgFlag.css("display") == "none"){
						t.index = t.index - 1;
					}
					else {
						t.index = t.index - t.displayCount;
					}
				}
				t.change();
			}
		});
        $(window).load(function(){
			//t.addAdditionalBox();
        	t.setAttributes();
        });
        $(window).resize(function(){
        	t.setAttributes();
			var $vgImgBoxVisibleFirst = t.$VgElem.find("." + t.currentClass);
    		t.index = t.$VgImgBox.index($vgImgBoxVisibleFirst);
    		t.change();
        });       
	};
	
	sVideoGallary.prototype.populateVids = function(vg_vidList){	 
		var t = this;	
	    vg_vidList.forEach(function(vidNum, i){
	    	var videoId = vidNum.key;
	        var videoName = vidNum.name;
	    	var format = vidNum.format;
	    	if('video_format_youtube'==format){
		    	$("#vg_inner").append("<p class='imgBox'><a data-target='#vidModal' target='_blank' class='gtm-video' data-toggle='modal' data-video-id='"+videoId+"' href='https://www.youtube.com/watch?v="+videoId+"'><img src='https://img.youtube.com/vi/"+videoId+"/0.jpg' /></a>"+videoName+"</p>");

	    	}else if('video_format_tencent'==format){
		    	$("#vg_inner").append("<p class='imgBox'><a data-target='#vidModal' target='_blank' class='gtm-video' data-toggle='modal' data-video-id='"+videoId+"' href='https://v.qq.com/txp/iframe/player.html?vid="+videoId+"'><img width='276' height='207' src='https://puui.qpic.cn/vpic/0/"+videoId+"_160_90_3.jpg/0'/></a>"+videoName+"</p>");
		    	
	    	}
        	t.$VgImgBox = t.$VgElem.find(".imgBox");
			t.$VgImgBox.eq(0).addClass(t.currentClass);
        	t.setAttributes();	
	        
	   });
	}
	
	sVideoGallary.prototype.addAdditionalBox = function(){
		var t = this;
		var count = t.$VgImgBox.length;
		if(count > t.displayCount){
			var r = count % t.displayCount;
			switch (r){
				case 0:
					break;
				case 1:
					t.$VgInner.append("<p class='imgBox blank'></p><p class='imgBox blank'></p><p class='imgBox blank'></p>");
					break;
				case 2:
					t.$VgInner.append("<p class='imgBox blank'></p><p class='imgBox blank'></p>");
					break;
				case 3:
					t.$VgInner.append("<p class='imgBox blank'></p>");
					break;
			}
		}
	};
	
	sVideoGallary.prototype.setAttributes = function(){
		var t = this;
		var containerWidth = t.$VgOuter.width();
		if(t.$VgFlag.css("display") == "none"){
			var vgImageBoxWidth = containerWidth;
			t.$VgImgBox.css("width", vgImageBoxWidth+ "px");
		}else {
			var vgImageBoxWidth = Math.floor(containerWidth / t.displayCount);
			t.$VgImgBox.css("width", vgImageBoxWidth+ "px");
		}
		
		
		var vgContainMarg = parseInt(t.$Container.css("margin-left"));
		if(vgContainMarg == 0){
			vgContainMarg = parseInt(t.$Container.css("padding-left"));
		}
		var border = 3;
		vgContainMarg = vgContainMarg + border;
	    t.$VgLeftOver.css("width",vgContainMarg+"px");
		t.$VgRightOver.css("width",vgContainMarg+"px");
	};

	sVideoGallary.prototype.change = function () {
		var t = this;

		if (t.index >=0 && t.index < t.$VgImgBox.length) {
			t.$CurrentVgImgBox = t.$VgImgBox.eq(t.index);

			t.$VgImgBox.removeClass(t.currentClass);
			t.$CurrentVgImgBox.addClass(t.currentClass);

			var left = t.$CurrentVgImgBox.outerWidth();
			var remain = t.$VgImgBox.length - 1 - t.index;
			
			if(t.index >= 0){
				var moveLeft = t.index * -left;

				//console.log(moveLeft);
				if(t.index == 0) {
					moveLeft = 0;
				}

				moveLeft = moveLeft + 'px';
				t.$VgInner.css({'transform' : 'translateX(' + moveLeft +')'});
				t.$VgControlsBtn.removeClass(t.disabledClass);

			}
			if(t.index == 0){
				t.$VgControls.find("." + t.nextClass).removeClass(t.disabledClass);
				t.$VgControls.find("." + t.prevClass).addClass(t.disabledClass);
			}
			if(t.$VgFlag.css("display") == "none"){
				if(remain < 1 ) {
					t.$VgControls.find("." + t.nextClass).addClass(t.disabledClass);
					t.$VgControls.find("." + t.prevClass).removeClass(t.disabledClass);
				}
			}
			else {
				if(remain < t.displayCount ) {
					t.$VgControls.find("." + t.nextClass).addClass(t.disabledClass);
					t.$VgControls.find("." + t.prevClass).removeClass(t.disabledClass);
				}
			}
		}
	};

	return sVideoGallary;
})(jQuery);