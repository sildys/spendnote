(function () {
    var root = document.getElementById('freeCashCount');
    if (!root) return;

    var lp = document.body.getAttribute('data-lp') || 'unknown';
    var STORE = 'sn_free_cash_count_v1';

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

    // Values in cents. Canada has had no penny since 2013, Australia no 1c/2c since 1992.
    var SETS = {
        USD: { sym: '$', name: 'US dollar ($)',
            bills: [[10000, '$100'], [5000, '$50'], [2000, '$20'], [1000, '$10'], [500, '$5'], [200, '$2'], [100, '$1']],
            coins: [[100, '$1 coin'], [50, '50\u00a2'], [25, '25\u00a2'], [10, '10\u00a2'], [5, '5\u00a2'], [1, '1\u00a2']] },
        CAD: { sym: 'CA$', name: 'Canadian dollar (CA$)',
            bills: [[10000, '$100'], [5000, '$50'], [2000, '$20'], [1000, '$10'], [500, '$5']],
            coins: [[200, '$2 coin'], [100, '$1 coin'], [25, '25\u00a2'], [10, '10\u00a2'], [5, '5\u00a2']] },
        EUR: { sym: '\u20ac', name: 'Euro (\u20ac)',
            bills: [[50000, '\u20ac500'], [20000, '\u20ac200'], [10000, '\u20ac100'], [5000, '\u20ac50'], [2000, '\u20ac20'], [1000, '\u20ac10'], [500, '\u20ac5']],
            coins: [[200, '\u20ac2'], [100, '\u20ac1'], [50, '50c'], [20, '20c'], [10, '10c'], [5, '5c'], [2, '2c'], [1, '1c']] },
        GBP: { sym: '\u00a3', name: 'British pound (\u00a3)',
            bills: [[5000, '\u00a350'], [2000, '\u00a320'], [1000, '\u00a310'], [500, '\u00a35']],
            coins: [[200, '\u00a32'], [100, '\u00a31'], [50, '50p'], [20, '20p'], [10, '10p'], [5, '5p'], [2, '2p'], [1, '1p']] },
        AUD: { sym: 'A$', name: 'Australian dollar (A$)',
            bills: [[10000, '$100'], [5000, '$50'], [2000, '$20'], [1000, '$10'], [500, '$5']],
            coins: [[200, '$2'], [100, '$1'], [50, '50c'], [20, '20c'], [10, '10c'], [5, '5c']] }
    };

    var curOptions = Object.keys(SETS).map(function (k) {
        return '<option value="' + k + '">' + SETS[k].name + '</option>';
    }).join('');

    root.innerHTML =
        '<div class="fr-grid">' +
            '<form class="fr-form" id="ccForm" autocomplete="off" novalidate>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cc-title">Sheet title</label><input id="cc-title" name="title" maxlength="40"></div>' +
                    '<div class="fr-field"><label for="cc-date">Date</label><input id="cc-date" name="date" type="date"></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cc-biz">Business / location</label><input id="cc-biz" name="biz" maxlength="60" placeholder="e.g. Main Street Caf\u00e9"></div>' +
                    '<div class="fr-field"><label for="cc-box">Cash box / register</label><input id="cc-box" name="box" maxlength="40" placeholder="e.g. Front register"></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cc-by">Counted by</label><input id="cc-by" name="by" maxlength="60" placeholder="e.g. Maria Lopez"></div>' +
                    '<div class="fr-field"><label for="cc-cur">Currency</label><select id="cc-cur" name="cur">' + curOptions + '</select></div>' +
                '</div>' +
                '<div class="cr-group">' +
                    '<div class="cr-group-head"><span><i class="fas fa-money-bill-wave"></i> Bills</span><span class="cr-sum" id="ccBillSum"></span></div>' +
                    '<div id="ccBills"></div>' +
                '</div>' +
                '<div class="cr-group">' +
                    '<div class="cr-group-head"><span><i class="fas fa-coins"></i> Coins</span><span class="cr-sum" id="ccCoinSum"></span></div>' +
                    '<div id="ccCoins"></div>' +
                    '<div class="cc-line cc-line-rolls"><label for="cc-rolls">Coin rolls (total value)</label><input id="cc-rolls" name="rolls" type="text" inputmode="decimal" placeholder="0.00" maxlength="12"><span class="cc-sub" id="ccRollsSub"></span></div>' +
                '</div>' +
                '<div class="cc-total" id="ccTotal"></div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cc-expected">Expected balance</label><input id="cc-expected" name="expected" type="text" inputmode="decimal" placeholder="From your records (optional)" maxlength="14"></div>' +
                    '<div class="fr-field"><label for="cc-notes">Notes</label><input id="cc-notes" name="notes" maxlength="120" placeholder="e.g. Recounted twice, $5 short"></div>' +
                '</div>' +
                '<div class="fr-actions">' +
                    '<button type="submit" class="btn btn-go btn-big"><i class="fas fa-print"></i> Print or save as PDF</button>' +
                    '<button type="button" class="fr-clear" id="ccClear">Clear</button>' +
                '</div>' +
                '<p class="fr-hint"><i class="fas fa-circle-info"></i> Enter how many of each bill and coin you have; the amounts add up as you type. To download a PDF, choose <b>&ldquo;Save as PDF&rdquo;</b> in the print window. Leave the counts empty to print a blank cash count sheet and fill it in by hand.</p>' +
            '</form>' +
            '<div class="fr-preview-wrap">' +
                '<div class="fr-preview-label"><i class="fas fa-eye"></i> Live preview</div>' +
                '<div id="frPreview"></div>' +
                '<div class="fr-upsell" id="frUpsell">' +
                    '<div><h3 id="frUpsellTitle">Where does the expected balance come from?</h3>' +
                    '<p>SpendNote keeps it for you: every cash in and out your team logs gets a receipt and updates the cash box balance, so at close you only count and compare.</p></div>' +
                    '<a href="/spendnote-signup" class="btn btn-white" data-cta="maker-upsell">Try it free for 14 days <i class="fas fa-arrow-right"></i></a>' +
                '</div>' +
            '</div>' +
        '</div>';

    var form = document.getElementById('ccForm');
    var preview = document.getElementById('frPreview');
    var f = form.elements;
    var billsBox = document.getElementById('ccBills');
    var coinsBox = document.getElementById('ccCoins');

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function parseQty(v) {
        var s = String(v || '').replace(/[^0-9]/g, '');
        if (!s) return null;
        var n = parseInt(s, 10);
        return isFinite(n) ? n : null;
    }

    function parseCents(v) {
        var s = String(v || '').replace(/[^0-9.,-]/g, '');
        if (!s || s === '-') return null;
        if (s.indexOf(',') > -1 && s.indexOf('.') === -1 && /,\d{1,2}$/.test(s)) s = s.replace(',', '.');
        s = s.replace(/,/g, '');
        var n = parseFloat(s);
        return isFinite(n) ? Math.round(n * 100) : null;
    }

    function money(cents, sym) {
        if (cents == null) return '';
        var abs = (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (cents < 0 ? '\u2212' : '') + sym + abs;
    }

    function fmtDate(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        var d = new Date(+p[0], +p[1] - 1, +p[2]);
        return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

    function buildRows(box, list, kind, saved) {
        box.innerHTML = '';
        list.forEach(function (dn) {
            var row = el('div', 'cc-line');
            var id = 'cc-' + kind + '-' + dn[0];
            var lab = el('label', null, dn[1]);
            lab.htmlFor = id;
            var q = el('input');
            q.id = id;
            q.type = 'text';
            q.inputMode = 'numeric';
            q.maxLength = 6;
            q.placeholder = '0';
            q.className = 'cc-qty';
            q.setAttribute('data-kind', kind);
            q.setAttribute('data-value', dn[0]);
            q.setAttribute('aria-label', 'Number of ' + dn[1] + (kind === 'bill' ? ' bills' : (/coin$/.test(dn[1]) ? 's' : ' coins')));
            if (saved && saved[kind + dn[0]] != null) q.value = saved[kind + dn[0]];
            row.appendChild(lab);
            row.appendChild(q);
            row.appendChild(el('span', 'cc-sub'));
            box.appendChild(row);
        });
    }

    function setCurrency(code, saved) {
        var set = SETS[code] || SETS.USD;
        buildRows(billsBox, set.bills, 'bill', saved);
        buildRows(coinsBox, set.coins, 'coin', saved);
    }

    function data() {
        var code = SETS[f.cur.value] ? f.cur.value : 'USD';
        var set = SETS[code];
        var d = {
            title: f.title.value.trim(), date: f.date.value, biz: f.biz.value.trim(), box: f.box.value.trim(),
            by: f.by.value.trim(), cur: code, sym: set.sym, rolls: f.rolls.value.trim(),
            expectedRaw: f.expected.value.trim(), notes: f.notes.value.trim(), lines: [], qty: {}
        };
        var any = false;
        d.billTotal = 0;
        d.coinTotal = 0;
        form.querySelectorAll('.cc-qty').forEach(function (inp) {
            var kind = inp.getAttribute('data-kind');
            var value = +inp.getAttribute('data-value');
            var q = parseQty(inp.value);
            var line = { kind: kind, label: inp.closest('.cc-line').querySelector('label').textContent, qty: q, amount: q == null ? null : q * value };
            d.lines.push(line);
            if (inp.value.trim() !== '') d.qty[kind + value] = inp.value.trim();
            if (q != null) {
                any = true;
                if (kind === 'bill') d.billTotal += line.amount; else d.coinTotal += line.amount;
            }
        });
        d.rollsCents = parseCents(d.rolls);
        if (d.rollsCents != null) { any = true; d.coinTotal += d.rollsCents; }
        d.total = any ? d.billTotal + d.coinTotal : null;
        d.anyBills = d.lines.some(function (l) { return l.kind === 'bill' && l.qty != null; });
        d.anyCoins = d.rollsCents != null || d.lines.some(function (l) { return l.kind === 'coin' && l.qty != null; });
        d.expected = parseCents(d.expectedRaw);
        d.diff = (d.total == null || d.expected == null) ? null : d.total - d.expected;
        return d;
    }

    function sumLine(label, value, cls) {
        var row = el('div', 'cr-r-sum-row' + (cls ? ' ' + cls : ''));
        row.appendChild(el('span', null, label));
        row.appendChild(value ? el('b', null, value) : el('span', 'fr-blank cr-blank cr-blank-num'));
        return row;
    }

    function denomTable(label, lines, extra, total, sym) {
        var t = el('table', 'cr-r-table cc-r-table');
        var head = el('tr');
        head.appendChild(el('th', null, label));
        head.appendChild(el('th', 'cc-r-qty', 'Quantity'));
        head.appendChild(el('th', 'cr-r-num', 'Amount'));
        t.appendChild(head);
        lines.forEach(function (l) {
            var tr = el('tr');
            tr.appendChild(el('td', null, l.label));
            tr.appendChild(el('td', 'cc-r-qty', l.qty == null ? '' : String(l.qty)));
            tr.appendChild(el('td', 'cr-r-num', l.amount == null ? '' : money(l.amount, sym)));
            t.appendChild(tr);
        });
        if (extra) t.appendChild(extra);
        var foot = el('tr', 'cr-r-total-row');
        foot.appendChild(el('td', null, 'Total ' + label.toLowerCase()));
        foot.appendChild(el('td'));
        foot.appendChild(el('td', 'cr-r-num', total == null ? '' : money(total, sym)));
        t.appendChild(foot);
        var wrap = el('div', 'cr-r-block');
        wrap.appendChild(t);
        return wrap;
    }

    function buildSheet(d) {
        var r = el('div', 'fr-receipt cr-report cc-sheet');

        var top = el('div', 'fr-r-top');
        var titleBox = el('div');
        titleBox.appendChild(el('div', 'fr-r-title', d.title || 'Cash Count Sheet'));
        var sub = [d.biz, d.box].filter(Boolean).join(' \u00b7 ');
        if (sub) titleBox.appendChild(el('div', 'cr-r-sub', sub));
        top.appendChild(titleBox);
        var meta = el('div', 'fr-r-meta');
        meta.appendChild(document.createTextNode('Date: '));
        meta.appendChild(el('b', null, fmtDate(d.date) || '____________'));
        meta.appendChild(el('br'));
        meta.appendChild(document.createTextNode('Counted by: '));
        meta.appendChild(el('b', null, d.by || '____________'));
        top.appendChild(meta);
        r.appendChild(top);

        var cols = el('div', 'cc-r-cols');
        cols.appendChild(denomTable('Bills', d.lines.filter(function (l) { return l.kind === 'bill'; }), null, d.anyBills ? d.billTotal : null, d.sym));
        var rolls = el('tr');
        rolls.appendChild(el('td', null, 'Coin rolls'));
        rolls.appendChild(el('td', 'cc-r-qty'));
        rolls.appendChild(el('td', 'cr-r-num', d.rollsCents == null ? '' : money(d.rollsCents, d.sym)));
        cols.appendChild(denomTable('Coins', d.lines.filter(function (l) { return l.kind === 'coin'; }), rolls, d.anyCoins ? d.coinTotal : null, d.sym));
        r.appendChild(cols);

        var s = el('div', 'cr-r-summary');
        s.appendChild(sumLine('Total bills', d.anyBills ? money(d.billTotal, d.sym) : ''));
        s.appendChild(sumLine('+ Total coins', d.anyCoins ? money(d.coinTotal, d.sym) : ''));
        s.appendChild(sumLine('= Total cash counted', d.total == null ? '' : money(d.total, d.sym), 'cr-r-key'));
        s.appendChild(sumLine('Expected balance (per records)', d.expected == null ? '' : money(d.expected, d.sym)));
        var diffText = '';
        var diffCls = '';
        if (d.diff != null) {
            if (d.diff === 0) { diffText = 'Balanced'; diffCls = 'cr-ok'; }
            else if (d.diff > 0) { diffText = 'Over ' + money(d.diff, d.sym); diffCls = 'cr-warn'; }
            else { diffText = 'Short ' + money(-d.diff, d.sym); diffCls = 'cr-bad'; }
        }
        s.appendChild(sumLine('Over / (short)', diffText, 'cr-r-key ' + diffCls));
        r.appendChild(s);

        r.appendChild(el('div', 'fr-r-k cr-r-notes-k', 'Notes'));
        var notes = el('div', 'cr-r-notes');
        if (d.notes) notes.textContent = d.notes;
        else { notes.appendChild(el('span', 'fr-blank')); notes.appendChild(el('span', 'fr-blank')); }
        r.appendChild(notes);

        var sigs = el('div', 'fr-r-sigs');
        sigs.appendChild(el('div', 'fr-r-sig', 'Counted by (signature)'));
        sigs.appendChild(el('div', 'fr-r-sig', 'Verified by (signature)'));
        r.appendChild(sigs);

        var foot = el('div', 'fr-r-foot');
        foot.appendChild(document.createTextNode('Made with '));
        foot.appendChild(el('b', null, 'SpendNote'));
        foot.appendChild(document.createTextNode(' \u00b7 free cash count sheet at spendnote.app'));
        r.appendChild(foot);
        return r;
    }

    function render() {
        var d = data();
        form.querySelectorAll('.cc-qty').forEach(function (inp, i) {
            var l = d.lines[i];
            inp.closest('.cc-line').querySelector('.cc-sub').textContent = l.amount == null ? '' : money(l.amount, d.sym);
        });
        document.getElementById('ccRollsSub').textContent = d.rollsCents == null ? '' : money(d.rollsCents, d.sym);
        document.getElementById('ccBillSum').textContent = d.anyBills ? money(d.billTotal, d.sym) : '';
        document.getElementById('ccCoinSum').textContent = d.anyCoins ? money(d.coinTotal, d.sym) : '';
        var total = document.getElementById('ccTotal');
        total.innerHTML = '';
        total.appendChild(el('span', null, 'Total cash counted'));
        total.appendChild(el('b', null, d.total == null ? money(0, d.sym) : money(d.total, d.sym)));
        preview.innerHTML = '';
        preview.appendChild(buildSheet(d));
    }

    function save() {
        var d = data();
        try {
            localStorage.setItem(STORE, JSON.stringify({
                title: d.title, date: d.date, biz: d.biz, box: d.box, by: d.by, cur: d.cur,
                qty: d.qty, rolls: d.rolls, expected: d.expectedRaw, notes: d.notes
            }));
        } catch (_) {}
    }

    function load() {
        var s = null;
        try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
        var sameDay = s && s.date === today();
        f.title.value = (s && s.title) || 'Cash Count Sheet';
        f.date.value = today();
        f.biz.value = (s && s.biz) || '';
        f.box.value = (s && s.box) || '';
        f.by.value = (s && s.by) || '';
        f.cur.value = s && SETS[s.cur] ? s.cur : 'USD';
        setCurrency(f.cur.value, sameDay ? s.qty : null);
        f.rolls.value = sameDay ? (s.rolls || '') : '';
        f.expected.value = sameDay ? (s.expected || '') : '';
        f.notes.value = sameDay ? (s.notes || '') : '';
    }

    var started = false;
    function changed() {
        if (!started) { started = true; track('free_count_start'); }
        render();
        save();
    }
    form.addEventListener('input', function (e) {
        if (e.target !== f.cur) changed();
    });
    form.addEventListener('change', function (e) {
        if (e.target !== f.cur) return;
        setCurrency(f.cur.value, null);
        changed();
    });

    document.getElementById('ccClear').addEventListener('click', function () {
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
        holder.appendChild(buildSheet(d));
        track('free_count_print', { currency: d.cur, filled: d.total == null ? 'blank' : 'yes', balanced: d.diff == null ? 'unknown' : (d.diff === 0 ? 'yes' : 'no') });
        window.print();
        save();

        var up = document.getElementById('frUpsell');
        document.getElementById('frUpsellTitle').textContent = 'Done! Want the expected balance ready next time?';
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
