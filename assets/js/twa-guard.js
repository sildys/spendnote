// Sign-up source: same capture as in supabase-config.js (pages load one of the two files).
// Runs first, so the Android app redirect below cannot skip it.
(function () {
    try {
        if (sessionStorage.getItem('sn.firstTouch')) return;
        const params = new URLSearchParams(window.location.search);
        const rawRef = String(document.referrer || '');
        let ref = '';
        if (rawRef.startsWith('android-app://')) {
            ref = 'android-app';
        } else if (rawRef) {
            try {
                const h = new URL(rawRef).hostname.toLowerCase();
                if (h && h !== 'spendnote.app' && !h.endsWith('.spendnote.app')) ref = h;
            } catch (_) {}
        }
        const touch = { ref, landing: String(window.location.pathname || '/'), at: new Date().toISOString() };
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
            const v = params.get(k);
            if (v) touch[k] = String(v).slice(0, 100);
        });
        if (params.get('gclid')) touch.paid = 'google';
        else if (params.get('msclkid')) touch.paid = 'microsoft';
        if (params.get('source') === 'twa' || ref === 'android-app') touch.twa = true;
        sessionStorage.setItem('sn.firstTouch', JSON.stringify(touch));
    } catch (_) {}
})();

// Marketing pages show prices and lead to the web checkout, which Google Play forbids inside
// the Android app, so the app sends them to the dashboard. Same flag as supabase-config.js.
(function () {
    try {
        const fromTwa = new URLSearchParams(window.location.search).get('source') === 'twa'
            || String(document.referrer || '').startsWith('android-app://');
        if (fromTwa) sessionStorage.setItem('sn.twa', '1');
        if (sessionStorage.getItem('sn.twa') === '1') window.location.replace('/dashboard');
    } catch (_) {
        // ignore
    }
})();
