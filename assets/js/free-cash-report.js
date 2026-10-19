(function () {
    var root = document.getElementById('freeCashReport');
    if (!root) return;

    var lp = document.body.getAttribute('data-lp') || 'unknown';
    var STORE = 'sn_free_cash_report_v1';
    var MIN_PRINT_ROWS = 5;

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
            '<form class="fr-form" id="crForm" autocomplete="off" novalidate>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cr-title">Report title</label><input id="cr-title" name="title" maxlength="40"></div>' +
                    '<div class="fr-field"><label for="cr-date">Date</label><input id="cr-date" name="date" type="date"></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cr-biz">Business / location</label><input id="cr-biz" name="biz" maxlength="60" placeholder="e.g. Main Street Café"></div>' +
                    '<div class="fr-field"><label for="cr-box">Cash box / register</label><input id="cr-box" name="box" maxlength="40" placeholder="e.g. Front register"></div>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cr-by">Prepared by</label><input id="cr-by" name="by" maxlength="60" placeholder="e.g. Maria Lopez"></div>' +
                    '<div class="fr-field"><label for="cr-open">Opening balance</label><div class="fr-amount">' +
                        '<select id="cr-cur" name="cur" aria-label="Currency">' + CURRENCIES + '</select>' +
                        '<input id="cr-open" name="open" type="text" inputmode="decimal" placeholder="0.00" maxlength="14">' +
                    '</div></div>' +
                '</div>' +
                '<div class="cr-group">' +
                    '<div class="cr-group-head"><span><i class="fas fa-arrow-down"></i> Cash in</span><span class="cr-sum" id="crInSum"></span></div>' +
                    '<div id="crIn"></div>' +
                    '<button type="button" class="cr-add" data-add="in"><i class="fas fa-plus"></i> Add cash in</button>' +
                '</div>' +
                '<div class="cr-group">' +
                    '<div class="cr-group-head"><span><i class="fas fa-arrow-up"></i> Cash out</span><span class="cr-sum" id="crOutSum"></span></div>' +
                    '<div id="crOut"></div>' +
                    '<button type="button" class="cr-add" data-add="out"><i class="fas fa-plus"></i> Add cash out</button>' +
                '</div>' +
                '<div class="fr-row">' +
                    '<div class="fr-field"><label for="cr-count">Cash counted at close</label><input id="cr-count" name="count" type="text" inputmode="decimal" placeholder="Leave empty to count by hand" maxlength="14"></div>' +
                    '<div class="fr-field"><label for="cr-notes">Notes</label><input id="cr-notes" name="notes" maxlength="120" placeholder="e.g. $5 short, coffee run not logged"></div>' +
                '</div>' +
                '<div class="fr-actions">' +
                    '<button type="submit" class="btn btn-go btn-big"><i class="fas fa-print"></i> Print or save as PDF</button>' +
                    '<button type="button" class="fr-clear" id="crClear">Clear</button>' +
                '</div>' +
                '<p class="fr-hint"><i class="fas fa-circle-info"></i> To download a PDF, choose <b>&ldquo;Save as PDF&rdquo;</b> in the print window. Leave fields empty to print a blank daily cash report and fill it in by hand.</p>' +
            '</form>' +
            '<div class="fr-preview-wrap">' +
                '<div class="fr-preview-label"><i class="fas fa-eye"></i> Live preview</div>' +
                '<div id="frPreview"></div>' +
                '<div class="fr-upsell" id="frUpsell">' +
                    '<div><h3 id="frUpsellTitle">Doing this every day?</h3>' +
                    '<p>SpendNote builds this report for you from every cash in and out your team logs, keeps a running balance and exports it as a PDF.</p></div>' +
                    '<a href="/spendnote-signup" class="btn btn-white" data-cta="maker-upsell">Try it free for 14 days <i class="fas fa-arrow-right"></i></a>' +
                '</div>' +
            '</div>' +
        '</div>';

    var form = document.getElementById('crForm');
    var preview = document.getElementById('frPreview');
    var f = form.elements;
    var lists = { in: document.getElementById('crIn'), out: document.getElementById('crOut') };

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
        return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function addLine(kind, desc, amount) {
        var row = el('div', 'cr-line');
        var d = el('input');
        d.type = 'text';
        d.maxLength = 60;
        d.className = 'cr-desc';
        d.placeholder = kind === 'in' ? 'e.g. Cash sales' : 'e.g. Office supplies';
        d.setAttribute('aria-label', kind === 'in' ? 'Cash in description' : 'Cash out description');
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
        x.setAttribute('aria-label', 'Remove line');
        x.innerHTML = '<i class="fas fa-xmark"></i>';
        row.appendChild(d);
        row.appendChild(a);
        row.appendChild(x);
        lists[kind].appendChild(row);
        return row;
    }

    function readLines(kind) {
        var out = [];
        lists[kind].querySelectorAll('.cr-line').forEach(function (r) {
            out.push({ desc: r.querySelector('.cr-desc').value.trim(), amount: r.querySelector('.cr-amt').value.trim() });
        });
        return out;
    }

    function sum(lines) {
        var any = false;
        var total = lines.reduce(function (s, l) {
            var n = parseAmount(l.amount);
            if (n == null) return s;
            any = true;
            return s + n;
        }, 0);
        return any ? total : null;
    }

    function data() {
        var d = {
            title: f.title.value.trim(), date: f.date.value, biz: f.biz.value.trim(), box: f.box.value.trim(),
            by: f.by.value.trim(), cur: f.cur.value, open: f.open.value.trim(), count: f.count.value.trim(),
            notes: f.notes.value.trim(), ins: readLines('in'), outs: readLines('out')
        };
        var open = parseAmount(d.open);
        d.totalIn = sum(d.ins);
        d.totalOut = sum(d.outs);
        d.expected = (open == null && d.totalIn == null && d.totalOut == null) ? null : (open || 0) + (d.totalIn || 0) - (d.totalOut || 0);
        d.counted = parseAmount(d.count);
        d.diff = (d.counted == null || d.expected == null) ? null : d.counted - d.expected;
        return d;
    }

    function blankOr(text, cls) {
        if (text) return el('span', cls, text);
        return el('span', 'fr-blank cr-blank');
    }

    function table(label, lines, total, cur) {
        var wrap = el('div', 'cr-r-block');
        var t = el('table', 'cr-r-table');
        var head = el('tr');
        head.appendChild(el('th', null, label));
        head.appendChild(el('th', 'cr-r-num', 'Amount'));
        t.appendChild(head);
        var rows = lines.filter(function (l) { return l.desc || l.amount; });
        var pad = Math.max(0, MIN_PRINT_ROWS - rows.length);
        rows.forEach(function (l) {
            var tr = el('tr');
            var n = parseAmount(l.amount);
            tr.appendChild(el('td', null, l.desc || ''));
            tr.appendChild(el('td', 'cr-r-num', n == null ? '' : money(n, cur)));
            t.appendChild(tr);
        });
        for (var i = 0; i < pad; i++) {
            var empty = el('tr', 'cr-r-empty');
            empty.appendChild(el('td'));
            empty.appendChild(el('td', 'cr-r-num'));
            t.appendChild(empty);
        }
        var foot = el('tr', 'cr-r-total-row');
        foot.appendChild(el('td', null, 'Total ' + label.toLowerCase()));
        foot.appendChild(el('td', 'cr-r-num', total == null ? '' : money(total, cur)));
        t.appendChild(foot);
        wrap.appendChild(t);
        return wrap;
    }

    function sumLine(label, value, cls) {
        var row = el('div', 'cr-r-sum-row' + (cls ? ' ' + cls : ''));
        row.appendChild(el('span', null, label));
        row.appendChild(value ? el('b', null, value) : el('span', 'fr-blank cr-blank cr-blank-num'));
        return row;
    }

    function buildReport(d) {
        var r = el('div', 'fr-receipt cr-report');

        var top = el('div', 'fr-r-top');
        var titleBox = el('div');
        titleBox.appendChild(el('div', 'fr-r-title', d.title || 'Daily Cash Report'));
        var sub = [d.biz, d.box].filter(Boolean).join(' \u00b7 ');
        if (sub) titleBox.appendChild(el('div', 'cr-r-sub', sub));
        top.appendChild(titleBox);
        var meta = el('div', 'fr-r-meta');
        meta.appendChild(document.createTextNode('Date: '));
        meta.appendChild(el('b', null, fmtDate(d.date) || '____________'));
        meta.appendChild(el('br'));
        meta.appendChild(document.createTextNode('Prepared by: '));
        meta.appendChild(el('b', null, d.by || '____________'));
        top.appendChild(meta);
        r.appendChild(top);

        var open = parseAmount(d.open);
        var openRow = el('div', 'cr-r-open');
        openRow.appendChild(el('span', null, 'Opening balance'));
        openRow.appendChild(blankOr(open == null ? '' : money(open, d.cur), 'cr-r-strong'));
        r.appendChild(openRow);

        r.appendChild(table('Cash in', d.ins, d.totalIn, d.cur));
        r.appendChild(table('Cash out', d.outs, d.totalOut, d.cur));

        var s = el('div', 'cr-r-summary');
        s.appendChild(sumLine('Opening balance', open == null ? '' : money(open, d.cur)));
        s.appendChild(sumLine('+ Total cash in', d.totalIn == null ? '' : money(d.totalIn, d.cur)));
        s.appendChild(sumLine('\u2212 Total cash out', d.totalOut == null ? '' : money(d.totalOut, d.cur)));
        s.appendChild(sumLine('= Expected closing balance', d.expected == null ? '' : money(d.expected, d.cur), 'cr-r-key'));
        s.appendChild(sumLine('Cash counted at close', d.counted == null ? '' : money(d.counted, d.cur)));
        var diffText = '';
        var diffCls = '';
        if (d.diff != null) {
            if (Math.abs(d.diff) < 0.005) { diffText = 'Balanced'; diffCls = 'cr-ok'; }
            else if (d.diff > 0) { diffText = 'Over ' + money(d.diff, d.cur); diffCls = 'cr-warn'; }
            else { diffText = 'Short ' + money(-d.diff, d.cur); diffCls = 'cr-bad'; }
        }
        s.appendChild(sumLine('Over / (short)', diffText, 'cr-r-key ' + diffCls));
        r.appendChild(s);

        r.appendChild(el('div', 'fr-r-k cr-r-notes-k', 'Notes'));
        var notes = el('div', 'cr-r-notes');
        if (d.notes) notes.textContent = d.notes;
        else { notes.appendChild(el('span', 'fr-blank')); notes.appendChild(el('span', 'fr-blank')); }
        r.appendChild(notes);

        var sigs = el('div', 'fr-r-sigs');
        sigs.appendChild(el('div', 'fr-r-sig', 'Prepared by (signature)'));
        sigs.appendChild(el('div', 'fr-r-sig', 'Verified by (signature)'));
        r.appendChild(sigs);

        var foot = el('div', 'fr-r-foot');
        foot.appendChild(document.createTextNode('Made with '));
        foot.appendChild(el('b', null, 'SpendNote'));
        foot.appendChild(document.createTextNode(' \u00b7 free daily cash report at spendnote.app'));
        r.appendChild(foot);
        return r;
    }

    function render() {
        var d = data();
        document.getElementById('crInSum').textContent = d.totalIn == null ? '' : money(d.totalIn, d.cur);
        document.getElementById('crOutSum').textContent = d.totalOut == null ? '' : money(d.totalOut, d.cur);
        preview.innerHTML = '';
        preview.appendChild(buildReport(d));
    }

    function save() {
        var d = data();
        var closing = d.counted != null ? d.counted : d.expected;
        try {
            localStorage.setItem(STORE, JSON.stringify({
                title: d.title, date: d.date, biz: d.biz, box: d.box, by: d.by, cur: d.cur, open: d.open,
                count: d.count, notes: d.notes, ins: d.ins, outs: d.outs, closing: closing
            }));
        } catch (_) {}
    }

    function fillLines(kind, lines) {
        lists[kind].innerHTML = '';
        (lines && lines.length ? lines : [{}, {}, {}]).forEach(function (l) { addLine(kind, l.desc, l.amount); });
    }

    function load() {
        var s = null;
        try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
        var sameDay = s && s.date === today();
        f.title.value = (s && s.title) || 'Daily Cash Report';
        f.date.value = today();
        f.biz.value = (s && s.biz) || '';
        f.box.value = (s && s.box) || '';
        f.by.value = (s && s.by) || '';
        if (s && s.cur != null) f.cur.value = s.cur;
        if (sameDay) {
            f.open.value = s.open || '';
            f.count.value = s.count || '';
            f.notes.value = s.notes || '';
            fillLines('in', s.ins);
            fillLines('out', s.outs);
        } else {
            f.open.value = s && s.closing != null ? s.closing.toFixed(2) : '';
            f.count.value = '';
            f.notes.value = '';
            fillLines('in');
            fillLines('out');
        }
    }

    var started = false;
    function changed() {
        if (!started) { started = true; track('free_report_start'); }
        render();
        save();
    }
    form.addEventListener('input', changed);
    form.addEventListener('change', function () { render(); save(); });

    form.addEventListener('click', function (e) {
        var add = e.target.closest('[data-add]');
        if (add) {
            var row = addLine(add.getAttribute('data-add'));
            row.querySelector('.cr-desc').focus();
            render();
            return;
        }
        var del = e.target.closest('.cr-del');
        if (del) {
            var line = del.closest('.cr-line');
            var list = line.parentNode;
            line.remove();
            if (!list.children.length) addLine(list === lists.in ? 'in' : 'out');
            changed();
        }
    });

    document.getElementById('crClear').addEventListener('click', function () {
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
        holder.appendChild(buildReport(d));
        var lines = d.ins.concat(d.outs).filter(function (l) { return l.amount; }).length;
        track('free_report_print', { lines: lines, filled: lines ? 'yes' : 'blank', balanced: d.diff == null ? 'unknown' : (Math.abs(d.diff) < 0.005 ? 'yes' : 'no') });
        window.print();
        save();

        var up = document.getElementById('frUpsell');
        document.getElementById('frUpsellTitle').textContent = 'Done! Want tomorrow\u2019s report to build itself?';
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
