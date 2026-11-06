// Puts on-screen signatures (070) on the receipt's signature lines.
// .signature blocks alternate Issued by (from) / Received by (to); the two-copy
// print has two pairs. Each template styles .sn-sig-img and .sn-sig-meta.
(function () {
    'use strict';

    function formatSignedAt(iso) {
        const d = iso ? new Date(iso) : null;
        if (!d || Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function metaText(sig, partyName) {
        const name = String(sig.signer_name || '').trim();
        const party = String(partyName || '').trim();
        const forPart = party && party !== '-' && party !== name ? ` · for ${party}` : '';
        const when = formatSignedAt(sig.signed_at);
        return `${name}${forPart} · Signed on screen${when ? ' · ' + when : ''}`;
    }

    /**
     * @param {object} tx
     * @param {{ fromName?: string, toName?: string, imageInside?: boolean }} options
     *   imageInside: put the image inside the line element (PDF) instead of right before it (two-copy print).
     * @returns {Promise<number>} number of signatures placed
     */
    async function render(tx, options) {
        const opts = options || {};
        if (!tx?.id || !window.db?.signatures?.listForTransaction) return 0;
        let sigs = [];
        try {
            sigs = await window.db.signatures.listForTransaction(tx.id);
        } catch (_) {
            return 0;
        }
        if (!sigs.length) return 0;

        const bySide = { from: sigs.find((s) => s.side === 'from'), to: sigs.find((s) => s.side === 'to') };
        const names = { from: opts.fromName, to: opts.toName };

        // A signed receipt never prints as unsigned, even if the signature lines were switched off.
        document.querySelectorAll('.signatures').forEach((el) => { el.style.display = ''; });

        let placed = 0;
        document.querySelectorAll('.signature').forEach((block, index) => {
            const side = index % 2 === 0 ? 'from' : 'to';
            const sig = bySide[side];
            block.querySelectorAll('.sn-sig-img, .sn-sig-meta').forEach((el) => el.remove());
            if (!sig) return;

            const line = block.querySelector('.signature-line, .line');
            const img = document.createElement('img');
            img.className = 'sn-sig-img';
            img.alt = `Signature of ${sig.signer_name || ''}`;
            img.src = sig.signature_png;

            const meta = document.createElement('div');
            meta.className = 'sn-sig-meta';
            meta.textContent = metaText(sig, names[side]);

            if (line && opts.imageInside) {
                line.appendChild(img);
                line.insertAdjacentElement('afterend', meta);
            } else if (line) {
                line.insertAdjacentElement('beforebegin', img);
                line.insertAdjacentElement('afterend', meta);
            } else {
                block.appendChild(img);
                block.appendChild(meta);
            }
            block.classList.add('sn-signed');
            placed++;
        });

        // html2canvas needs decoded images.
        await Promise.all(Array.from(document.querySelectorAll('.sn-sig-img')).map((img) => (
            img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })
        )));
        return placed;
    }

    window.spendnoteRenderReceiptSignatures = render;
})();
