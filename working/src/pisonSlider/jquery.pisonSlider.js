// array index of
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (elt /*, from*/) {
        var len = this.length >>> 0;
        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) from += len;

        for (; from < len; from++) {
            if (from in this && this[from] === elt) return from;
        }
        return -1;
    };
}

(function($) {
	$.fn.extend({
		/**
		 * pisonSlider default
		 */
		pisonSlider: function(settings) {
			// it's for list
			if((!this.is('ul') && !this.is('ol')) || this.find('li').length == 0) return false;

			this.addClass('pisonSlider-list');

			// default value
			var defaults = {
				////
				// setting values
				// default
				startSlideIndex:		0,
				/***************************
				 * image positioning mode
				 ***************************/
				// 'widthfit' mode(default): full width, height is unlimited
				//				width(option,stretch,restrict), height(option,stretch,restrict)
				// 'stretch' mode: vertical, horizontal centering
				//				'stretch' mode is almost same with 'widthfit' mode
				//				width(option,stretch,restrict), height(required,stretch,restrict)
				// 'filled' mode: vertical, horizontal centering
				//				'filled' mode is cut extra area
				//				width(required,stretch,cut overflow), height(required,stretch,cut overflow)
				// 'zoomin' mode: vertical, horizontal centering and zooming
				//				'zoomin' mode is cut extra area like filled mode, but little bit bigger than filled mode, and zooming
				//				width(required,stretch,cut overflow), height(required,stretch,cut overflow)
				//				bigger 3% than filled mode
				mode:					'widthfit', // 'widthfit'(default),'stretch'(need height),'filled'(need width,height),'zoomin'(need width,height)
				zoominMouseOverStop:	true,

				// thumbnail setting
				thumbPosition:				'none', // 'none', 'top', 'right', 'bottom', 'left'
				useThumbPage:				true,
				numThumbs:					7,
				useThumbSize:				false,
				thumbWidth:					75,		// '0' is original size
				thumbHeight:				75,		// '0' is original size
				// image processing
				width:						0,		// width default is '100%'
				height:						440,
				// auto slide
				autoSlide:					false,
				autoSlideTimer:				5000,
				autoSlideBar:				true,
				autoSlideBarPosition:		'bottom',	// 'top', 'bottom'
				onHoverStop:				true,
				// indicator
				indicator:					false,
				/***************************
				 * image transition effect
				 ***************************/
				effect:						'random',	// 'none','random','box_random','normal_random','fade','coverLeft','coverRight'
				duration:					400,
				hDuration:					0,		// height changing duration
				boxEffectDurationFactor:	2,		// box effect duration speed factor value
				//
				// events
				thumbSlideEvent:			'click',	// thumbnail event for slide change
				SlideLoaded:				null,
				beforeSlideChange:			null,		// argument: 'before index', 'next index'
				/***************************
				 * user action
				 ***************************/
				clickAction:				'link_blank'	// 'link_blank' : open link to blank, if not has link then go to next slide
															// 'nextSlide': forced next slide
			};

			// merging setting values
			$.extend(defaults, settings);

			// prevent image loading
			this.find('li').each(function(){
				var img = $(this).find('img');
				if(typeof $(this).data('origin')=='undefined')
					$(this).data('origin',img.attr('src'));
				if(typeof $(this).data('thumb')!='undefined'||typeof img.data('thumb')!='undefined')
					img.removeAttr('src');
			});

			var isIE = navigator.userAgent.match(/MSIE/i)!=null;
			var underIE8 = isIE && navigator.userAgent.match(/MSIE (\d)/i)[1]<9 && navigator.userAgent.match(/MSIE (\d)/i)[1]>4;

			// lock zoomin mode in IE8
			if(underIE8&&defaults.mode=='zoomin')
				defaults.mode='filled';
			// off autoslide if it's not multi image
			if(this.find('li').length<=1) {
				defaults.autoSlide = false;
				defaults.indicator = false;
			}

			// pisonSlider main object
			var ps = this.wrap('<div class="pisonSlider'+(underIE8?' underIE8':'')+(isIE?' isIE':'')+'"><div class="pisonSlider-thumbs pisonSlider-thumbs-'+defaults.thumbPosition+(defaults.useThumbPage?'':' pisonSlider-thumbs-nopage')+'" /></div>').parent().parent();
			var ps_thumbs = ps.find('div.pisonSlider-thumbs');
			var ps_thumbs_ul = this;
			var ps_canvas = $('<div class="pisonSlider-canvas pisonSlider-thumbs-'+defaults.thumbPosition+'"><div class="pisonSlider-canvas-clickarea"></div></div>');
			var proc = {};

			// zoomin variables
			var zoomin_interval=null;
			var zoomin_interval_before=null;
			var zoomin_interval_stop=false;

			// thumbnail part size change
			if(ps.width!=0&&(defaults.thumbPosition=='left'||defaults.thumbPosition=='right')) {
				ps_thumbs.width(ps.width()-defaults.width);
			}
			if(defaults.thumbPosition=='left'||defaults.thumbPosition=='bottom'||defaults.thumbPosition=='right')
				ps.prepend(ps_canvas);
			else
				ps.append(ps_canvas);

			// variables
			var ps_thumbs_left_arrow = $('<div class="pagearrow thumbs_left_arrow"></div>');
			ps_thumbs.prepend(ps_thumbs_left_arrow);
			var ps_thumbs_right_arrow = $('<div class="pagearrow thumbs_right_arrow"></div>');
			ps_thumbs.append(ps_thumbs_right_arrow);

			// img array
			var org_imgs = {};

			// set extended values
			ps.f_width = ps.width;
			ps.f_height = ps.height;
			$.extend(ps, defaults);

			// define effect types
			proc.effect_box = ['box1','box2','box3'];
			proc.effect_normal = ['fade','coverLeft','coverRight'];
			proc.effect_list = proc.effect_box.concat(proc.effect_normal);

			//
			// set process
			// box position fixing (floating point pixel problem)
			proc.pixelFixing = function(image_wrapper) {
				console.log('pixelFixing');
				var v_cnt = image_wrapper.data('vertical-count');
				var h_cnt = image_wrapper.data('horizontal-count');
				var box_w = image_wrapper.data('box-width');
				var box_h = image_wrapper.data('box-height');

				image_wrapper.find('.pisonSlider-imgbox').each(function(){
					var $this = $(this);
					// horizontal
					if($this.data('x') > 0) {
						var pre = $this.siblings('[data-x='+($this.data('x')-1)+'][data-y='+$this.data('y')+']');
						if(Math.round(pre.width() + pre.position().left) != Math.round($this.position().left)) {
							var preX = $this.data('x')-1;
							pre.css('width','calc('+box_w+'% + 1px)');
							pre.find('>div').css({'width':'calc('+(h_cnt*100)+'% - '+(h_cnt*1)+'px)',
												'left':'calc(-'+(preX*100)+'% + '+(preX*1)+'px)'});
						}
					}
					// vertical
					if($this.data('y') > 0) {
						var pre = $this.siblings('[data-y='+($this.data('y')-1)+'][data-x='+$this.data('x')+']');
						if(Math.round(pre.height() + pre.position().top) != Math.round($this.position().top)) {
							var preY = $this.data('y')-1;
							pre.css('height','calc('+box_h+'% + 1px)');
							pre.find('>div').css({'height':'calc('+(v_cnt*100)+'% - '+(v_cnt*1)+'px)',
												'top':'calc(-'+(preY*100)+'% + '+(preY*1)+'px)'});
						}
					}
				});
			}

			// function list
			$.extend(ps,{
				// current page number
				nowPage:	0,
				// current slide number
				nowSlide:	0,
				// total slide count
				totalSlideCnt:	ps_thumbs_ul.find('li').length,
				// change before slide
				prevSlide: function() {
					if(this.nowSlide-1<0)
						this.slideChange(this.totalSlideCnt-1);
					else
						this.slideChange(this.nowSlide-1);
				},
				// change next slide
				nextSlide: function() {
					// not enough images
					if(ps.find('li').length<=1) {
						return;
					}
					this.slideChange(this.nowSlide+1);
				},
				// change page by number
				pageChange: function(num, pageSet) {
					typeof pageSet == 'undefined'?pageSet=true:'';

					var startli = this.numThumbs * num;
					var endli = this.numThumbs * (num+1)-1;

					var slideChange = false;
					ps_thumbs_ul.find('li').each(function(i,v){
						if(i>=startli && i<=endli)
							$(this).removeClass('unvisible');
						else {
							if(ps.useThumbPage)
								$(this).addClass('unvisible');
							if($(this).is('li.current'))
								slideChange = true;
						}
					});
					// slide changed?
					if(slideChange && pageSet) {
						this.slideChange(startli);
					}

					// save now page
					this.nowPage = num;

					// use thumb page
					if(ps.useThumbPage) {
						// if first page than
						if(this.nowPage == 0) {
							ps_thumbs_left_arrow.hide();
						} else {
							ps_thumbs_left_arrow.show();
						}

						// if last page than
						if(endli >= ps_thumbs_ul.find('li').length-1) {
							ps_thumbs_right_arrow.hide();
						} else {
							ps_thumbs_right_arrow.show();
						}
					} else {
						ps_thumbs_left_arrow.hide();
						ps_thumbs_right_arrow.hide();
					}
				},
				// now Transitioning process count
				NowSlideTransitioningCount: 0,
				// slide transition
				SlideTransition: function(num, callback) {
					var nowcnt=++ps.NowSlideTransitioningCount;

					// set effect type
					var effect=this.effect;
					if(this.effect=='random') {
						effect=proc.effect_list[Math.floor(Math.random() * proc.effect_list.length)];
					} else if(this.effect=='box_random')
						effect=proc.effect_box[Math.floor(Math.random() * proc.effect_box.length)];
					else if(this.effect=='normal_random')
						effect=proc.effect_normal[Math.floor(Math.random() * proc.effect_normal.length)];

					// newimg and preimg and wrap
					var newimg = $(org_imgs[num]);
					var newimg_elem=org_imgs[num];
					//ps_canvas.stop().find('div.pisonSlider_preimg_wrap').stop().remove();
					var preimg_wrap = ps_canvas.find('div.pisonSlider-img-wrap:last').stop(true,true).addClass('pisonSlider_preimg_wrap');
					var preimg = preimg_wrap.find('img');
					var newimg_wrap = $('<div class="pisonSlider-img-wrap" data-transition_effect="'+effect+'" />').appendTo(ps_canvas);

					var cssPos=newimg[0].cssPosition();

					var canvas_boxes=new Array();

					/*****************
					 * box sizing
					 *****************/
					var box_w = '100';
					var box_h = '100';
					var h_cnt=1;
					var v_cnt=1;

					// box effect
					if(proc.effect_box.indexOf(effect)>=0) {
						var tmp_canvas_w=defaults.width>0 ? defaults.width : ps_canvas.width();
						var tmp_canvas_h=cssPos.height;
						h_cnt = Math.round(tmp_canvas_w / 70);
						v_cnt = Math.round(tmp_canvas_h / 70);
						box_w = box_w/h_cnt;
						box_h = box_h/v_cnt;
					}

					// set data to wrapper
					newimg_wrap.data('vertical-count',v_cnt);
					newimg_wrap.data('horizontal-count',h_cnt);
					newimg_wrap.data('box-width',box_w);
					newimg_wrap.data('box-height',box_h);

					/*****************
					 * image element type
					 *****************/
					// canvas box type effects
					if(ps.mode=='zoomin') {
						var box_str='';
						for(var y=0;y<v_cnt;y++) {
							for(var x=0;x<h_cnt;x++) {
								box_str+='<canvas class="pisonSlider-imgbox" data-x="'+x+'" data-y="'+y+'" width="'+box_w+'%" height="'+box_h+'%" style="width:'+box_w+'%;height:'+box_h+'%;left:'+(box_w*x)+'%;top:'+(box_h*y)+'%;" />';
							}
						}

						newimg_wrap.append(box_str).find('canvas').each(function(i){
							canvas_boxes[i]={
								ctx:this.getContext("2d"),
								x:$(this).data('x'),
								y:$(this).data('y')
							}
							canvas_boxes[i].ctx.drawImage(newimg[0],cssPos.left-box_w*canvas_boxes[i].x,cssPos.top-box_h*canvas_boxes[i].y,cssPos.width,cssPos.height);
						});
					}
					// box type effects
					else {
						var box_str='';
						for(var y=0;y<v_cnt;y++) {
							for(var x=0;x<h_cnt;x++) {
								box_str+='<div class="pisonSlider-imgbox" data-x="'+x+'" data-y="'+y+'" style="width:'+box_w+'%;height:'+box_h+'%;left:'+(box_w*x)+'%;top:'+(box_h*y)+'%;'
								// under ie8
								if(underIE8)
									box_str+='"><img src="'+newimg.attr('src')+'" style="width:'+cssPos.width+'px;height:'+cssPos.height+'px;margin-top:'+(box_h*y*-1+cssPos.top)+'px;margin-left:'+(box_w*x*-1+cssPos.left)+'px;" /></div>';
								else {
									box_str+='"><div style="background-image:url(\''+newimg.attr('src')+'\');width:'+(h_cnt*100)+'%;height:'+(v_cnt*100)+'%;left:-'+x+'00%;top:-'+y+'00%;" /></div>';
								}
							}
						}
						newimg_wrap.append(box_str);
					}

					//
					// set longest height
					if(dynamic_height && ps_canvas.height()!=cssPos.height) {
						preimg_wrap.css('height',preimg_wrap.height());
						var newheight=cssPos.height>preimg.height()?cssPos.height:preimg.height();
						// fast change
						if(!ps.hDuration || newimg.is('.pisonSlider_preimg'))
							ps_canvas.height(newheight);
						else if(ps.hDuration)
							ps_canvas.animate({'height':newheight},ps.hDuration);
					}

					//
					// box position fixing (floating point pixel problem)
					proc.pixelFixing(newimg_wrap);

					//
					// Slide transition finished function
					var SlideTransitionFisnished=function(){
						preimg_wrap.remove();

						if(nowcnt!=ps.NowSlideTransitioningCount)
							return;

						// all preimg_wrap remove when last img animation
						ps_canvas.find('.pisonSlider_preimg_wrap').remove();

						// resize height
						if(dynamic_height && ps_canvas.height()!=cssPos.height) {
							if(ps.hDuration)
								ps_canvas.animate({'height':cssPos.height},ps.hDuration);
							else
								ps_canvas.height(cssPos.height);
						}

						clearInterval(zoomin_interval_before);

						// callback
						if($.isFunction(callback)) {
							ps.SlideTransitionCallback=callback;
							ps.SlideTransitionCallback(num);
						}
					}

					//
					// zoomin annimating
					if(ps.mode=='zoomin') {
						// zoomin mode animating
						clearInterval(zoomin_interval_before);
						zoomin_interval_before=zoomin_interval;
						var i_rate=1.0005;
						var tmp_w=cssPos.width;
						var tmp_h=cssPos.height;
						// 25 frames per second
						zoomin_interval=setInterval(function() {
							if(zoomin_interval_stop) return;

							for (var i in canvas_boxes) {
								canvas_boxes[i].ctx.drawImage(newimg[0],cssPos.left-(tmp_w-cssPos.width)/2 -box_w*canvas_boxes[i].x,cssPos.top-(tmp_h-cssPos.height)/2 -box_h*canvas_boxes[i].y,tmp_w,tmp_h);
							}

							tmp_w*=i_rate;
							tmp_h*=i_rate;
							if(tmp_w>cssPos.width*1.3)
								clearInterval(zoomin_interval);
						},40);
					}

					/***********
					// effects
					************/
					newimg_wrap.data('effect_type',effect);
					// fade effect
					if(effect=='fade') {
						// remove it but not removed another side why it's reference copy.
						newimg_wrap.css('opacity',1).find('.pisonSlider-imgbox').css('opacity',0).animate({'opacity':1},ps.duration,function(){
							if(preimg_wrap.length==0)
								SlideTransitionFisnished();
						});
						preimg_wrap.find('.pisonSlider-imgbox').delay(ps.duration/2).animate({'opacity':0},ps.duration/2,function(){
							SlideTransitionFisnished();
						});
					}
					// coverLeft, coverRight
					else if(effect=='coverLeft'||effect=='coverRight') {
						var width=defaults.width>0?defaults.width:ps_canvas.width();
						var height=defaults.height>0?defaults.height:newimg[0].height;
						newimg_wrap.css({'left':ps.effect=='coverLeft'?ps_canvas.width():-width,
									'top':0,
									'opacity':1,'z-index':2})
							.animate({'left':0},ps.duration,function(){
								if(preimg_wrap.length==0)
									SlideTransitionFisnished();
							});

						preimg_wrap.delay(ps.duration/2).animate({'opacity':0},ps.duration/2,function(){
							SlideTransitionFisnished();
						});
					}
					// box1
					else if(effect=='box1') {
						var duration=ps.duration*ps.boxEffectDurationFactor;
						var box=newimg_wrap.find('.pisonSlider-imgbox').css('opacity',0);
						newimg_wrap.css('opacity',1);

						box.each(function(i){
							$(this).delay(i*duration/box.length).animate({'opacity':1},duration/3,function() {
								if(i==box.length-1)
									SlideTransitionFisnished();
							});
						});
					}
					// box2 _ left top to right bottom fadeout
					else if(effect=='box2') {
						var duration=ps.duration*ps.boxEffectDurationFactor;
						var box=newimg_wrap.find('.pisonSlider-imgbox').css('opacity',0);
						newimg_wrap.css('opacity',1);

						preimg_wrap.delay(duration/2).animate({'opacity':0},duration*2/3,function(){$(this).remove();});
						box.each(function(i){
							$(this).delay((Math.floor(i/h_cnt)+i%h_cnt)*duration/(h_cnt+v_cnt-1)).animate({'opacity':1},duration/2,function() {
								if(i==box.length-1) {
									SlideTransitionFisnished();
								}
							});
						});
					}
					// box3 _ random image box fadeout
					else if(effect=='box3') {
						var duration=ps.duration*ps.boxEffectDurationFactor;
						var box=newimg_wrap.find('.pisonSlider-imgbox').css('opacity',0);
						newimg_wrap.css('opacity',1);

						box.each(function(i){
							var rand = Math.floor(Math.random()*box.length);
							if(i==rand) return true;
							box.eq(rand).before($(this));
						});

						box=newimg_wrap.find('.pisonSlider-imgbox');

						box.each(function(i){
							$(this).delay(i*duration/box.length).animate({'opacity':1},duration/2,function() {
								if(i==box.length-1)
									SlideTransitionFisnished();
							});
						});
					}
					// no effect
					else {
						newimg_wrap.css('opacity',1);
						SlideTransitionFisnished();
					}

				},
				prevPage: function() { // page is thumbnail page
					this.pageChange(this.nowPage-1);
				},
				nextPage: function() {
					this.pageChange(this.nowPage+1);
				},
				// index from 0 to n-1
				// cached image element is DOM
				cacheImage: function(i) { // index from 0 to n-1
					// new image set
					var img = new Image;
					img.src=ps_thumbs_ul.find('li:eq('+i+')').data('origin');
					img.complete; //i don't know why, this line needed for Internet Explorer

					// image loaded callback function
					var loadedCBInnerFn=function(cbfn){
						if($.isFunction(cbfn)) {
							img.loadedCBRun=cbfn;
							img.loadedCBRun(img.width,img.height);
							try{
								delete img.loadedCBRun;
						    }catch(e){}
						}
						img.originalSize={width:img.width,height:img.height};
					}
					img.loadedCB=function(cbfn) {
						if(img.complete) {
							loadedCBInnerFn(cbfn);
						} else {
							img.onload=function() {
								loadedCBInnerFn(cbfn);
							};
						}
					};

					// image default position, use after loaded
					img.cssPosition=function() {
						var css={};

						//
						// widthfit mode
						if(ps.mode=='widthfit' || ps.mode=='stretch') {
							//css.width=defaults.width;
							css.width = defaults.width>0 ? defaults.width : ps_canvas.width();
							css.height=css.width*this.height/this.width;
							css.left=0;
							css.top=0;

							if(defaults.height) {
								var height=ps_canvas.width()*this.height/this.width;
								// change height
								if(height>defaults.height) {
									css.height=defaults.height;
									css.width=defaults.height*this.width/this.height;
									css.left=(ps_canvas.width()-css.width)/2;
								}
							}
							//
							// stretch mode
							if(ps.mode=='stretch') {
								css.top=0;
								var height=defaults.height;
								if(css.width=='100%')
									height=ps_canvas.width()*this.height/this.width;
								css.top=(ps_canvas.height()-height)/2;
							}
						}
						//
						// filled mode
						else if(ps.mode=='filled'||ps.mode=='zoomin') {
							var i_rate=this.width/this.height;
							// cut left, right
							if(i_rate > defaults.width/defaults.height) {
								css.height=defaults.height;
								css.width=i_rate*css.height;
								css.left=(defaults.width-css.width)/2;
								css.top=0;
							}
							// cut top, bottom
							else {
								css.width=defaults.width;
								css.height=css.width/i_rate;
								css.top=(defaults.height-css.height)/2;
								css.left=0;
							}
						}
						//
						// default
						else {
							css.width='100%';
						}

						// rounding
						if(css.top && css.top!=0) css.top=Math.floor(css.top);
						if(css.left && css.left!=0) css.left=Math.floor(css.left);
						if(css.height && !isNaN(css.height)) css.height=Math.ceil(css.height);
						if(css.width && !isNaN(css.width)) css.width=Math.ceil(css.width);

						return css;
					}

					org_imgs[i] = img;
				},
				slideChange: function(num) {
					if($.isFunction(ps.beforeSlideChange))
						ps.beforeSlideChange(this.nowSlide, num);

					// need thumbnail page change??
					if(this.nowPage*this.numThumbs > num || num >= (this.nowPage+1)*this.numThumbs)
						this.pageChange(parseInt(num/this.numThumbs), false);

					// go to first thumbnail page when num is larger then last slide number
					if(num >= ps_thumbs_ul.find('li').length) {
						this.slideChange(0);
						return;
					}

					// current thumbnail image modifying
					ps_thumbs_ul.find('li.current').removeClass('current');

					// new thumbnail image modifying
					ps_thumbs_ul.find('li:eq('+num+')').addClass('current');

					// load cached image
					if(typeof org_imgs[num] == 'undefined' || org_imgs[num].width==0)
						this.cacheImage(num);

					var newimg = $(org_imgs[num]);

					// set longest Height
					newimg[0].loadedCB(function(w,h) {
						// image transition
						ps.SlideTransition(num, ps.SlideLoaded);
					});

					// thumbnail part size change
					if(ps.width==0&&(defaults.thumbPosition=='left'||defaults.thumbPosition=='right')) {
						ps_thumbs.width(ps.fullWidth()-ps_canvas.fullWidth());
					}

					// set current slide
					this.nowSlide = num;

					// link blank
					ps_canvas.find('a.pisonSlider-canvas-anchor').remove();
					if(ps.clickAction=='link_blank' && ps_thumbs_ul.find('li:eq('+num+')').data('ps_href')) {
						ps_canvas.find('div.pisonSlider-canvas-clickarea').append('<a href="'+ps_thumbs_ul.find('li:eq('+num+')').data('ps_href')+'" target="_blank" class="pisonSlider-canvas-anchor" />')
					}

					// indicator change
					if(ps.indicator) {
						ps_canvas.find('div.pisonSlider-canvas-indicator.active').removeClass('active')
						ps_canvas.find('div.pisonSlider-canvas-indicator:eq('+num+')').addClass('active');
					}

					// auto slide ready
					if(ps.autoSlide) {
						ps_canvas.find('div.pisonSlider-canvas-autoSlideBar').stop().css('width','0%').animate({'width':'100%'},ps.autoSlideTimer,'linear',function(){
							ps.nextSlide();
						});
					}

					// next slide preloading
					if(typeof org_imgs[num+1] == 'undefined' && num+1 < ps_thumbs_ul.find('li').length)
						this.cacheImage(num+1);
				},
				ErrMsg: function(msg) {
					ps.append('<div class="pisonSlider-ErrorMsg">pisonSlider: '+msg+'</div>');
				}
			});

			//
			// start initialize
			//

			// message
			if(ps.mode=='stretch' && ps.height<=0) {
				ps.ErrMsg('Stretch mode required height');
				ps.mode='widthfit';
			} else if(ps.mode=='filled' && (!ps.height || !ps.width)) {
				ps.ErrMsg('Filled mode required height and width');
				ps.mode='widthfit';
			} else if(ps.mode=='zoomin' && (!ps.height || !ps.width)) {
				ps.ErrMsg('Zoomin mode required height and width');
				ps.mode='widthfit';
			}

			// set canvas size
			var dynamic_height=false;
			if(ps.width>0)
				ps_canvas.width(ps.width);
			// canvas size by mode
			if(ps.mode=='widthfit')
				dynamic_height=true;
			else if(ps.mode=='stretch' || ps.mode=='filled' || ps.mode=='zoomin')
				ps_canvas.height(ps.height);

			// thumbnail link init
			ps_thumbs_ul.find('li').each(function(n){
				// list indexing
				$(this).data('index',n);

				var img = $(this).find('img');
				// set thumbnails
				if(typeof $(this).data('thumb')=='undefined' && typeof img.data('thumb')!='undefined') // use img data-thumb than copy this data to li data-thumb
					$(this).data('thumb',img.data('thumb'));
				if(typeof $(this).data('thumb')!='undefined') // has thumbnail than replace img
					img.attr('src',$(this).data('thumb'));

				// link check
				if($(this).find('a img').length>0) {
					$(this).data('ps_href',$(this).find('a img').parent().attr('href'));
					$(this).find('a img').unwrap();
				}

				if(underIE8 && ps.thumbHeight>0 && img[0].height>0) {
					// fit by height
					if(ps.thumbWidth/ps.thumbHeight<img[0].width/img[0].height) {
						img.css({'margin-left':(ps.thumbWidth-img[0].width/img[0].height*ps.thumbHeight)/2,'height':ps.thumbHeight});
					}
					// fit by width
					else {
						img.css({'margin-top':(ps.thumbHeight-img[0].height/img[0].width*ps.thumbWidth)/2,'width':ps.thumbWidth});
					}
				}
				// IE9, Chrome, Safari, Firefox, Etc...
				else {
					$(this).css('background-image',"url('"+img.attr('src')+"')").empty();
				}

				if(ps.useThumbSize) { // resizing thumbnail image
					$(this).css({width:ps.thumbWidth,height:ps.thumbHeight});
				}

				$(this).bind(ps.thumbSlideEvent,function(){ ps.slideChange(n); });
			});

			// page arrow init
			ps_thumbs_left_arrow.click(function(){ps.prevPage();});
			ps_thumbs_right_arrow.click(function(){ps.nextPage();});

			// canvas positioning
			ps_canvas.find('div.pisonSlider-canvas-clickarea').mousedown(function(e){
				if(e.target.className!='pisonSlider-canvas-clickarea') {
					e.stopPropagation();
					return false;
				}
				// only mouse left button
				if(e.button>1) return;
				else if(ps.clickAction=='link_blank' && typeof org_imgs[ps.nowSlide].ps_href!='undefined')
					return;

				ps.nextSlide();
			});
			if(ps.mode=='zoomin'&&ps.zoominMouseOverStop) {
				ps_canvas.find('div.pisonSlider-canvas-clickarea').hover(function(){
					zoomin_interval_stop=true;
				},function(){
					zoomin_interval_stop=false;
				});
			}

			// indicator
			if(ps.indicator) {
				var idc='<div class="pisonSlider-canvas-indicatorWrap">';
				for(var i=0;i<ps.totalSlideCnt;i++) {
					idc+='<div class="pisonSlider-canvas-indicator" data-index="'+i+'" />';
				}
				idc+='</div>';
				idc=$(idc);
				ps_canvas.find('div.pisonSlider-canvas-clickarea').append(idc);
				idc.find('div.pisonSlider-canvas-indicator').click(function(){
					ps.slideChange($(this).data('index'));
					if(defaults.onHoverStop)
						ps_canvas.find('div.pisonSlider-canvas-autoSlideBar').stop();
				});
			}

			// auto slide check
			if(ps.autoSlide) {
				var bar='<div class="pisonSlider-canvas-autoSlideBar'+(ps.autoSlideBarPosition=='top'?' pisonSlider-canvas-autoSlideBar-top':'')+'" />';
				ps_canvas.find('div.pisonSlider-canvas-clickarea').append(bar);

				if(defaults.onHoverStop) {
					ps_canvas.hover(function(){
						ps_canvas.find('div.pisonSlider-canvas-autoSlideBar').stop();
					},function() {
						var remain=(1-ps_canvas.find('div.pisonSlider-canvas-autoSlideBar').width() / $(this).width()) * ps.autoSlideTimer;
						ps_canvas.find('div.pisonSlider-canvas-autoSlideBar').animate({'width':'100%'},remain,'linear',function(){
							ps.nextSlide();
						});
					});
				}
			}

			// set start page
			ps.pageChange(0);

			// set start slide
			ps.slideChange(defaults.startSlideIndex);


			//
			// window resize trigger(not run when setted width)
			if(defaults.width==0) {
				$(window).bind('resize.pisonSlider',function() {
					// var img=$(org_imgs[ps.nowSlide]);
					// img.css(img[0].cssPosition());
					// // widthfit mode
					// if(ps.mode=='widthfit')
					// 	ps_canvas.height(img.height());

					// box position fixing
					proc.pixelFixing(ps_canvas.find('div.pisonSlider-img-wrap:last'));
				});
			}

			return ps;
		}
	});
})(jQuery);
