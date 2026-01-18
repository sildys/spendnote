// Auth Guard - Redirect to login if not authenticated
// This script should be included on all app pages (not on public pages like index, login, signup)

(async function() {
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
