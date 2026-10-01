/* HARBEZ 2.0: меню, согласие на cookie и Метрика, появление блоков,
   подсветка линеек в каталоге, нижняя панель «Купить» на телефоне. */
(function () {
	'use strict';

	var cfg = window.HARBEZ || {};
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var hasIO = 'IntersectionObserver' in window;

	function store(key, value) {
		try {
			if (value === undefined) { return window.localStorage.getItem(key); }
			window.localStorage.setItem(key, value);
		} catch (e) { /* приватный режим — живём без памяти */ }
		return null;
	}

	/* ── Шапка: тень после прокрутки ── */
	var header = document.getElementById('site-header');
	function onScroll() {
		if (header) { header.classList.toggle('is-scrolled', window.scrollY > 8); }
	}
	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	/* ── Мобильное меню ── */
	var burger = document.querySelector('.burger');
	var menu = document.getElementById('mobile-menu');
	function setMenu(open) {
		if (!burger || !menu) { return; }
		burger.setAttribute('aria-expanded', String(open));
		menu.hidden = !open;
		document.body.classList.toggle('menu-open', open);
		document.querySelectorAll('main, .site-footer').forEach(function (el) { el.inert = open; });
		if (open) {
			var first = menu.querySelector('a');
			if (first) { first.focus(); }
		}
	}
	if (burger && menu) {
		burger.addEventListener('click', function () {
			setMenu(burger.getAttribute('aria-expanded') !== 'true');
		});
		menu.addEventListener('click', function (e) {
			if (e.target.closest('a')) { setMenu(false); }
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
			if (e.key === 'Tab' && !menu.hidden) {
				var items = menu.querySelectorAll('a, button');
				var last = items[items.length - 1];
				if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); burger.focus(); }
				if (e.shiftKey && document.activeElement === burger) { e.preventDefault(); last.focus(); }
			}
		});
		var wide = window.matchMedia('(min-width: 1025px)');
		var onWide = function (m) { if (m.matches) { setMenu(false); } };
		if (wide.addEventListener) { wide.addEventListener('change', onWide); } else if (wide.addListener) { wide.addListener(onWide); }
	}

	/* ── Согласие на cookie и Яндекс Метрика ── */
	var consent = document.getElementById('consent');
	var metrikaOn = false;
	function loadMetrika() {
		if (metrikaOn || !cfg.metrika) { return; }
		metrikaOn = true;
		var id = cfg.metrika;
		(function (m, e, t, r, i, k, a) {
			m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
			m[i].l = 1 * new Date();
			k = e.createElement(t); a = e.getElementsByTagName(t)[0];
			k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
		})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + id, 'ym');
		window.ym(id, 'init', {
			ssr: true, webvisor: true, clickmap: true, accurateTrackBounce: true,
			trackLinks: true, referrer: document.referrer, url: location.href
		});
	}
	function showConsent(show) {
		if (consent) { consent.hidden = !show; }
	}
	var choice = store('hz_consent');
	if (choice === 'yes') {
		loadMetrika();
	} else if (choice !== 'no') {
		showConsent(true);
	}
	var opener = null;
	function dropMetrikaCookies() {
		var host = location.hostname.replace(/^www\./, '');
		document.cookie.split(';').forEach(function (c) {
			var name = c.split('=')[0].trim();
			if (name.indexOf('_ym') === 0) {
				document.cookie = name + '=; Max-Age=0; path=/';
				document.cookie = name + '=; Max-Age=0; path=/; domain=.' + host;
			}
		});
	}
	document.addEventListener('click', function (e) {
		var btn = e.target.closest('[data-consent]');
		if (btn) {
			var yes = btn.getAttribute('data-consent') === 'yes';
			var wasOn = metrikaOn;
			store('hz_consent', yes ? 'yes' : 'no');
			showConsent(false);
			if (opener) { opener.focus(); opener = null; }
			if (yes) {
				loadMetrika();
			} else if (wasOn) {
				// Отзыв согласия действует сразу: убираем cookie Метрики и перезагружаем страницу без неё.
				dropMetrikaCookies();
				location.reload();
			}
			return;
		}
		var open = e.target.closest('[data-consent-open]');
		if (open) {
			opener = open;
			showConsent(true);
			var text = consent && consent.querySelector('p');
			if (text) { text.focus(); }
		}
	});

	/* ── Форма: звёздочка у обязательных полей ── */
	document.querySelectorAll('.wpcf7-form [aria-required="true"]').forEach(function (input) {
		var label = input.closest('label');
		if (!label || label.querySelector('.req')) { return; }
		var mark = document.createElement('span');
		mark.className = 'req';
		mark.setAttribute('aria-hidden', 'true');
		mark.textContent = ' *';
		var first = label.firstChild;
		if (first && first.nodeType === 3) {
			first.textContent = first.textContent.replace(/\s+$/, '');
			label.insertBefore(mark, first.nextSibling);
		}
	});

	/* ── Цели Метрики: переходы на площадки ── */
	document.addEventListener('click', function (e) {
		var link = e.target.closest ? e.target.closest('a[href]') : null;
		if (!link || typeof window.ym !== 'function' || !cfg.metrika) { return; }
		if (link.hostname.indexOf('ozon.ru') !== -1) {
			window.ym(cfg.metrika, 'reachGoal', 'ozon_click');
		} else if (link.hostname.indexOf('wildberries.ru') !== -1 || link.hostname.indexOf('wb.ru') !== -1) {
			window.ym(cfg.metrika, 'reachGoal', 'wb_click');
		}
	});

	/* ── Появление блоков: только то, что ниже первого экрана ── */
	if (!reduced && hasIO) {
		var targets = document.querySelectorAll(
			'.section-head, .lines-grid > *, .cards > *, .spotlight__media, .spotlight__text, .about__text, .about__media, .facts li, .texture, .contract__media, .contract__text, .post-card, .contacts__text, .form-card, .line-banner, .related h2, .other-lines'
		);
		var fold = window.innerHeight * 0.95;
		var io = new IntersectionObserver(function (entries) {
			var step = 0;
			entries.forEach(function (en) {
				if (!en.isIntersecting) { return; }
				var el = en.target;
				el.style.transitionDelay = Math.min(step * 70, 280) + 'ms';
				step++;
				el.classList.add('is-in');
				io.unobserve(el);
				// После появления убираем служебные классы — иначе они глушат hover-эффекты карточек.
				el.addEventListener('transitionend', function done(ev) {
					if (ev.propertyName !== 'opacity') { return; }
					el.classList.remove('reveal', 'is-in');
					el.style.transitionDelay = '';
					el.removeEventListener('transitionend', done);
				});
			});
		}, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
		targets.forEach(function (el) {
			if (el.getBoundingClientRect().top > fold) {
				el.classList.add('reveal');
				io.observe(el);
			}
		});
		// Страховка: если наблюдатель не сработал (печать, фон), через 4 с показываем всё.
		window.setTimeout(function () {
			document.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) {
				if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-in'); }
			});
		}, 4000);
	}

	/* ── Каталог: подсветка текущей линейки в ленте чипов ── */
	var chips = document.querySelectorAll('.chips .chip');
	if (chips.length && hasIO) {
		var byId = {};
		chips.forEach(function (c) { byId[c.getAttribute('href').slice(1)] = c; });
		var spy = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (!en.isIntersecting) { return; }
				chips.forEach(function (c) { c.classList.remove('is-active'); c.removeAttribute('aria-current'); });
				var chip = byId[en.target.id];
				if (chip) {
					chip.classList.add('is-active');
					chip.setAttribute('aria-current', 'true');
					var row = chip.parentNode;
					row.scrollTo({ left: chip.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
				}
			});
		}, { rootMargin: '-35% 0px -60% 0px' });
		document.querySelectorAll('.group[id]').forEach(function (g) { spy.observe(g); });
	}

	/* ── Товар на телефоне: панель «Купить», когда основные кнопки ушли из вида ── */
	var buybar = document.querySelector('.buybar');
	var buy = document.getElementById('buy');
	if (buybar && buy && hasIO) {
		// Панель видна, пока основных кнопок нет на экране (и до них, и после).
		new IntersectionObserver(function (entries) {
			var on = !entries[0].isIntersecting;
			buybar.classList.toggle('is-on', on);
			buybar.inert = !on;
		}).observe(buy);
	}
})();
