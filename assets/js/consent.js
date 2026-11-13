// Analytics consent and loading for every page: Google Analytics, Microsoft Clarity and the
// Microsoft Advertising (UET) tag. Visitors in the EEA, UK and Switzerland get none of them
// until they choose "Accept All"; elsewhere they load right away (Privacy Policy, Section 9).
// Skipped entirely on the owner's own devices (sn.internal, set in supabase-config.js).
// Clarity and UET never run inside the Android app. main.js reuses window.SpendNoteConsent.
(function () {
    var STORAGE_KEY = 'spendnote.cookieConsent.v1';
    var GA_ID = 'G-QPFM30F86Q';
    var CLARITY_ID = 'vqin4v9ift';
    var UET_ID = '343258687';
    var STRICT = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
        'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
        'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH', 'GB'];

    // Page code calls gtag() for events; queued calls stay local until Analytics is allowed.
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
        window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);

    function safe(fn, fallback) {
        try { return fn(); } catch (_) { return fallback; }
    }

    safe(function () {
        var m = location.search.match(/[?&]sn_internal=([01])/);
        if (m) {
            if (m[1] === '1') localStorage.setItem('sn.internal', '1');
            else localStorage.removeItem('sn.internal');
        }
    });

    var internal = safe(function () { return localStorage.getItem('sn.internal') === '1'; }, false);
    var inApp = safe(function () {
        return /[?&]source=twa(&|$)/.test(location.search)
            || document.referrer.indexOf('android-app://') === 0
            || sessionStorage.getItem('sn.twa') === '1';
    }, false);

    function readState() {
        return safe(function () {
            var p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!p || typeof p !== 'object') return null;
            return {
                analytics: p.analytics === true,
                regionMode: p.regionMode === 'strict' ? 'strict' : 'open',
                country: String(p.country || '').trim().toUpperCase()
            };
        }, null);
    }

    function writeState(s) {
        safe(function () {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                analytics: s.analytics === true,
                regionMode: s.regionMode === 'strict' ? 'strict' : 'open',
                country: s.country || '',
                savedAt: Date.now()
            }));
        });
    }

    function detectCountry() {
        var trace = fetch('/cdn-cgi/trace', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (r) { return r.ok ? r.text() : ''; })
            .then(function (body) {
                var m = String(body || '').match(/(?:^|\n)loc=([A-Z]{2})(?:\n|$)/);
                return m ? m[1] : '';
            })
            .catch(function () { return ''; });
        var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(''); }, 1600); });
        return Promise.race([trace, timeout]);
    }

    function addScript(src) {
        var s = document.createElement('script');
        s.async = true;
        s.src = src;
        (document.head || document.documentElement).appendChild(s);
    }

    var loaded = false;
    function loadTags(strict) {
        if (loaded || internal) return;
        loaded = true;

        addScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID);

        if (inApp) return;

        window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
        if (strict) window.clarity('consentv2', { ad_Storage: 'granted', analytics_Storage: 'granted' });
        addScript('https://www.clarity.ms/tag/' + CLARITY_ID);

        // Official UET loader, unchanged.
        (function(w,d,t,u,o){w[u]=w[u]||[],o.ts=(new Date).getTime();var n=d.createElement(t);n.src="https://bat.bing.net/bat.js?ti="+o.ti+("uetq"!=u?"&q="+u:""),n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&"loaded"!==s&&"complete"!==s||(o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad"),n.onload=n.onreadystatechange=null)};var i=d.getElementsByTagName(t)[0];i.parentNode.insertBefore(n,i)})(window,document,"script","uetq",{ti:UET_ID,enableAutoSpaTracking:true});
    }

    function ensureStyles() {
        if (document.getElementById('snConsentStyles')) return;
        var style = document.createElement('style');
        style.id = 'snConsentStyles';
        style.textContent = [
            '.sn-consent-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;gap:12px;padding:14px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.18);color:#0f172a;font-size:13px;line-height:1.45;font-family:inherit;}',
            '.sn-consent-banner strong{font-size:14px;}',
            '.sn-consent-actions{display:flex;gap:8px;flex-wrap:wrap;}',
            '.sn-consent-btn{border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer;font-family:inherit;font-size:13px;}',
            '.sn-consent-banner a{color:#059669;text-decoration:underline;}',
            '@media (max-width:640px){.sn-consent-banner{left:10px;right:10px;bottom:10px;}.sn-consent-btn{width:100%;}}'
        ].join('');
        document.head.appendChild(style);
    }

    function showBanner(onDecision) {
        var start = function () {
            var old = document.getElementById('snConsentBanner');
            if (old) old.remove();
            ensureStyles();
            var banner = document.createElement('div');
            banner.id = 'snConsentBanner';
            banner.className = 'sn-consent-banner';
            banner.innerHTML = '<div><strong>Cookie Settings</strong><br>'
                + 'We use essential cookies to operate SpendNote. Analytics cookies help us improve the service and are only enabled with your consent. '
                + '<a href="/spendnote-privacy#cookies">Learn more</a></div>'
                + '<div class="sn-consent-actions">'
                + '<button type="button" class="sn-consent-btn" data-consent="necessary">Essential Only</button>'
                + '<button type="button" class="sn-consent-btn" data-consent="all">Accept All</button>'
                + '</div>';
            banner.querySelectorAll('button[data-consent]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    banner.remove();
                    onDecision(btn.getAttribute('data-consent') === 'all');
                });
            });
            document.body.appendChild(banner);
        };
        if (document.body) start();
        else document.addEventListener('DOMContentLoaded', start, { once: true });
    }

    var api = {
        _state: null,
        _initPromise: null,

        init: function () {
            if (this._initPromise) return this._initPromise;
            var self = this;
            this._initPromise = (async function () {
                var stored = readState();
                if (stored) {
                    self._state = stored;
                } else {
                    var country = await detectCountry();
                    if (STRICT.indexOf(country) === -1) {
                        self._state = { analytics: true, regionMode: 'open', country: country };
                        writeState(self._state);
                    } else {
                        self._state = { analytics: false, regionMode: 'strict', country: country, pending: true };
                    }
                }

                if (self._state.analytics) {
                    loadTags(self._state.regionMode === 'strict');
                    return self._state;
                }
                if (!self._state.pending) return self._state;

                await new Promise(function (resolve) {
                    showBanner(function (allow) {
                        self._state = { analytics: allow, regionMode: 'strict', country: self._state.country };
                        writeState(self._state);
                        if (allow) loadTags(true);
                        resolve();
                    });
                });
                return self._state;
            })();
            return this._initPromise;
        },

        canLoadAnalytics: function () {
            return Boolean(this._state && this._state.analytics === true);
        },

        reopenConsentBanner: function () {
            var self = this;
            var prev = this._state || {};
            showBanner(function (allow) {
                self._state = { analytics: allow, regionMode: prev.regionMode || 'strict', country: prev.country || '' };
                writeState(self._state);
                if (allow) loadTags(self._state.regionMode === 'strict');
                else window.location.reload();
            });
        }
    };

    window.SpendNoteConsent = api;
    api.init();
})();
