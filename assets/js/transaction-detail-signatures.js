// Signatures card on the transaction detail page (070).
// Wraps window.onTransactionDetailDataLoaded, so it must load after
// transaction-detail-ui.js and before transaction-detail-data.js.
(function () {
    'use strict';

    const esc = (v) => (typeof window.spendnoteEscapeHtml === 'function')
        ? window.spendnoteEscapeHtml(v)
        : String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const state = {
        tx: null,
        profile: null,
        myName: '',
        signatures: [],
        saved: null,
        busy: false
    };

    function formatAmount(tx) {
        const amount = Number(tx?.amount || 0);
        const currency = String(tx?.cash_box_currency_snapshot || tx?.cash_box?.currency || 'USD').toUpperCase();
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
        } catch (_) {
            return `${amount.toFixed(2)} ${currency}`;
        }
    }

    function formatSignedAt(iso) {
        const d = iso ? new Date(iso) : null;
        if (!d || Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function companyName() {
        const snap = String(state.tx?.sender_company_name_snapshot || '').trim();
        if (snap) return snap;
        try {
            if (typeof window.spendnoteReceiptProfileDisplayName === 'function') {
                return String(window.spendnoteReceiptProfileDisplayName(state.profile) || '').trim();
            }
        } catch (_) {}
        return String(state.profile?.company_name || '').trim();
    }

    function contactName() {
        return String(state.tx?.contact_name || state.tx?.contact?.name || '').trim();
    }

    // OUT (expense): the workspace gives the cash -> Issued by (from). IN: the contact gives it.
    function workspaceSide() {
        return String(state.tx?.type || '').toLowerCase() === 'expense' ? 'from' : 'to';
    }

    function slotFor(side) {
        const party = side === workspaceSide() ? 'workspace' : 'contact';
        return {
            side,
            party,
            label: side === 'from' ? 'Issued by' : 'Received by',
            partyName: party === 'workspace' ? companyName() : contactName(),
            signature: state.signatures.find((s) => s.side === side) || null
        };
    }

    function isSignable() {
        const tx = state.tx;
        if (!tx) return false;
        if (tx.is_system) return false;
        return String(tx.status || 'active').toLowerCase() === 'active';
    }

    function renderSlot(slot) {
        const sig = slot.signature;
        const who = slot.party === 'workspace'
            ? (slot.partyName ? `${esc(slot.partyName)} <span class="tx-sign-party-tag">you</span>` : 'You')
            : (slot.partyName ? esc(slot.partyName) : 'Contact');

        let body;
        if (sig) {
            const sameAsParty = slot.partyName && slot.partyName === sig.signer_name;
            const nameLine = sameAsParty ? '' : `<div class="tx-sign-name">${esc(sig.signer_name)}${slot.partyName ? ` · for ${esc(slot.partyName)}` : ''}</div>`;
            body = `
                <div class="tx-sign-image"><img alt="Signature of ${esc(sig.signer_name)}" src="${esc(sig.signature_png)}"></div>
                ${nameLine}
                <div class="tx-sign-meta"><i class="fas fa-check-circle"></i> Signed on screen · ${esc(formatSignedAt(sig.signed_at))}</div>`;
        } else if (isSignable()) {
            const btnLabel = slot.party === 'workspace'
                ? `Sign as ${esc(state.myName || 'me')}`
                : `${esc(slot.partyName || 'Contact')} signs`;
            body = `
                <div class="tx-sign-empty">Not signed yet</div>
                <button type="button" class="btn btn-primary tx-sign-btn" data-sign-side="${slot.side}"><i class="fas fa-signature"></i> ${btnLabel}</button>`;
        } else {
            body = '<div class="tx-sign-empty">Not signed</div>';
        }

        return `
            <div class="tx-sign-slot${sig ? ' signed' : ''}">
                <div class="tx-sign-label">${esc(slot.label)}</div>
                <div class="tx-sign-party">${who}</div>
                ${body}
            </div>`;
    }

    function render() {
        const card = document.getElementById('txSignCard');
        if (!card || !state.tx) return;
        const slots = [slotFor('from'), slotFor('to')];
        const count = slots.filter((s) => s.signature).length;
        if (count > 0 && typeof window.spendnoteTxLockSignedReceipt === 'function') window.spendnoteTxLockSignedReceipt();

        const status = document.getElementById('txSignStatus');
        if (status) {
            status.textContent = count === 2 ? 'Signed' : (count === 1 ? '1/2 signed' : '');
            status.className = 'tx-sign-status' + (count === 2 ? ' full' : (count === 1 ? ' partial' : ''));
        }

        const wrap = document.getElementById('txSignSlots');
        if (wrap) wrap.innerHTML = slots.map(renderSlot).join('');
        card.hidden = false;
    }

    function summaryHtml() {
        const tx = state.tx;
        const desc = String(tx?.description || '').trim();
        const fromName = slotFor('from').partyName;
        const toName = slotFor('to').partyName;
        return `
            <div class="amt">${esc(formatAmount(tx))}</div>
            <div>${esc(fromName || '—')} &rarr; ${esc(toName || '—')}</div>
            ${desc ? `<div>${esc(desc)}</div>` : ''}`;
    }

    async function sign(side) {
        if (state.busy || !window.SpendNoteSignaturePad || !window.db?.signatures) return;
        const slot = slotFor(side);
        if (slot.signature) return;
        const isMine = slot.party === 'workspace';

        if (isMine && state.saved === null) {
            try { state.saved = (await window.db.signatures.getSaved()) || false; } catch (_) { state.saved = false; }
        }

        const company = companyName();
        const result = await window.SpendNoteSignaturePad.open({
            title: `${slot.label}: ${isMine ? 'your signature' : (slot.partyName || 'contact')}`,
            subtitle: isMine && company ? `Signing for ${company}` : '',
            summaryHtml: summaryHtml(),
            defaultName: isMine ? state.myName : slot.partyName,
            nameLocked: isMine && Boolean(state.myName),
            savedSignaturePng: isMine && state.saved ? state.saved.signature_png : '',
            privacyNote: !isMine && company ? `Your signature is stored with this receipt by ${company}.` : ''
        });
        if (!result) return;

        state.busy = true;
        try {
            const res = await window.db.signatures.create({
                transactionId: state.tx.id,
                party: slot.party,
                method: result.method,
                signerName: result.name,
                signaturePng: result.png
            });
            if (!res.success) {
                const msg = window.SpendNoteSignaturePad.errorMessage(res.code);
                if (typeof showAlert === 'function') showAlert(msg, { iconType: 'warning' });
                if (res.code === 'SIGNATURE_ALREADY_SIGNED') await reload();
                return;
            }
            state.signatures = state.signatures.filter((s) => s.side !== res.data.side).concat(res.data);
            render();
            if (typeof window.spendnoteTxReloadReceiptPreview === 'function') window.spendnoteTxReloadReceiptPreview();
        } finally {
            state.busy = false;
        }
    }

    async function reload() {
        if (!state.tx?.id || !window.db?.signatures) return;
        state.signatures = await window.db.signatures.listForTransaction(state.tx.id);
        render();
    }

    async function init(tx, profile) {
        state.tx = tx || null;
        state.profile = profile || null;
        if (!state.tx?.id) return;
        try {
            const me = await window.db?.profiles?.getCurrent?.();
            state.myName = String(me?.full_name || '').trim();
        } catch (_) {
            state.myName = '';
        }
        await reload();
    }

    const previous = window.onTransactionDetailDataLoaded;
    window.onTransactionDetailDataLoaded = function (payload) {
        if (typeof previous === 'function') previous(payload);
        init(payload?.tx, payload?.profile).catch((e) => {
            if (window.SpendNoteDebug) console.warn('[tx signatures] init failed', e);
        });
    };

    document.addEventListener('click', (ev) => {
        const btn = ev.target?.closest?.('[data-sign-side]');
        if (!btn) return;
        sign(btn.getAttribute('data-sign-side'));
    });
})();
