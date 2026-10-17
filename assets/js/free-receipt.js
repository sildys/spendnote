(function () {
    var root = document.getElementById('freeReceipt');
    if (!root) return;

    var lp = document.body.getAttribute('data-lp') || 'unknown';
    var STORE = 'sn_free_receipt_v1';
    var titles = { cash: 'Cash Receipt', deposit: 'Deposit Receipt', petty: 'Petty Cash Receipt' };
    var defaultTitle = root.getAttribute('data-title') || titles[root.getAttribute('data-kind')] || titles.cash;

    function track(name, params) {
        if (typeof gtag === 'function') {
            var p = params || {};
            p.lp = lp;
            gtag('event', name, p);
        }
    }

    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    root.innerHTML =
        '<div class="fr-grid">' +
            '<form class="fr-form" id="frForm" autocomplete="off" novalidate>' +
                '<div class="fr-row fr-row-keep">' +
                    '<div class="fr-field"><label for="fr-title">Receipt title</label><input id="fr-title" name="title" maxlength="40"></div>' +
                    '<div class="fr-field"><label for="fr-no">Receipt no.</label><input id="fr-no" name="no" maxlength="16"></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="fr-from">Received from (payer)</label><input id="fr-from" name="from" maxlength="60" placeholder="e.g. Jordan Blake"></div>' +
                    '<div class="fr-field"><label for="fr-to">Received by</label><input id="fr-to" name="to" maxlength="60" placeholder="e.g. Maria Lopez"></div>' +
                '</div>' +
                '<div class="fr-field"><label for="fr-for">For (description)</label><input id="fr-for" name="for" maxlength="90" placeholder="e.g. Cleaning, October 14"></div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="fr-amount">Amount</label><div class="fr-amount">' +
                        '<select id="fr-cur" name="cur" aria-label="Currency"><option value="$">$</option><option value="€">€</option><option value="£">£</option><option value="CA$">CA$</option><option value="A$">A$</option><option value="₹">₹</option><option value="">Other</option></select>' +
                        '<input id="fr-amount" name="amount" type="text" inputmode="decimal" placeholder="0.00" maxlength="14">' +
                    '</div></div>' +
                    '<div class="fr-field"><label for="fr-date">Date</label><input id="fr-date" name="date" type="date"></div>' +
                '</div>' +
                '<div class="fr-field"><label for="fr-method">Paid in</label><select id="fr-method" name="method"><option>Cash</option><option>Check</option><option>Bank transfer</option><option>Card</option><option>Other</option></select></div>' +
                '<label class="fr-check"><input type="checkbox" id="fr-two" name="two" checked> Print 2 copies on one page (one for each side)</label>' +
                '<div class="fr-actions">' +
                    '<button type="submit" class="btn btn-go btn-big" id="frPrintBtn"><i class="fas fa-print"></i> Print or save as PDF</button>' +
                    '<button type="button" class="fr-clear" id="frClear">Clear</button>' +
                '</div>' +
                '<p class="fr-hint"><i class="fas fa-circle-info"></i> To download a PDF, choose <b>&ldquo;Save as PDF&rdquo;</b> in the print window. Leave any field empty to fill it in by hand.</p>' +
            '</form>' +
            '<div class="fr-preview-wrap">' +
                '<div class="fr-preview-label"><i class="fas fa-eye"></i> Live preview</div>' +
                '<div id="frPreview"></div>' +
                '<div class="fr-upsell" id="frUpsell">' +
                    '<div><h3 id="frUpsellTitle">Writing receipts every week?</h3>' +
                    '<p>SpendNote numbers and saves every receipt, adds your logo and keeps a running cash balance. Find any receipt in seconds.</p></div>' +
                    '<a href="/spendnote-signup" class="btn btn-white" data-cta="maker-upsell">Try it free for 14 days <i class="fas fa-arrow-right"></i></a>' +
                '</div>' +
            '</div>' +
        '</div>';

    var form = document.getElementById('frForm');
    var preview = document.getElementById('frPreview');
    var f = form.elements;

    var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    function under1000(n) {
        var out = [];
        if (n >= 100) { out.push(ONES[Math.floor(n / 100)] + ' hundred'); n %= 100; }
        if (n >= 20) { out.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')); }
        else if (n > 0) { out.push(ONES[n]); }
        return out.join(' ');
    }
    function toWords(num) {
        if (!isFinite(num) || num < 0 || num >= 1e12) return '';
        var whole = Math.floor(num);
        var cents = Math.round((num - whole) * 100);
        if (cents === 100) { whole += 1; cents = 0; }
        var parts = [];
        [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand'], [1, '']].forEach(function (u) {
            var chunk = Math.floor(whole / u[0]) % 1000;
            if (chunk) parts.push(under1000(chunk) + (u[1] ? ' ' + u[1] : ''));
        });
        var words = parts.length ? parts.join(' ') : 'zero';
        words = words.charAt(0).toUpperCase() + words.slice(1);
        return words + ' and ' + String(cents).padStart(2, '0') + '/100';
    }

    function parseAmount(v) {
        var s = String(v || '').replace(/[^0-9.,]/g, '');
        if (!s) return null;
        if (s.indexOf(',') > -1 && s.indexOf('.') === -1 && /,\d{1,2}$/.test(s)) s = s.replace(',', '.');
        s = s.replace(/,/g, '');
        var n = parseFloat(s);
        return isFinite(n) ? n : null;
    }

    function fmtDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        var d = new Date(+p[0], +p[1] - 1, +p[2]);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function val(text) {
        var v = el('div', 'fr-r-v');
        if (text) v.textContent = text; else v.appendChild(el('span', 'fr-blank'));
        return v;
    }

    function buildReceipt(d) {
        var r = el('div', 'fr-receipt');

        var top = el('div', 'fr-r-top');
        top.appendChild(el('div', 'fr-r-title', d.title || defaultTitle));
        var meta = el('div', 'fr-r-meta');
        meta.appendChild(document.createTextNode('No. '));
        meta.appendChild(el('b', null, d.no || '______'));
        meta.appendChild(el('br'));
        meta.appendChild(document.createTextNode('Date: '));
        meta.appendChild(el('b', null, fmtDate(d.date) || '____________'));
        top.appendChild(meta);
        r.appendChild(top);

        var parties = el('div', 'fr-r-parties');
        [['Received from', d.from], ['Received by', d.to]].forEach(function (p) {
            var c = el('div');
            c.appendChild(el('div', 'fr-r-k', p[0]));
            c.appendChild(val(p[1]));
            parties.appendChild(c);
        });
        r.appendChild(parties);

        r.appendChild(el('div', 'fr-r-k', 'For'));
        var line = el('div', 'fr-r-line');
        line.appendChild(val(d.for));
        r.appendChild(line);

        var n = parseAmount(d.amount);
        var amountText = n == null ? '' : (d.cur || '') + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        r.appendChild(el('p', 'fr-r-words', n == null ? '' : 'Amount in words: ' + toWords(n)));

        var total = el('div', 'fr-r-total');
        total.appendChild(el('span', null, 'Total received'));
        total.appendChild(el('strong', null, amountText || '________'));
        r.appendChild(total);
        r.appendChild(el('div', 'fr-r-method', 'Paid in: ' + (d.method || 'Cash')));

        var sigs = el('div', 'fr-r-sigs');
        sigs.appendChild(el('div', 'fr-r-sig', 'Paid by (signature)'));
        sigs.appendChild(el('div', 'fr-r-sig', 'Received by (signature)'));
        r.appendChild(sigs);

        var foot = el('div', 'fr-r-foot');
        foot.appendChild(document.createTextNode('Made with '));
        foot.appendChild(el('b', null, 'SpendNote'));
        foot.appendChild(document.createTextNode(' \u00b7 free cash receipt maker at spendnote.app'));
        r.appendChild(foot);
        return r;
    }

    function data() {
        return {
            title: f.title.value.trim(), no: f.no.value.trim(), from: f.from.value.trim(), to: f.to.value.trim(),
            for: f['for'].value.trim(), cur: f.cur.value, amount: f.amount.value.trim(), date: f.date.value,
            method: f.method.value, two: f.two.checked
        };
    }

    function render() {
        preview.innerHTML = '';
        preview.appendChild(buildReceipt(data()));
    }

    function save() {
        try { localStorage.setItem(STORE, JSON.stringify(data())); } catch (_) {}
    }

    function load() {
        var s = null;
        try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
        f.title.value = (s && s.title) || defaultTitle;
        f.no.value = (s && s.no) || '0001';
        f.from.value = (s && s.from) || '';
        f.to.value = (s && s.to) || '';
        f['for'].value = '';
        f.amount.value = '';
        if (s && s.cur != null) f.cur.value = s.cur;
        if (s && s.method) f.method.value = s.method;
        f.two.checked = !s || s.two !== false;
        f.date.value = today();
    }

    function nextNumber(no) {
        var m = /^(.*?)(\d+)$/.exec(no || '');
        if (!m) return no;
        var next = String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
        return m[1] + next;
    }

    var started = false;
    form.addEventListener('input', function () {
        if (!started) { started = true; track('free_receipt_start'); }
        render();
        save();
    });
    form.addEventListener('change', function () { render(); save(); });

    document.getElementById('frClear').addEventListener('click', function () {
        try { localStorage.removeItem(STORE); } catch (_) {}
        load();
        render();
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = data();
        var holder = document.getElementById('frPrint');
        if (!holder) {
            holder = document.createElement('div');
            holder.id = 'frPrint';
            document.body.appendChild(holder);
        }
        holder.innerHTML = '';
        holder.appendChild(buildReceipt(d));
        if (d.two) {
            var cut = el('div', 'fr-cut');
            cut.appendChild(el('span', null, 'cut here'));
            holder.appendChild(cut);
            holder.appendChild(buildReceipt(d));
        }
        track('free_receipt_print', { copies: d.two ? 2 : 1, filled: d.amount ? 'yes' : 'blank' });
        window.print();

        f.no.value = nextNumber(d.no);
        f['for'].value = '';
        f.amount.value = '';
        save();
        render();

        var up = document.getElementById('frUpsell');
        document.getElementById('frUpsellTitle').textContent = 'Done! Want every receipt saved and numbered for you?';
        up.classList.remove('fr-pop');
        void up.offsetWidth;
        up.classList.add('fr-pop');
    });

    var section = document.getElementById('maker') || root;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            document.body.classList.toggle('fr-in-view', entries[0].isIntersecting);
        }).observe(section);
    }

    load();
    render();
})();
