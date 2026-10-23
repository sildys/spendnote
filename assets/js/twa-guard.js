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
