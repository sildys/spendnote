(function () {
    var root = document.getElementById('freeReplenishment');
    if (!root) return;

    var lp = document.body.getAttribute('data-lp') || 'unknown';
    var STORE = 'sn_free_replenishment_v1';
    var MIN_PRINT_ROWS = 10;

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

    var CURRENCIES = '<option value="$">$</option><option value="€">€</option><option value="£">£</option><option value="CA$">CA$</option><option value="A$">A$</option><option value="₹">₹</option><option value="">Other</option>';

    root.innerHTML =
        '<div class="fr-grid">' +
            '<form class="fr-form" id="rpForm" autocomplete="off" novalidate>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="rp-biz">Business / fund</label><input id="rp-biz" name="biz" maxlength="60" placeholder="e.g. Main office petty cash"></div>' +
                    '<div class="fr-field"><label for="rp-date">Date</label><input id="rp-date" name="date" type="date"></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="rp-by">Custodian</label><input id="rp-by" name="by" maxlength="60" placeholder="e.g. Maria Lopez"></div>' +
                    '<div class="fr-field"><label for="rp-float">Fixed float</label><div class="fr-amount">' +
                        '<select id="rp-cur" name="cur" aria-label="Currency">' + CURRENCIES + '</select>' +
                        '<input id="rp-float" name="float" type="text" inputmode="decimal" placeholder="e.g. 300.00" maxlength="14">' +
                    '</div></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="rp-from">Period from</label><input id="rp-from" name="from" type="date"></div>' +
                    '<div class="fr-field"><label for="rp-to">Period to</label><input id="rp-to" name="to" type="date"></div>' +
                '</div>' +
                '<div class="cr-group">' +
                    '<div class="cr-group-head"><span><i class="fas fa-receipt"></i> Receipts since the last top-up</span><span class="cr-sum" id="rpSum"></span></div>' +
                    '<div id="rpLines"></div>' +
                    '<button type="button" class="cr-add" data-add="1"><i class="fas fa-plus"></i> Add receipt</button>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="rp-count">Cash counted in the box</label><input id="rp-count" name="count" type="text" inputmode="decimal" placeholder="Leave empty to count by hand" maxlength="14"></div>' +
                    '<div class="fr-field"><label for="rp-notes">Notes</label><input id="rp-notes" name="notes" maxlength="120" placeholder="e.g. $1 short, no receipt for parking"></div>' +
                '</div>' +
                '<div class="fr-actions">' +
                    '<button type="submit" class="btn btn-go btn-big"><i class="fas fa-print"></i> Print or save as PDF</button>' +
                    '<button type="button" class="fr-clear" id="rpClear">Clear</button>' +
                '</div>' +
                '<p class="fr-hint"><i class="fas fa-circle-info"></i> To download a PDF, choose <b>&ldquo;Save as PDF&rdquo;</b> in the print window. Leave fields empty to print a blank replenishment form and fill it in by hand.</p>' +
            '</form>' +
            '<div class="fr-preview-wrap">' +
                '<div class="fr-preview-label"><i class="fas fa-eye"></i> Live preview</div>' +
                '<div id="frPreview"></div>' +
                '<div class="fr-upsell" id="frUpsell">' +
                    '<div><h3 id="frUpsellTitle">Tired of adding up receipts from the tin?</h3>' +
                    '<p>In SpendNote every cash out is logged with a receipt as it happens, so the running balance and the top-up amount are always there.</p></div>' +
                    '<a href="/spendnote-signup" class="btn btn-white" data-cta="maker-upsell">Try it free for 14 days <i class="fas fa-arrow-right"></i></a>' +
                '</div>' +
            '</div>' +
        '</div>';

    var form = document.getElementById('rpForm');
    var preview = document.getElementById('frPreview');
    var f = form.elements;
    var list = document.getElementById('rpLines');

    function parseAmount(v) {
        var s = String(v || '').replace(/[^0-9.,-]/g, '');
        if (!s || s === '-') return null;
        if (s.indexOf(',') > -1 && s.indexOf('.') === -1 && /,\d{1,2}$/.test(s)) s = s.replace(',', '.');
        s = s.replace(/,/g, '');
        var n = parseFloat(s);
        return isFinite(n) ? n : null;
    }

    function money(n, cur) {
        if (n == null) return '';
        var abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (n < -0.004 ? '\u2212' : '') + (cur || '') + abs;
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

    function addLine(desc, amount) {
        var row = el('div', 'cr-line');
        var d = el('input');
        d.type = 'text';
        d.maxLength = 60;
        d.className = 'cr-desc';
        d.placeholder = 'e.g. Printer paper';
        d.setAttribute('aria-label', 'Receipt description');
        d.value = desc || '';
        var a = el('input');
        a.type = 'text';
        a.maxLength = 14;
        a.inputMode = 'decimal';
        a.className = 'cr-amt';
        a.placeholder = '0.00';
        a.setAttribute('aria-label', 'Amount');
        a.value = amount || '';
        var x = el('button', 'cr-del');
        x.type = 'button';
        x.setAttribute('aria-label', 'Remove receipt');
        x.innerHTML = '<i class="fas fa-xmark"></i>';
        row.appendChild(d);
        row.appendChild(a);
        row.appendChild(x);
        list.appendChild(row);
        return row;
    }

    function readLines() {
        var out = [];
        list.querySelectorAll('.cr-line').forEach(function (r) {
            out.push({ desc: r.querySelector('.cr-desc').value.trim(), amount: r.querySelector('.cr-amt').value.trim() });
        });
        return out;
    }

    function data() {
        var d = {
            biz: f.biz.value.trim(), date: f.date.value, by: f.by.value.trim(), cur: f.cur.value,
            float: f.float.value.trim(), from: f.from.value, to: f.to.value,
            count: f.count.value.trim(), notes: f.notes.value.trim(), lines: readLines()
        };
        var any = false;
        var total = d.lines.reduce(function (s, l) {
            var n = parseAmount(l.amount);
            if (n == null) return s;
            any = true;
            return s + n;
        }, 0);
        d.fl = parseAmount(d.float);
        d.total = any ? total : null;
        d.expected = (d.fl == null || d.total == null) ? null : d.fl - d.total;
        d.counted = parseAmount(d.count);
        d.diff = (d.counted == null || d.expected == null) ? null : d.counted - d.expected;
        if (d.fl != null && d.counted != null) d.topup = d.fl - d.counted;
        else if (d.fl != null && d.total != null) d.topup = d.total;
        else d.topup = null;
        return d;
    }

    function sumLine(label, value, cls) {
        var row = el('div', 'cr-r-sum-row' + (cls ? ' ' + cls : ''));
        row.appendChild(el('span', null, label));
        row.appendChild(value ? el('b', null, value) : el('span', 'fr-blank cr-blank cr-blank-num'));
        return row;
    }

    function buildForm(d) {
        var r = el('div', 'fr-receipt cr-report');

        var top = el('div', 'fr-r-top');
        var titleBox = el('div');
        titleBox.appendChild(el('div', 'fr-r-title', 'Petty Cash Replenishment Form'));
        if (d.biz) titleBox.appendChild(el('div', 'cr-r-sub', d.biz));
        top.appendChild(titleBox);
        var meta = el('div', 'fr-r-meta');
        meta.appendChild(document.createTextNode('Date: '));
        meta.appendChild(el('b', null, fmtDate(d.date) || '____________'));
        meta.appendChild(el('br'));
        meta.appendChild(document.createTextNode('Custodian: '));
        meta.appendChild(el('b', null, d.by || '____________'));
        top.appendChild(meta);
        r.appendChild(top);

        var period = el('div', 'cr-r-open');
        period.appendChild(el('span', null, 'Period'));
        period.appendChild(el('span', null, (fmtDate(d.from) || '__________') + ' \u2013 ' + (fmtDate(d.to) || '__________')));
        r.appendChild(period);

        var wrap = el('div', 'cr-r-block');
        var t = el('table', 'cr-r-table');
        var head = el('tr');
        head.appendChild(el('th', 'rp-r-no', '#'));
        head.appendChild(el('th', null, 'Receipt / what it was for'));
        head.appendChild(el('th', 'cr-r-num', 'Amount'));
        t.appendChild(head);
        var rows = d.lines.filter(function (l) { return l.desc || l.amount; });
        rows.forEach(function (l, i) {
            var tr = el('tr');
            var n = parseAmount(l.amount);
            tr.appendChild(el('td', 'rp-r-no', String(i + 1)));
            tr.appendChild(el('td', null, l.desc || ''));
            tr.appendChild(el('td', 'cr-r-num', n == null ? '' : money(n, d.cur)));
            t.appendChild(tr);
        });
        for (var i = rows.length; i < Math.max(rows.length, MIN_PRINT_ROWS); i++) {
            var empty = el('tr', 'cr-r-empty');
            empty.appendChild(el('td', 'rp-r-no', String(i + 1)));
            empty.appendChild(el('td'));
            empty.appendChild(el('td', 'cr-r-num'));
            t.appendChild(empty);
        }
        var foot = el('tr', 'cr-r-total-row');
        foot.appendChild(el('td'));
        foot.appendChild(el('td', null, 'Total receipts'));
        foot.appendChild(el('td', 'cr-r-num', d.total == null ? '' : money(d.total, d.cur)));
        t.appendChild(foot);
        wrap.appendChild(t);
        r.appendChild(wrap);

        var s = el('div', 'cr-r-summary');
        s.appendChild(sumLine('Fixed float', d.fl == null ? '' : money(d.fl, d.cur)));
        s.appendChild(sumLine('\u2212 Total receipts', d.total == null ? '' : money(d.total, d.cur)));
        s.appendChild(sumLine('= Cash that should be in the box', d.expected == null ? '' : money(d.expected, d.cur), 'cr-r-key'));
        s.appendChild(sumLine('Cash counted in the box', d.counted == null ? '' : money(d.counted, d.cur)));
        var diffText = '';
        var diffCls = '';
        if (d.diff != null) {
            if (Math.abs(d.diff) < 0.005) { diffText = 'Balanced'; diffCls = 'cr-ok'; }
            else if (d.diff > 0) { diffText = 'Over ' + money(d.diff, d.cur); diffCls = 'cr-warn'; }
            else { diffText = 'Short ' + money(-d.diff, d.cur); diffCls = 'cr-bad'; }
        }
        s.appendChild(sumLine('Over / (short)', diffText, diffCls));
        s.appendChild(sumLine('Top-up needed (float \u2212 cash counted)', d.topup == null ? '' : money(d.topup, d.cur), 'cr-r-key rp-r-topup'));
        r.appendChild(s);

        r.appendChild(el('div', 'fr-r-k cr-r-notes-k', 'Notes'));
        var notes = el('div', 'cr-r-notes');
        if (d.notes) notes.textContent = d.notes;
        else { notes.appendChild(el('span', 'fr-blank')); notes.appendChild(el('span', 'fr-blank')); }
        r.appendChild(notes);

        var sigs = el('div', 'fr-r-sigs rp-r-sigs');
        sigs.appendChild(el('div', 'fr-r-sig', 'Requested by (custodian)'));
        sigs.appendChild(el('div', 'fr-r-sig', 'Approved by'));
        sigs.appendChild(el('div', 'fr-r-sig', 'Top-up cash received by'));
        r.appendChild(sigs);

        var f2 = el('div', 'fr-r-foot');
        f2.appendChild(document.createTextNode('Made with '));
        f2.appendChild(el('b', null, 'SpendNote'));
        f2.appendChild(document.createTextNode(' \u00b7 free petty cash replenishment form at spendnote.app'));
        r.appendChild(f2);
        return r;
    }

    function render() {
        var d = data();
        document.getElementById('rpSum').textContent = d.total == null ? '' : money(d.total, d.cur);
        preview.innerHTML = '';
        preview.appendChild(buildForm(d));
    }

    function save() {
        var d = data();
        try {
            localStorage.setItem(STORE, JSON.stringify({
                biz: d.biz, by: d.by, cur: d.cur, float: d.float, from: d.from, to: d.to,
                count: d.count, notes: d.notes, lines: d.lines
            }));
        } catch (_) {}
    }

    function fillLines(lines) {
        list.innerHTML = '';
        (lines && lines.length ? lines : [{}, {}, {}]).forEach(function (l) { addLine(l.desc, l.amount); });
    }

    function load() {
        var s = null;
        try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
        f.biz.value = (s && s.biz) || '';
        f.date.value = today();
        f.by.value = (s && s.by) || '';
        if (s && s.cur != null) f.cur.value = s.cur;
        f.float.value = (s && s.float) || '';
        f.from.value = (s && s.from) || '';
        f.to.value = (s && s.to) || '';
        f.count.value = (s && s.count) || '';
        f.notes.value = (s && s.notes) || '';
        fillLines(s && s.lines);
    }

    var started = false;
    function changed() {
        if (!started) { started = true; track('free_replenish_start'); }
        render();
        save();
    }
    form.addEventListener('input', changed);
    form.addEventListener('change', function () { render(); save(); });

    form.addEventListener('click', function (e) {
        var add = e.target.closest('[data-add]');
        if (add) {
            var row = addLine();
            row.querySelector('.cr-desc').focus();
            render();
            return;
        }
        var del = e.target.closest('.cr-del');
        if (del) {
            del.closest('.cr-line').remove();
            if (!list.children.length) addLine();
            changed();
        }
    });

    document.getElementById('rpClear').addEventListener('click', function () {
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
        holder.appendChild(buildForm(d));
        var lines = d.lines.filter(function (l) { return l.amount; }).length;
        track('free_replenish_print', { lines: lines, filled: lines ? 'yes' : 'blank', balanced: d.diff == null ? 'unknown' : (Math.abs(d.diff) < 0.005 ? 'yes' : 'no') });
        window.print();
        save();

        var up = document.getElementById('frUpsell');
        document.getElementById('frUpsellTitle').textContent = 'Done! Want the next top-up to add itself up?';
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
