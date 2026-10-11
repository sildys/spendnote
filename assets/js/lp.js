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

    var mCta = document.getElementById('mCta');
    var hero = document.querySelector('.hero');
    var final = document.querySelector('.final');
    if (mCta && hero) {
        var onScroll = function () {
            var pastHero = hero.getBoundingClientRect().bottom < 0;
            var atFinal = final && final.getBoundingClientRect().top < window.innerHeight;
            mCta.classList.toggle('show-it', pastHero && !atFinal);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
})();
