// Auth Guard - Redirect to login if not authenticated
// This script should be included on all app pages (not on public pages like index, login, signup)

(async function() {
    try {
        const path = String(window.location.pathname || '').toLowerCase();
        const file = path.split('/').filter(Boolean).pop() || '';
        const isReceiptTemplate =
            file.startsWith('spendnote-') &&
            file.includes('receipt') &&
            (file.includes('pdf') || file.includes('email') || file.includes('a4'));
        const sp = new URLSearchParams(window.location.search);
        const hasPublicToken = sp.has('publicToken');
        const isDemo = sp.get('demo') === '1';
        if (isReceiptTemplate && (hasPublicToken || isDemo)) {
            return;
        }
    } catch (_) {
        // ignore
    }

    if (!window.supabaseClient) {
        window.location.href = '/spendnote-login.html';
        return;
    }

    // Check if user is authenticated
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (!session || error) {
        // Not authenticated - redirect to login
        window.location.href = '/spendnote-login.html';
    }
})();
