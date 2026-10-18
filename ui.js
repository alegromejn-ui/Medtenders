/* Медтендери: інтерфейс */
(function () {
  'use strict';
  var F = window.MT;
  var app = document.getElementById('app'), tabsEl = document.getElementById('tabs'), sheetRoot = document.getElementById('sheet-root'), toastEl = document.getElementById('toast');
  var ui = { tab: 'list', shown: 60, sheet: null, busy: false, msg: null, urlMsg: null, syncErr: '' };
  var STEP = 60;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 2600); }
  function ago(ms) {
    if (!ms) return 'ще не оновлювалось';
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'щойно';
    if (m < 60) return m + ' хв тому';
    var h = Math.round(m / 60); if (h < 24) return h + ' год тому';
    return F.fmtDate(new Date(ms).toISOString(), true);
  }
  var PERIODS = [['today', 'Сьогодні'], ['7', '7 днів'], ['30', '30 днів'], ['90', '90 днів'], ['all', 'Усі'], ['custom', 'Свій період']];
  var SORTS = [['new', 'Нові'], ['deadline', 'За строком'], ['value', 'Дорожчі']];
  function periodLabel(f) {
    if (f.period === 'custom') return (f.from ? 'з ' + F.fmtDate(f.from) : '') + (f.from && f.to ? ' ' : '') + (f.to ? 'до ' + F.fmtDate(f.to) : '') || 'Свій період';
    for (var i = 0; i < PERIODS.length; i++) if (PERIODS[i][0] === f.period) return PERIODS[i][1];
    return '';
  }

  // ---------- Каркас ----------
  function render() {
    var h = '';
    if (ui.tab === 'settings') h = settingsPage();
    else h = listPage(ui.tab === 'star');
    app.innerHTML = h;
    app.className = ui.tab === 'settings' ? 'is-settings' : 'is-list';
    renderTabs();
  }
  function renderTabs() {
    var n = Object.keys(F.S.starred).length;
    var t = [['list', 'list', 'Тендери'], ['star', 'star', 'Обрані'], ['settings', 'gear', 'Ще']];
    tabsEl.innerHTML = t.map(function (x) {
      return '<button data-act="tab" data-tab="' + x[0] + '"' + (ui.tab === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1]) + '<span>' + x[2] + '</span>' + (x[0] === 'star' && n ? '<b class="cnt">' + n + '</b>' : '') + '</button>';
    }).join('');
  }

  // ---------- Список ----------
  function syncLine() {
    var S = F.S;
    if (ui.busy) return '<span class="pulse"></span>Оновлюю список…';
    if (ui.syncErr) return '<span class="warn">' + ic('alert', 'sm') + esc(ui.syncErr) + '</span>';
    return 'Оновлено ' + esc(ago(S.lastSync));
  }
  function header(starred) {
    return '<header class="top"><div><h1>' + (starred ? 'Обрані' : 'Медтендери') + '</h1><p class="sync" id="syncline">' + syncLine() + '</p></div>' +
      '<button class="icon-btn" data-act="sync" aria-label="Оновити список"' + (ui.busy ? ' disabled' : '') + '>' + ic('refresh', ui.busy ? 'spin' : '') + '</button></header>';
  }
  function welcome() {
    return '<section class="welcome"><h2>Підключіть збір тендерів</h2>' +
      '<p>Тендери з ProZorro збирає ваш власний Google-скрипт: раз на 10 хвилин він переглядає всі нові закупівлі й відбирає ті, де є позиції з кодами ДК 3314 і 3316. Встановлюється один раз, займає 5–10 хвилин.</p>' +
      '<button class="btn" data-act="tab" data-tab="settings">Як підключити</button></section>';
  }
  function catChips(fc) {
    var f = F.S.f, sel = f.cats;
    var h = '<div class="cats" role="group" aria-label="Товари">';
    h += '<button class="cat" data-act="cat" data-cat="" aria-pressed="' + (!sel.length) + '">Усі мої товари</button>';
    F.CATS.concat([F.OTHER]).forEach(function (c) {
      var n = fc.cats[c.id] || 0, on = sel.indexOf(c.id) >= 0;
      h += '<button class="cat' + (c.id === 'other' ? ' other' : '') + '" data-act="cat" data-cat="' + c.id + '" aria-pressed="' + on + '"' + (!n && !on ? ' data-zero="1"' : '') + '>' + esc(c.name) + '<b>' + n + '</b></button>';
    });
    return h + '</div>';
  }
  function filterForm(fc, pre) {
    pre = pre || 'f';
    var f = F.S.f, h = '<div class="ff">';
    h += '<fieldset><legend>Дата оголошення</legend><div class="pills">' + PERIODS.map(function (p) { return '<button data-act="period" data-v="' + p[0] + '" aria-pressed="' + (f.period === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>';
    if (f.period === 'custom') h += '<div class="dates"><label>З<input type="date" data-change="from" value="' + esc(f.from) + '"></label><label>По<input type="date" data-change="to" value="' + esc(f.to) + '"></label></div>';
    h += '</fieldset>';
    h += '<fieldset><legend>Статус</legend><div class="pills"><button data-act="status" data-v="" aria-pressed="' + (!f.status) + '">Усі</button>' +
      F.GROUPS.map(function (g) { return '<button data-act="status" data-v="' + g.id + '" aria-pressed="' + (f.status === g.id) + '">' + g.name + ' <b>' + (fc.status[g.id] || 0) + '</b></button>'; }).join('') + '</div></fieldset>';
    var regs = F.regionList(fc.region);
    if (f.region && regs.indexOf(f.region) < 0) regs.unshift(f.region);
    h += '<label class="fl" for="' + pre + '-region">Регіон замовника</label><select id="' + pre + '-region" data-change="region"><option value="">Уся Україна</option>' +
      regs.map(function (r) { return '<option value="' + esc(r) + '"' + (f.region === r ? ' selected' : '') + '>' + esc(r) + (fc.region[r] ? ' (' + fc.region[r] + ')' : '') + '</option>'; }).join('') + '</select>';
    var types = F.typeList(fc.type);
    if (f.type && types.indexOf(f.type) < 0) types.unshift(f.type);
    h += '<label class="fl" for="' + pre + '-type">Вид закупівлі</label><select id="' + pre + '-type" data-change="type"><option value="">Усі види</option>' +
      types.map(function (t) { return '<option value="' + esc(t) + '"' + (f.type === t ? ' selected' : '') + '>' + esc(F.typeName(t)) + (fc.type[t] ? ' (' + fc.type[t] + ')' : '') + '</option>'; }).join('') + '</select>';
    if (F.activeCount()) h += '<button class="btn ghost sm reset" data-act="reset">Скинути фільтри</button>';
    return h + '</div>';
  }
  function activePills() {
    var f = F.S.f, p = [];
    if (f.period !== '30') p.push(['period', periodLabel(f)]);
    if (f.status) p.push(['status', F.GROUPS.filter(function (g) { return g.id === f.status; })[0].name]);
    if (f.region) p.push(['region', f.region]);
    if (f.type) p.push(['type', F.typeName(f.type)]);
    if (!p.length) return '';
    return '<div class="active">' + p.map(function (x) { return '<button data-act="unf" data-k="' + x[0] + '" aria-label="Прибрати фільтр ' + esc(x[1]) + '">' + esc(x[1]) + ic('x', 'sm') + '</button>'; }).join('') + '</div>';
  }
  function card(t) {
    var i = F.info(t), dl = F.deadline(t), star = !!F.S.starred[t.id];
    var g = i.group;
    var tags = F.CATS.filter(function (c) { return i.cats[c.id]; }).map(function (c) { return '<span class="tag">' + esc(c.name) + (i.items.length > 1 ? '<b>' + i.cats[c.id] + '</b>' : '') + '</span>'; }).join('');
    if (!tags) tags = '<span class="tag other">Інше в 3314/3316</span>';
    return '<article class="tc g-' + g + (dl ? ' l-' + dl.level : '') + '">' +
      '<i class="rail" aria-hidden="true" style="--f:' + (dl ? dl.frac.toFixed(3) : 0) + '"></i>' +
      '<button class="tc-open" data-act="open" data-id="' + esc(t.id) + '">' +
      '<span class="tc-top"><span class="st">' + esc(F.statusName(t.st)) + '</span>' + (dl ? '<span class="dl">' + esc(dl.text) + '</span>' : '') + (F.isNew(t) ? '<span class="new">Нове</span>' : '') + '</span>' +
      '<span class="tt">' + esc(t.t || 'Без назви') + '</span>' +
      '<span class="org">' + esc(t.org) + '</span>' +
      '<span class="where">' + esc(i.region) + '<span class="sep"></span>' + esc(F.typeName(t.pmt)) + '</span>' +
      '<span class="tags">' + tags + '</span>' +
      '<span class="tc-foot"><span class="sum">' + (t.val != null ? esc(F.fmtMoney(t.val, t.cur)) : 'Сума не вказана') + '</span><span class="date">' + esc(F.fmtDate(t.pub)) + '</span></span>' +
      '</button>' +
      '<button class="star" data-act="star" data-id="' + esc(t.id) + '" aria-pressed="' + star + '" aria-label="' + (star ? 'Прибрати з обраних' : 'Додати в обрані') + '">' + ic('star') + '</button>' +
      '</article>';
  }
  function listPage(starred) {
    var S = F.S;
    var h = header(starred);
    if (!S.url && !F.all().length) return h + welcome();
    var fc = F.facets(S.f, { starred: starred });
    var list = F.query(S.f, { starred: starred });
    h += '<div class="layout"><aside class="side" aria-label="Фільтри">' + filterForm(fc) + '</aside><div class="main">';
    h += '<div class="searchbar">' + ic('search') + '<input type="search" id="q" data-input="q" value="' + esc(S.f.q) + '" placeholder="Назва, замовник, ЄДРПОУ, товар" aria-label="Пошук" autocomplete="off"></div>';
    h += catChips(fc);
    var n = F.activeCount() - (S.f.cats.length ? 1 : 0);
    h += '<div class="bar"><button class="btn ghost sm fbtn" data-act="filters">' + ic('filter', 'sm') + 'Фільтри' + (n ? '<b>' + n + '</b>' : '') + '</button>' +
      '<p class="count">' + list.length + ' ' + F.plural(list.length, 'тендер', 'тендери', 'тендерів') + '</p>' +
      '<label class="sort"><span class="vh">Сортування</span><select data-change="sort">' + SORTS.map(function (s) { return '<option value="' + s[0] + '"' + (S.f.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label></div>';
    h += activePills();
    if (!list.length) {
      var why = starred && !Object.keys(S.starred).length ? 'Позначайте зірочкою тендери, які хочете відстежувати, і вони збиратимуться тут.'
        : !F.all().length ? 'Скрипт ще не передав жодного тендеру. Перший збір займає до години: ProZorro публікує тисячі закупівель на день, і скрипт переглядає кожну.'
        : 'Під ці фільтри нічого немає. Спробуйте ширший період або інші товари.';
      h += '<div class="empty"><p>' + why + '</p>' + (F.activeCount() && F.all().length ? '<button class="btn ghost sm" data-act="reset">Скинути фільтри</button>' : '') + '</div>';
    } else {
      h += '<div class="list">' + list.slice(0, ui.shown).map(card).join('') + '</div>';
      if (list.length > ui.shown) h += '<button class="btn ghost block more" data-act="more">Показати ще ' + Math.min(STEP, list.length - ui.shown) + '</button>';
    }
    return h + '</div></div>';
  }

  // ---------- Картка тендеру ----------
  function tenderSheet(t) {
    var i = F.info(t), dl = F.deadline(t), star = !!F.S.starred[t.id];
    var h = '<div class="sh-top"><button class="icon-btn" data-act="close" aria-label="Назад">' + ic('left') + '</button>' +
      '<button class="icon-btn star" data-act="star" data-id="' + esc(t.id) + '" aria-pressed="' + star + '" aria-label="' + (star ? 'Прибрати з обраних' : 'Додати в обрані') + '">' + ic('star') + '</button></div>';
    h += '<div class="td g-' + i.group + (dl ? ' l-' + dl.level : '') + '">';
    h += '<p class="td-st"><span class="st">' + esc(F.statusName(t.st)) + '</span>' + (dl ? '<span class="dl">' + esc(dl.text) + '</span>' : '') + '</p>';
    h += '<h2 class="td-t">' + esc(t.t || 'Без назви') + '</h2>';
    h += '<button class="tid" data-act="copy" data-v="' + esc(t.tid) + '">' + esc(t.tid) + ic('copy', 'sm') + '</button>';
    h += '<dl class="facts">' +
      '<div><dt>Замовник</dt><dd>' + esc(t.org) + (t.edr ? '<small>ЄДРПОУ ' + esc(t.edr) + '</small>' : '') + '</dd></div>' +
      '<div><dt>Регіон</dt><dd>' + esc(i.region) + (t.loc ? '<small>' + esc(t.loc) + '</small>' : '') + '</dd></div>' +
      '<div><dt>Очікувана вартість</dt><dd class="num">' + (t.val != null ? esc(F.fmtMoney(t.val, t.cur)) + '<small>' + (t.vat ? 'з ПДВ' : 'без ПДВ') + '</small>' : 'Не вказана') + '</dd></div>' +
      '<div><dt>Вид закупівлі</dt><dd>' + esc(F.typeName(t.pmt)) + '</dd></div>' +
      '<div><dt>Оголошено</dt><dd>' + esc(F.fmtDate(t.pub, true)) + '</dd></div>' +
      (t.enq ? '<div><dt>Питання до</dt><dd>' + esc(F.fmtDate(t.enq, true)) + '</dd></div>' : '') +
      (t.end ? '<div><dt>Подання пропозицій до</dt><dd>' + esc(F.fmtDate(t.end, true)) + '</dd></div>' : '') +
      '</dl>';
    var mine = i.items.filter(function (x) { return x.cats.length; }), rest = i.items.filter(function (x) { return !x.cats.length; });
    function rows(arr) {
      return '<ol class="items">' + arr.map(function (x) {
        var it = x.it;
        return '<li><p class="it-d">' + esc(it.d) + '</p><p class="it-m">' + (it.q != null ? '<b>' + esc(F.fmtQty(it.q)) + ' ' + esc(it.u) + '</b>' : '') +
          '<span>' + esc(it.c) + (it.cd ? ' ' + esc(it.cd) : '') + '</span></p>' +
          (x.cats.length ? '<p class="it-c">' + x.cats.map(function (c) { return '<span class="tag">' + esc(F.CAT_BY[c].name) + '</span>'; }).join('') + '</p>' : '') + '</li>';
      }).join('') + '</ol>';
    }
    if (mine.length) h += '<h3>Ваші товари <span>' + mine.length + '</span></h3>' + rows(mine);
    if (rest.length) h += '<h3>Інші позиції 3314/3316 <span>' + rest.length + '</span></h3>' + rows(rest);
    if (t.more || t.other) h += '<p class="note">' + (t.more ? 'Ще ' + t.more + ' ' + F.plural(t.more, 'позиція', 'позиції', 'позицій') + ' 3314/3316 не вмістилися. ' : '') +
      (t.other ? 'У тендері також ' + t.other + ' ' + F.plural(t.other, 'позиція', 'позиції', 'позицій') + ' з інших кодів ДК. ' : '') + 'Повний перелік є на ProZorro.</p>';
    if (t.win && t.win.length) {
      var lots = {}; (t.lots || []).forEach(function (l) { lots[l.id] = l.t; });
      h += '<h3>Переможці</h3><ul class="wins">' + t.win.map(function (w) {
        return '<li>' + ic('trophy', 'sm') + '<span><b>' + esc(w.n || 'Учасник') + '</b>' + (w.lot && lots[w.lot] ? '<small>' + esc(lots[w.lot]) + '</small>' : '') + '</span><span class="num">' + (w.a != null ? esc(F.fmtMoney(w.a, t.cur)) : '') + '</span></li>';
      }).join('') + '</ul>';
    }
    h += '<a class="btn block go" href="' + esc(F.prozorroUrl(t)) + '" target="_blank" rel="noopener">Відкрити на ProZorro' + ic('ext', 'sm') + '</a>';
    return h + '</div>';
  }
  function filtersSheet() {
    var fc = F.facets(F.S.f, { starred: ui.tab === 'star' });
    var n = F.query(F.S.f, { starred: ui.tab === 'star' }).length;
    return '<div class="sh-top"><h2>Фільтри</h2><button class="icon-btn" data-act="close" aria-label="Закрити">' + ic('x') + '</button></div>' +
      filterForm(fc, 's') + '<button class="btn block show" data-act="close">Показати ' + n + ' ' + F.plural(n, 'тендер', 'тендери', 'тендерів') + '</button>';
  }
  function renderSheet() {
    if (!ui.sheet) { sheetRoot.innerHTML = ''; document.body.classList.remove('locked'); return; }
    var inner = '';
    if (ui.sheet === 'filters') inner = filtersSheet();
    else { var t = F.byId(ui.sheet); if (!t) { ui.sheet = null; return renderSheet(); } inner = tenderSheet(t); }
    var keep = sheetRoot.querySelector('.sheet'); var top = keep ? keep.scrollTop : 0;
    sheetRoot.innerHTML = '<div class="scrim" data-act="close"></div><div class="sheet ' + (ui.sheet === 'filters' ? 'fs' : 'ts') + '" role="dialog" aria-modal="true" aria-label="' + (ui.sheet === 'filters' ? 'Фільтри' : 'Тендер') + '">' + inner + '</div>';
    if (keep && ui.sheetSame) sheetRoot.querySelector('.sheet').scrollTop = top;
    ui.sheetSame = false;
    document.body.classList.add('locked');
  }

  // ---------- Налаштування ----------
  function settingsPage() {
    var S = F.S, sv = S.server;
    var h = '<header class="top"><div><h1>Налаштування</h1></div></header><div class="narrow">';
    h += '<section class="panel"><h2>Google-скрипт</h2><p class="sub">Вставте «URL веб-додатка», який Google показав після розгортання скрипта.</p>' +
      '<form class="urlrow" data-form="url"><input type="text" id="url" name="url" value="' + esc(ui.urlDraft != null ? ui.urlDraft : S.url) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="URL скрипта">' +
      '<button class="btn" type="submit"' + (ui.busy ? ' disabled' : '') + '>' + (S.url ? 'Зберегти' : 'Підключити') + '</button></form>';
    if (ui.urlMsg) h += '<p class="msg ' + (ui.urlMsg.ok ? 'ok' : 'bad') + '">' + ic(ui.urlMsg.ok ? 'check' : 'alert', 'sm') + esc(ui.urlMsg.text) + '</p>';
    if (S.url) {
      h += '<dl class="stat">' +
        '<div><dt>У додатку</dt><dd>' + F.all().length + ' ' + F.plural(F.all().length, 'тендер', 'тендери', 'тендерів') + '</dd></div>' +
        '<div><dt>Оновлено</dt><dd>' + esc(ago(S.lastSync)) + '</dd></div>';
      if (sv) {
        h += '<div><dt>Скрипт збирав</dt><dd>' + esc(sv.lastRun ? ago(sv.lastRun) : 'ще не запускався') + '</dd></div>' +
          '<div><dt>Перший збір</dt><dd>' + (sv.backDone ? 'завершено, тендери з ' + esc(F.fmtDate(sv.horizon)) : 'триває' + (sv.backAt ? ', дійшов до ' + esc(F.fmtDate(sv.backAt, true)) : '')) + '</dd></div>' +
          '<div><dt>Запитів сьогодні</dt><dd>' + (sv.today || 0) + ' з 17 000</dd></div>';
      }
      h += '</dl>';
      if (sv && sv.lastError) h += '<p class="msg bad">' + ic('alert', 'sm') + 'Остання помилка скрипта: ' + esc(sv.lastError) + '</p>';
      if (sv && sv.lastRun && Date.now() - sv.lastRun > 3 * 3600e3) h += '<p class="msg bad">' + ic('alert', 'sm') + 'Скрипт не запускався понад 3 години. Відкрийте Apps Script → Тригери й перевірте, що є тригер «sync» кожні 10 хвилин.</p>';
    }
    h += '</section>';
    h += '<section class="panel"><h2>Як встановити скрипт</h2><ol class="steps">' +
      '<li>Створіть нову Google Таблицю: відкрийте <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> і назвіть її, наприклад, «Медтендери».</li>' +
      '<li>Меню «Розширення» → «Apps Script». Видаліть увесь код і вставте вміст файлу <b>medtender.gs</b>. Збережіть.</li>' +
      '<li>Угорі виберіть функцію <b>setup</b> і натисніть «Виконати». Дозвольте доступ: «Додатково» → «Перейти до проєкту». Скрипт створить аркуші й почне збирати тендери кожні 10 хвилин.</li>' +
      '<li>«Розгорнути» → «Нове розгортання» → тип «Веб-додаток». Виконувати від імені: «Я», доступ: «Усі». Скопіюйте «URL веб-додатка» і вставте його вище.</li>' +
      '</ol><p class="fine">Перший збір охоплює 2 останні дні й займає до години. Далі список росте сам, а все зібране лишається в таблиці. Тендери збираються навіть тоді, коли додаток закритий.</p></section>';
    h += '<section class="panel"><h2>Додаток</h2><div class="btns"><button class="btn ghost sm" data-act="hardupd">' + ic('refresh', 'sm') + 'Оновити додаток</button>' +
      '<button class="btn ghost sm danger" data-act="wipe">Стерти тендери з телефону</button></div>' +
      '<p class="fine">«Стерти» прибирає лише копію в цьому телефоні: таблиця Google не зміниться, і при наступному оновленні список завантажиться наново. Обрані лишаються.</p>' +
      '<p class="fine">Версія додатка: medtender-' + F.VERSION + '. Дані: <a href="https://prozorro.gov.ua" target="_blank" rel="noopener">ProZorro</a>, публічний API. Товари визначаються за кодом ДК і словами в описі позиції, тож зрідка трапляються зайві або пропущені позиції.</p></section>';
    return h + '</div>';
  }

  // ---------- Дії ----------
  function doSync(silent) {
    if (!F.S.url || ui.busy) return Promise.resolve();
    ui.busy = true; ui.syncErr = ''; refreshHead();
    return F.sync().then(function (r) {
      ui.busy = false;
      if (!silent || r.added) toast(r.added ? 'Нових тендерів: ' + r.added : r.updated ? 'Оновлено тендерів: ' + r.updated : 'Нових тендерів немає');
      render(); if (ui.sheet) renderSheet();
    }, function (e) { ui.busy = false; ui.syncErr = F.errText(e); render(); });
  }
  function refreshHead() {
    var s = document.getElementById('syncline'); if (s) s.innerHTML = syncLine();
    var b = app.querySelector('[data-act="sync"]'); if (b) { b.disabled = ui.busy; b.innerHTML = ic('refresh', ui.busy ? 'spin' : ''); }
  }
  function rerenderList() { ui.shown = STEP; render(); if (ui.sheet === 'filters') renderSheet(); }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    switch (a) {
      case 'tab': ui.tab = el.getAttribute('data-tab'); ui.shown = STEP; ui.urlMsg = null; ui.urlDraft = null; ui.sheet = null; renderSheet(); render(); window.scrollTo(0, 0); break;
      case 'sync': doSync(false); break;
      case 'cat': {
        var c = el.getAttribute('data-cat'), cur = F.S.f.cats.slice();
        if (!c) cur = []; else if (cur.indexOf(c) >= 0) cur.splice(cur.indexOf(c), 1); else cur.push(c);
        F.setF({ cats: cur }); rerenderList(); break;
      }
      case 'period': F.setF({ period: el.getAttribute('data-v') }); rerenderList(); break;
      case 'status': F.setF({ status: el.getAttribute('data-v') }); rerenderList(); break;
      case 'unf': { var k = el.getAttribute('data-k'), p = {}; p[k] = k === 'period' ? '30' : ''; F.setF(p); rerenderList(); break; }
      case 'reset': F.resetF(); rerenderList(); break;
      case 'filters': ui.sheet = 'filters'; renderSheet(); break;
      case 'more': ui.shown += STEP; render(); break;
      case 'open': ui.sheet = id; renderSheet(); break;
      case 'close': ui.sheet = null; renderSheet(); break;
      case 'star': {
        var on = F.toggleStar(id); toast(on ? 'Додано в обрані' : 'Прибрано з обраних');
        var y = window.scrollY; render(); window.scrollTo(0, y); if (ui.sheet && ui.sheet !== 'filters') { ui.sheetSame = true; renderSheet(); }
        break;
      }
      case 'copy': {
        var v = el.getAttribute('data-v');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { toast('Номер скопійовано'); }, function () { toast(v); });
        else toast(v);
        break;
      }
      case 'wipe':
        if (!window.confirm('Стерти тендери з цього телефону? Таблиця Google не зміниться.')) break;
        F.wipe().then(function () { toast('Стерто. Завантажую наново…'); render(); doSync(true); });
        break;
      case 'hardupd': {
        toast('Оновлюю додаток…');
        var done = function () { try { window.location.reload(); } catch (e) { /* ignore */ } };
        var p1 = navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update(); }).catch(function () {}) : Promise.resolve();
        var p2 = window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }).catch(function () {}) : Promise.resolve();
        Promise.all([p1, p2]).then(done, done);
        break;
      }
    }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target.closest('[data-change]'); if (!el) return;
    var k = el.getAttribute('data-change'), p = {}; p[k] = el.value; F.setF(p); rerenderList();
  });
  var qT = null;
  document.addEventListener('input', function (ev) {
    var el = ev.target.closest('[data-input="q"]'); if (!el) return;
    clearTimeout(qT);
    qT = setTimeout(function () {
      F.setF({ q: el.value }); ui.shown = STEP;
      var pos = el.selectionStart; render();
      var q = document.getElementById('q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
    }, 250);
  });
  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest('[data-form="url"]'); if (!form) return;
    ev.preventDefault();
    var url = form.querySelector('#url').value.trim();
    ui.urlDraft = url;
    if (!F.validUrl(url)) { ui.urlMsg = { ok: false, text: F.errText({ code: 'NO_URL' }) }; render(); return; }
    ui.busy = true; ui.urlMsg = { ok: true, text: 'Перевіряю…' }; render();
    F.sync({ url: url }).then(function (r) {
      ui.busy = false; ui.syncErr = ''; ui.urlDraft = null;
      ui.urlMsg = { ok: true, text: 'Підключено. Отримано тендерів: ' + (r.added + r.updated) + '.' + (r.added + r.updated ? '' : ' Скрипт ще збирає перші дані, загляньте за пів години.') };
      render();
    }, function (e) { ui.busy = false; ui.urlMsg = { ok: false, text: F.errText(e) }; render(); });
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && ui.sheet) { ui.sheet = null; renderSheet(); } });
  window.addEventListener('popstate', function () { if (ui.sheet) { ui.sheet = null; renderSheet(); } });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && Date.now() - (F.S.lastSync || 0) > 5 * 60e3) doSync(true); });
  setInterval(function () { if (document.visibilityState === 'visible') doSync(true); }, 10 * 60e3);

  F.init().then(function () {
    render();
    if (F.S.url) doSync(true);
  });
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }); }
  window.MTUI = { ui: ui, render: render, renderSheet: renderSheet };
})();
