// "My signature" card on User settings (070 user_saved_signatures).
(function () {
    'use strict';

    let saved = null;
    let myName = '';

    const el = (id) => document.getElementById(id);

    function render() {
        const preview = el('mySignaturePreview');
        const auto = el('mySignatureAuto');
        const drawBtn = el('mySignatureDrawBtn');
        const delBtn = el('mySignatureDeleteBtn');
        if (!preview) return;

        preview.innerHTML = '';
        if (saved?.signature_png) {
            const img = document.createElement('img');
            img.alt = 'Your saved signature';
            img.src = saved.signature_png;
            preview.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.className = 'my-sig-empty';
            span.textContent = 'No saved signature yet.';
            preview.appendChild(span);
        }

        if (auto) {
            auto.disabled = !saved?.signature_png;
            auto.checked = Boolean(saved?.auto_sign);
        }
        if (drawBtn) drawBtn.innerHTML = `<i class="fas fa-signature"></i> ${saved?.signature_png ? 'Replace' : 'Draw signature'}`;
        if (delBtn) delBtn.style.display = saved?.signature_png ? '' : 'none';
    }

    async function draw() {
        if (!window.SpendNoteSignaturePad || !window.db?.signatures) return;
        if (!myName) {
            if (typeof showAlert === 'function') showAlert('Please add your full name in Profile first. It appears under your signature.', { iconType: 'info' });
            return;
        }
        const result = await window.SpendNoteSignaturePad.open({
            title: 'My signature',
            defaultName: myName,
            nameLocked: true,
            noteText: 'Saved to your account. It is only ever added to your own side of a receipt, and you can replace or delete it here at any time.',
            doneLabel: 'Save'
        });
        if (!result?.png) return;
        const res = await window.db.signatures.saveSaved({ signaturePng: result.png });
        if (!res.success) {
            if (typeof showAlert === 'function') showAlert('Your signature could not be saved. Please try again.', { iconType: 'error' });
            return;
        }
        saved = res.data;
        render();
    }

    async function remove() {
        const ok = typeof showConfirm === 'function'
            ? await showConfirm('Delete your saved signature? Receipts you already signed keep their signature.', { title: 'Delete signature', okLabel: 'Delete', danger: true, iconType: 'warning' })
            : window.confirm('Delete your saved signature?');
        if (!ok) return;
        const res = await window.db.signatures.deleteSaved();
        if (!res.success) {
            if (typeof showAlert === 'function') showAlert('Your signature could not be deleted. Please try again.', { iconType: 'error' });
            return;
        }
        saved = null;
        render();
    }

    async function toggleAuto(ev) {
        const want = Boolean(ev.target.checked);
        const res = await window.db.signatures.saveSaved({ autoSign: want });
        if (!res.success) {
            ev.target.checked = !want;
            if (typeof showAlert === 'function') showAlert('The setting could not be saved. Please try again.', { iconType: 'error' });
            return;
        }
        saved = res.data;
        render();
    }

    async function init() {
        if (!el('mySignatureCard') || !window.db?.signatures) return;
        el('mySignatureDrawBtn')?.addEventListener('click', draw);
        el('mySignatureDeleteBtn')?.addEventListener('click', remove);
        el('mySignatureAuto')?.addEventListener('change', toggleAuto);
        try {
            const me = await window.db.profiles.getCurrent();
            myName = String(me?.full_name || '').trim();
        } catch (_) {}
        try {
            saved = await window.db.signatures.getSaved();
        } catch (_) {
            saved = null;
        }
        render();
    }

    // Profile Save can change the name shown under the signature.
    document.addEventListener('submit', (ev) => {
        if (ev.target?.id !== 'profileForm') return;
        const v = String(el('profileFullName')?.value || '').trim();
        if (v) myName = v;
    }, true);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
