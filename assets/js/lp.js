(function () {
    var lp = document.body.getAttribute('data-lp') || 'unknown';

    document.querySelectorAll('[data-cta]').forEach(function (el) {
        el.addEventListener('click', function () {
            if (typeof gtag === 'function') {
                gtag('event', 'lp_cta_click', { lp: lp, position: el.getAttribute('data-cta') });
            }
        });
    });

    var items = document.querySelectorAll('.rv');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        items.forEach(function (el) { io.observe(el); });
    } else {
        items.forEach(function (el) { el.classList.add('in'); });
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('video[data-src]').forEach(function (v) {
        function load() { if (!v.getAttribute('src')) v.src = v.getAttribute('data-src'); }
        if (reduceMotion) { v.controls = true; v.preload = 'metadata'; load(); return; }
        if (!('IntersectionObserver' in window)) { load(); v.play().catch(function () {}); return; }
        new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                load();
                var p = v.play();
                if (p && p.catch) p.catch(function () {});
            } else {
                v.pause();
            }
        }, { threshold: 0.25 }).observe(v);
    });

    var mCta = document.getElementById('mCta');
    var hero = document.querySelector('.hero');
    var final = document.querySelector('.final');
    var mLink = mCta && mCta.querySelector('a[href^="#"]');
    var mTarget = mLink && document.querySelector(mLink.getAttribute('href'));
    if (mCta && hero) {
        var onScroll = function () {
            var pastHero = hero.getBoundingClientRect().bottom < 0;
            var atFinal = final && final.getBoundingClientRect().top < window.innerHeight;
            var t = mTarget && mTarget.getBoundingClientRect();
            var atTarget = t && t.top < window.innerHeight && t.bottom > 0;
            mCta.classList.toggle('show-it', pastHero && !atFinal && !atTarget);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
})();
