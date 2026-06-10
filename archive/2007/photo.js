// Simple Animated Tooltip Class by Daybreaker
// It's free to copy/redistribute/use this script.
// (depends on prototype.js, moo.fx.js)
var Tooltip = Class.create();
Tooltip.prototype = {
	initialize: function(el_link, el_tip) {
		this.element = $(el_link);
		this.tip = $(el_tip);
		this.text = this.element.getProperty('title');
		this.element.setProperty('title', '');
		this.effect = new fx.Opacity(this.tip, {duration: 300});
		this.effect.hide();
		this.flag = false;
		this.element.onmouseover = this.showTip.bindAsEventListener(this);
		this.element.onmouseout = this.hideTip.bindAsEventListener(this);
		$('wrap').addEvent('mousemove', this.moveTip.bindAsEventListener(this));
	},

	showTip: function(ev) {
		this.tip.innerHTML = this.text;
		this.effect.custom(0, 0.75);
		this.flag = true;
	},

	hideTip: function(ev) {
		if (this.flag) {
			this.effect.clearTimer();
			this.effect.hide();
			this.flag = false;
		}
	},

	moveTip: function(ev) {
		if (this.flag) {
			var doc = document.documentElement;
			var p = {x: ev.clientX + doc.scrollLeft, y: ev.clientY + doc.scrollTop};
			this.tip.setStyles({'left': (p.x + 5) + 'px', 'top': (p.y + 25) + 'px'});
		}
	}
}

function fadeIn(event) {
	this.fx.clearTimer();
	this.fx.goTo(1.0);
}

function fadeOut(event) {
	this.fx.clearTimer();
	this.fx.goTo(0.6);
}

var elTip;
var tips = [];

window.onload = function() {
	var els = $$('.photo img');
	for (i in els) {
		if (els[i].tagName == undefined) continue;
		var img = els[i];
		img.fx = new Fx.Style(img, 'opacity', {duration: 300}).set(0.35);
		img.onmouseover = fadeIn.bindAsEventListener(img);
		img.onmouseout = fadeOut.bindAsEventListener(img);
	}
	elTip = document.createElement('div');
	$(elTip).addClassName('tooltip');
	document.body.appendChild(elTip);
	els = document.getElementsByTagName('a');
	for (i in els) {
		if (els[i] == null || els[i] == undefined || els[i].tagName == undefined) continue;
		t = (els[i].getAttribute('title'));
		if (t == '' || t == null) continue;
		tips.push(new Tooltip(els[i], elTip));
	}
}.bindAsEventListener(window);
