/* Медтендери: логіка. Тендери збирає ваш Google-скрипт зі стрічки ProZorro,
   додаток лише завантажує готовий список, зберігає його в телефоні й фільтрує. */
(function (root) {
  'use strict';
  var VERSION = 'v11';
  var KEY = 'mt_state_v1';
  var PAGE = 1500;

  // ---------- Категорії товарів ----------
  // codes: позиції з таким кодом ДК (початок коду) потрапляють у категорію одразу.
  // re: слова в описі позиції (опис спершу переводиться в нижній регістр, апострофи прибираються).
  var CATS = [
    { id: 'suture', name: 'Шовний матеріал', codes: ['33141121', '33141125', '33141126', '33141128'], fallback: ['33141120'],
      re: /шовн|нитк\S*\s+(хірург|медичн|стерил)|хірург\S*\s+нитк|нит[ьи]\s+хирург|хирург\S*\s+нит|лігатур|лигатур|кетгут|атравмат\S*\s+(голк|нит|шов)|голк\S*\s+атравмат|vicryl|вікрил|викрил|prolene|пролен|monocryl|монокрил|\bpds\b|ethilon|етилон|mersilene|safil|сафіл|surgipro|polysorb|полісорб|biosyn|caprosyn|monosyn|моносин|dafilon|premilene|optilene|polyglactin|поліглактин|полиглактин|полігліколев|полигликол|поліпропіленов\S*\s+нит|полипропиленов\S*\s+нит|капроаг|шовк\S*\s+(хірург|плетен)|шелк\S*\s+хирург/ },
    { id: 'instr', name: 'Хірургічний інструмент', codes: ['33141122', '33141410', '33141411', '33162200', '33169'], fallback: ['33162000'],
      re: /інструмент|инструмент|скальпел|лез[оа]([^а-яіїєґ]|$)|затискач|зажим|пінцет|пинцет|ножиц|ножниц|ретрактор|ранорозшир|ранорасшир|голкотрим|иглодерж|корнцанг|кюретк|распатор|долото|кусачк|степлер|зшивальн\S*\s+апарат|сшивающ|кліпатор|клипатор|троакар|дисектор|диссектор|гачок\s+хірург|крючок\s+хирург|ложк\S*\s+(хірург|кістков|гінек)|дзеркал\S*\s+(гінек|вагін|носов|вушн|стоматолог)|зонд\S*\s+стоматолог|екскаватор|экскаватор|гладилк|штопфер|елеватор|элеватор|щипц\S*\s+(для\s+видал|стоматолог|хірург|хирург)|скоб\S*\s+(хірург|шкірн|для\s+степлер)|касет\S*\s+(до|для)\s+(степлер|зшив)/, not: /помп|інфузійн|инфузион|магістрал|катетер/ },
    { id: 'plaster', name: 'Пластирі', codes: ['33141111', '33141112'],
      re: /пластир|пластыр|л\/пласт|plaster|tegaderm|cosmopor|omniplast|omnifix|hypafix|mefix/ },
    { id: 'dressing', name: 'Пов’язки', codes: ['33141110', '33141113', '33141114', '33141116', '33141118', '33141119'],
      re: /повязк|перевязувальн|перевязочн|бинт|марл|серветк\S*\s+(марл|стерил|ранов|перевяз|медичн)|салфетк\S*\s+(марл|стерил|ранев)|ранов\S*\s+покрит|раневое\s+покрыт|гідроколоїд|гидроколлоид|альгінат|альгинат|hydrocolloid/ },
    { id: 'clothes', name: 'Хірургічний одяг', codes: [],
      re: /халат/ },
    { id: 'kit', name: 'Комплекти покриттів', codes: [],
      re: /(комплект|набір|набор|пакет)\S*[^.;]{0,40}(покрит|покрыт|простирадл|простин|простын|білизн|бiлизн|белье|драп|операційн|операционн|хірургічн\S*\s+(білизн|одяг))/ },
    { id: 'drape', name: 'Покриття', codes: [],
      re: /покритт|покрыти|простирадл|простин|простын|драп|drape|покривал|ізоляційн\S*\s+плівк|інцизійн|инцизионн|incise|ioban|іобан|(хірургічн|антимікробн|операційн|разрезн)\S*\s+плівк|чохол|чехол/, not: /ранов|раневое|гідрофіл|гидрофил|покриттям|лікувальн\S*\s+покрит|стент|катетер|провідник|інтродюсер|интродьюсер/ },
    { id: 'wax', name: 'Хірургічний віск', codes: [],
      re: /віск(?!оз)|воск(?!оз)|wax/ },
    { id: 'glue', name: 'Хірургічний клей', codes: [],
      re: /клей(?!к)|клею|клея(?!щ)|клеєм|адгезив([^н]|$)|адгезів|dermabond|дермабонд|гістоакрил|гистоакрил|histoacryl|ціаноакрил|цианоакрил|bioglue|tissucol|тісукол|фібринов\S*\s+клей|фибринов\S*\s+кле|evicel|liquiband|glubran|глубран|leukosan/ },
    { id: 'hemo', name: 'Гемостатичні матеріали', codes: ['33141127'],
      re: /гемостат|гемостаз|кровоспин|кровоостан|surgicel|сурджісел|сурджисел|tachocomb|тахокомб|tachosil|тахосіл|тахосил|spongostan|спонгостан|желатинов\S*\s+губк|колагенов\S*\s+губк|коллагенов\S*\s+губк|окиснен\S*\s+(регенерован\S*\s+)?целюлоз|окисленн\S*\s+(регенерированн\S*\s+)?целлюлоз|floseal|флосіл|surgiflo|hemopatch|гемопатч|arista|celox|целокс|quikclot|гемоблок|lyostypt|traumastem|травмастем/, not: /затискач|зажим|пінцет|пинцет|ножиц|інструмент|инструмент|клапан|інтродюсер|интродьюсер|катетер/ }
  ];
  var CAT_BY = {}; CATS.forEach(function (c) { CAT_BY[c.id] = c; });
  // Ознаки ниток/шва в описі (опис уже в нижньому регістрі без апострофів)
  var SUT_DESC = /нитк|нитей|нит[иь]([^а-яіїєґ]|$)|шовн|лігатур|лигатур|кетгут|атравмат\S*\s+(голк|нит|шов)|голк\S*\s+атравмат|\busp\b|(^|[^\d])\d{1,2}\/0([^\d]|$)|vicryl|вікрил|викрил|prolene|пролен|monocryl|монокрил|\bpds\b|ethilon|етилон|mersilene|safil|сафіл|surgipro|polysorb|полісорб|biosyn|caprosyn|monosyn|моносин|dafilon|premilene|optilene|поліглактин|полиглактин|полігліколев|полигликол/;
  var OTHER = { id: 'other', name: 'Інше в 3314/3316' };

  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[’ʼ'`ʹ]/g, '').replace(/ё/g, 'е').replace(/\s+/g, ' '); }
  function digits(code) { return String(code || '').split('-')[0]; }

  function catsOfItem(it) {
    var code = digits(it.c), d = norm(it.d), out = [];
    CATS.forEach(function (c) {
      var hit = c.codes.some(function (p) { return code.indexOf(p) === 0; }) || c.re.test(d);
      if (hit && c.not && c.not.test(d) && !c.codes.some(function (p) { return code.indexOf(p) === 0; })) hit = false;
      if (hit) out.push(c.id);
    });
    // Нитки часто публікують під кодом перев’язувального матеріалу (33141110 та сусідні): це шовний матеріал, а не пов’язки.
    // Код сам по собі пов’язку не робить, якщо в описі явно нитки/шов; власні слова пов’язки (бинт, марля…) діють як і раніше.
    if (SUT_DESC.test(d)) {
      if (code.indexOf('3314') === 0 && out.indexOf('suture') < 0) out.push('suture');
      out = out.filter(function (x) {
        if (x !== 'dressing' && x !== 'plaster') return true;
        return CAT_BY[x].re.test(d.replace(/перевязувальн\S*|перевязочн\S*/g, ' ')); // «перев’язувальний матеріал» — це лише назва коду
      });
    }
    if (out.indexOf('kit') >= 0) out = out.filter(function (x) { return x !== 'drape'; });
    if (!out.length) CATS.forEach(function (c) { if ((c.fallback || []).some(function (p) { return code.indexOf(p) === 0; })) out.push(c.id); });
    return out;
  }

  // Розбір тендеру (кешується, бо фільтри перераховуються часто)
  // Товари, які не цікавлять: позиції з ними не рахуються, а тендер лише з ними прихований
  var EXCL_ITEM = /рукавич|рукавиц|перчат|маск[аиоу]?([^а-яіїєґ]|$)|маски|масок|відріз\S*\s+марл|отрез\S*\s+марл|бахіл|бахил|шапочк|шапк|ковпак|колпак|берет|костюм|нарукавник|фартух|фартук|комбінезон|комбинезон|сорочк|рубашк|штани|брюки|одяг|одежд/;
  // Халати — ваш товар, навіть якщо в описі є інший одяг (напр. «комплект: халат, шапочка»)
  function excluded(d) { return EXCL_ITEM.test(d) && !/халат/.test(d); }
  function info(t) {
    if (t._i && t._i.mod === t.mod) return t._i;
    var cats = {}, items = (t.items || []).map(function (it) {
      if (excluded(norm(it.d))) return { it: it, cats: [], excl: true };
      var cs = catsOfItem(it); cs.forEach(function (c) { cats[c] = (cats[c] || 0) + 1; }); return { it: it, cats: cs };
    });
    var allExcl = items.length > 0 && items.every(function (x) { return x.excl; });
    var hay = norm([t.t, t.org, t.edr, t.tid, t.loc, t.reg].concat((t.items || []).map(function (i) { return i.d; })).join(' | '));
    var i = { mod: t.mod, cats: cats, catList: Object.keys(cats), items: items, matched: items.filter(function (x) { return x.cats.length; }).length, hay: hay, region: regionName(t.reg), group: statusGroup(t.st), allExcl: allExcl };
    try { Object.defineProperty(t, '_i', { value: i, enumerable: false, configurable: true, writable: true }); } catch (e) { /* ignore */ }
    return i;
  }

  // ---------- Довідники ----------
  var STATUS = {
    'active.enquiries': 'Період уточнень', 'active.tendering': 'Подання пропозицій',
    'active.pre-qualification': 'Прекваліфікація', 'active.pre-qualification.stand-still': 'Прекваліфікація',
    'active.auction': 'Аукціон', 'active.qualification': 'Кваліфікація', 'active.qualification.stand-still': 'Кваліфікація',
    'active.awarded': 'Пропозиції розглянуто', 'active': 'Активна', 'active.stage2.pending': 'Очікує другого етапу', 'active.stage2.waiting': 'Очікує другого етапу',
    'complete': 'Завершена', 'unsuccessful': 'Не відбулася', 'cancelled': 'Скасована'
  };
  var GROUPS = [
    { id: 'open', name: 'Подання пропозицій' }, { id: 'review', name: 'Розгляд' },
    { id: 'done', name: 'Завершені' }, { id: 'fail', name: 'Не відбулися' }
  ];
  function statusGroup(st) {
    st = st || '';
    if (st === 'active.enquiries' || st === 'active.tendering') return 'open';
    if (st === 'complete') return 'done';
    if (st === 'unsuccessful' || st === 'cancelled') return 'fail';
    return 'review';
  }
  function statusName(st) { return STATUS[st] || st || 'Невідомо'; }
  var TYPES = {
    belowThreshold: 'Спрощена закупівля', aboveThreshold: 'Відкриті торги з особливостями', aboveThresholdUA: 'Відкриті торги',
    aboveThresholdEU: 'Відкриті торги з публікацією англійською', priceQuotation: 'Запит ціни (електронний каталог)',
    reporting: 'Звіт про договір', negotiation: 'Переговорна процедура', 'negotiation.quick': 'Переговорна скорочена',
    competitiveDialogueUA: 'Конкурентний діалог', competitiveDialogueEU: 'Конкурентний діалог з публікацією англійською',
    'competitiveDialogueUA.stage2': 'Конкурентний діалог, 2 етап', 'competitiveDialogueEU.stage2': 'Конкурентний діалог англ., 2 етап',
    closeFrameworkAgreementUA: 'Рамкова угода', closeFrameworkAgreementSelectionUA: 'Відбір за рамковою угодою',
    competitiveOrdering: 'Відбір у динамічній системі', requestForProposal: 'Запит пропозицій', esco: 'Енергосервіс',
    simple: 'Закупівля без системи', 'aboveThresholdUA.defense': 'Оборонні торги', 'simple.defense': 'Оборонна спрощена'
  };
  function typeName(p) { return TYPES[p] || p || 'Інший вид'; }
  var REGIONS = ['м. Київ', 'Вінницька обл.', 'Волинська обл.', 'Дніпропетровська обл.', 'Донецька обл.', 'Житомирська обл.', 'Закарпатська обл.',
    'Запорізька обл.', 'Івано-Франківська обл.', 'Київська обл.', 'Кіровоградська обл.', 'Луганська обл.', 'Львівська обл.', 'Миколаївська обл.',
    'Одеська обл.', 'Полтавська обл.', 'Рівненська обл.', 'Сумська обл.', 'Тернопільська обл.', 'Харківська обл.', 'Херсонська обл.',
    'Хмельницька обл.', 'Черкаська обл.', 'Чернівецька обл.', 'Чернігівська обл.', 'АР Крим', 'м. Севастополь'];
  // Порядок видів у фільтрі: спершу найпоширеніші
  var TYPE_ORDER = ['aboveThreshold', 'belowThreshold', 'priceQuotation', 'reporting', 'negotiation', 'negotiation.quick', 'aboveThresholdUA', 'aboveThresholdEU',
    'competitiveOrdering', 'requestForProposal', 'closeFrameworkAgreementUA', 'closeFrameworkAgreementSelectionUA', 'competitiveDialogueUA', 'competitiveDialogueEU',
    'competitiveDialogueUA.stage2', 'competitiveDialogueEU.stage2', 'aboveThresholdUA.defense', 'simple.defense', 'esco'];
  function regionName(r) {
    r = String(r || '').trim().replace(/\s+/g, ' '); if (!r) return 'Регіон не вказано';
    if (/^(м\.?\s*)?київ$/i.test(r)) return 'м. Київ';
    if (/^(м\.?\s*)?севастополь$/i.test(r)) return 'м. Севастополь';
    if (/крим/i.test(r)) return 'АР Крим';
    var m = /^(.+?)\s+(область|обл\.?)$/i.exec(r); if (m) r = m[1];
    var low = r.toLowerCase();
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].toLowerCase().indexOf(low + ' ') === 0) return REGIONS[i];
    return m ? m[1] + ' обл.' : r;
  }
  // Повні списки для фільтрів: усі регіони й види, навіть якщо тендерів з ними ще немає
  function regionList(extra) { var out = REGIONS.slice(); Object.keys(extra || {}).forEach(function (r) { if (out.indexOf(r) < 0) out.push(r); }); return out; }
  function typeList(extra) { var out = TYPE_ORDER.slice(); Object.keys(extra || {}).forEach(function (t) { if (t && out.indexOf(t) < 0) out.push(t); }); return out; }

  // ---------- Стан ----------
  var DEF_F = { cats: [], period: '30', from: '', to: '', region: '', type: '', status: '', sort: 'new', q: '' };
  function defaults() { return { url: '', since: '', lastSync: 0, prevOpen: 0, lastOpen: 0, server: null, starred: {}, f: JSON.parse(JSON.stringify(DEF_F)) }; }
  var S = defaults();
  var ALL = [];            // тендери в пам’яті
  var BY = {};

  function load() {
    try { var raw = root.localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); S = Object.assign(defaults(), o); S.f = Object.assign(JSON.parse(JSON.stringify(DEF_F)), o.f || {}); } } catch (e) { S = defaults(); }
    S.prevOpen = S.lastOpen || 0; S.lastOpen = Date.now(); save();
  }
  function save() { try { root.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* немає місця */ } }

  // ---------- Сховище тендерів (IndexedDB, а якщо його немає — пам’ять) ----------
  var mem = {};
  var idb = null;
  function openDb() {
    if (idb) return idb;
    idb = new Promise(function (res) {
      if (!root.indexedDB) return res(null);
      var rq; try { rq = root.indexedDB.open('medtender', 1); } catch (e) { return res(null); }
      rq.onupgradeneeded = function () { rq.result.createObjectStore('tenders', { keyPath: 'id' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { res(null); };
    });
    return idb;
  }
  function dbAll() {
    return openDb().then(function (db) {
      if (!db) return Object.keys(mem).map(function (k) { return mem[k]; });
      return new Promise(function (res) { var rq = db.transaction('tenders').objectStore('tenders').getAll(); rq.onsuccess = function () { res(rq.result || []); }; rq.onerror = function () { res([]); }; });
    });
  }
  function dbPut(list) {
    return openDb().then(function (db) {
      if (!db) { list.forEach(function (t) { mem[t.id] = t; }); return; }
      return new Promise(function (res) { var tx = db.transaction('tenders', 'readwrite'); var os = tx.objectStore('tenders'); list.forEach(function (t) { os.put(t); }); tx.oncomplete = res; tx.onerror = res; tx.onabort = res; });
    });
  }
  function dbClear() {
    return openDb().then(function (db) {
      mem = {}; if (!db) return;
      return new Promise(function (res) { var tx = db.transaction('tenders', 'readwrite'); tx.objectStore('tenders').clear(); tx.oncomplete = res; tx.onerror = res; });
    });
  }

  function init() {
    load();
    return dbAll().then(function (list) { ALL = list; BY = {}; ALL.forEach(function (t) { BY[t.id] = t; }); return ALL.length; });
  }

  function clean(t) { var o = {}; Object.keys(t).forEach(function (k) { if (k !== '_i') o[k] = t[k]; }); return o; }
  function merge(list) {
    var add = 0, upd = 0, fresh = [];
    list.forEach(function (t) {
      if (!t || !t.id) return;
      t = clean(t);
      if (BY[t.id]) { if ((t.mod || '') < (BY[t.id].mod || '')) return; var i = ALL.indexOf(BY[t.id]); ALL[i] = t; upd++; } else { ALL.push(t); add++; }
      BY[t.id] = t; fresh.push(t);
    });
    return dbPut(fresh).then(function () { return { added: add, updated: upd }; });
  }

  // ---------- Синхронізація з Google-скриптом ----------
  // Прибирає те, що Google додає при кількох акаунтах (/u/1/), пробіли й зайві параметри
  function normUrl(u) {
    u = String(u || '').replace(/\s+/g, '');
    u = u.replace(/^(https:\/\/script\.google\.com)\/(a\/macros\/[^/]+|macros)\/u\/\d+\//, '$1/$2/');
    u = u.replace(/[?#].*$/, '');
    return u;
  }
  function validUrl(u) { return /^https:\/\/script\.google(usercontent)?\.com\/.+/.test(normUrl(u)); }
  function err(code, detail) { var e = new Error(code); e.code = code; e.detail = detail; return e; }
  function getPage(url, since) {
    var u = url.trim() + (url.indexOf('?') >= 0 ? '&' : '?') + 'limit=' + PAGE + (since ? '&since=' + encodeURIComponent(since) : '');
    return api.fetch(u, { redirect: 'follow', cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw err('HTTP', r.status);
      return r.json().catch(function () { throw err('NOT_JSON'); });
    }, function () { throw err('NETWORK'); }).then(function (j) {
      if (!j || j.ok !== true || j.app !== 'medtender') throw err(j && j.error ? 'SERVER' : 'NOT_OURS', j && (j.message || j.error));
      return j;
    });
  }
  var syncing = null;
  function sync(opts) {
    opts = opts || {};
    if (syncing) return syncing;
    var url = normUrl(opts.url || S.url);
    if (!validUrl(url)) return Promise.reject(err('NO_URL'));
    var since = opts.url && opts.url !== S.url ? '' : S.since;
    // Старий скрипт (v1) рахував курсор за часом зміни тендеру й губив тендери, знайдені пізніше.
    // Поки скрипт не v2, щоразу забираємо весь список; після переходу на v2 — один повний раз.
    if (S.apiV !== 2) since = '';
    var tot = { added: 0, updated: 0, pages: 0 };
    syncing = (function step(guard) {
      return getPage(url, since).then(function (j) {
        tot.pages++;
        return merge(j.tenders || []).then(function (r) {
          tot.added += r.added; tot.updated += r.updated; since = j.next || since;
          S.url = url.trim(); S.since = since; S.apiV = j.v || 1; S.server = j.server || null; S.total = j.total; S.lastSync = Date.now(); save();
          if (j.more && guard < 60) return step(guard + 1);
          return tot;
        });
      });
    })(0).then(function (r) { syncing = null; return r; }, function (e) { syncing = null; throw e; });
    return syncing;
  }
  function errText(e) {
    var c = e && e.code;
    if (c === 'NO_URL') return 'Вставте URL веб-додатка з Google Apps Script. Він починається з https://script.google.com/';
    if (c === 'NETWORK') return 'Немає зв’язку з Google. Перевірте інтернет і спробуйте ще раз.';
    if (c === 'HTTP' && e.detail === 404) return 'Google не знайшов скрипт за цим URL (помилка 404). Потрібен «URL веб-додатка» з вікна «Керування розгортаннями», що закінчується на /exec, а не /dev і не адреса редактора. Якщо розгортання видалено чи архівовано, створіть нове.';
    if (c === 'HTTP' && (e.detail === 401 || e.detail === 403)) return 'Google не пускає до скрипта (помилка ' + e.detail + '). У розгортанні має бути доступ «Усі», а не «Будь-хто з обліковим записом Google».';
    if (c === 'HTTP') return 'Google відповів помилкою ' + e.detail + '. Спробуйте ще раз за хвилину.';
    if (c === 'NOT_JSON') return 'За цим URL відкривається не скрипт Медтендерів. Перевірте, що скопіювали «URL веб-додатка» і доступ «Усі».';
    if (c === 'NOT_OURS') return 'За цим URL працює інший скрипт. Потрібен URL розгортання скрипта Медтендерів.';
    if (c === 'SERVER') return 'Скрипт повернув помилку' + (e.detail ? ': ' + String(e.detail).slice(0, 140) : '') + '.';
    return 'Не вдалося оновити: ' + (e && e.message ? e.message : e);
  }

  // ---------- Фільтри ----------
  var DAY = 864e5;
  function dayStart(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function periodRange(f, now) {
    now = now || Date.now();
    if (f.period === 'custom') {
      var a = f.from ? new Date(f.from + 'T00:00:00').getTime() : 0, b = f.to ? new Date(f.to + 'T00:00:00').getTime() + DAY : Infinity;
      return [a, b];
    }
    if (f.period === 'all') return [0, Infinity];
    if (f.period === 'today') return [dayStart(now), Infinity];
    var n = parseInt(f.period, 10) || 30;
    return [dayStart(now) - (n - 1) * DAY, Infinity];
  }
  function pubMs(t) { var x = Date.parse(t.pub || t.cr || ''); return isNaN(x) ? 0 : x; }
  function endMs(t) { var x = Date.parse(t.end || ''); return isNaN(x) ? 0 : x; }

  // skip: яку умову не застосовувати (щоб порахувати кількості для цього ж фільтра)
  // Тендери, які не показуємо взагалі (за назвою тендеру)
  var HIDE_TITLE = /стоматолог\S*\s+(матеріал|материал)|(матеріал|материал)\S*\s+стоматолог/i;
  function hidden(t) { return HIDE_TITLE.test(t.t || '') || info(t).allExcl; }
  function pass(t, f, skip, range) {
    var i = info(t);
    if (hidden(t)) return false;
    if (skip !== 'cats') {
      var want = f.cats || [];
      if (!want.length) { if (!i.catList.length) return false; }
      else {
        var ok = want.some(function (c) { return c === 'other' ? !i.catList.length : !!i.cats[c]; });
        if (!ok) return false;
      }
    }
    if (skip !== 'period') { var p = pubMs(t); if (p < range[0] || p >= range[1]) return false; }
    if (skip !== 'region' && f.region && i.region !== f.region) return false;
    if (skip !== 'type' && f.type && t.pmt !== f.type) return false;
    if (skip !== 'status' && f.status && i.group !== f.status) return false;
    if (skip !== 'q' && f.q) { var words = norm(f.q).trim().split(' '); for (var k = 0; k < words.length; k++) if (words[k] && i.hay.indexOf(words[k]) < 0) return false; }
    return true;
  }
  function sorter(sort) {
    if (sort === 'deadline') return function (a, b) {
      var ao = info(a).group === 'open', bo = info(b).group === 'open';
      if (ao !== bo) return ao ? -1 : 1;
      return ao ? endMs(a) - endMs(b) : pubMs(b) - pubMs(a);
    };
    if (sort === 'value') return function (a, b) { return (b.val || 0) - (a.val || 0) || pubMs(b) - pubMs(a); };
    return function (a, b) { return pubMs(b) - pubMs(a) || (a.tid < b.tid ? 1 : -1); };
  }
  function query(f, opts) {
    opts = opts || {}; f = f || S.f;
    var range = periodRange(f, opts.now);
    var src = opts.starred ? ALL.filter(function (t) { return S.starred[t.id]; }) : ALL;
    return src.filter(function (t) { return pass(t, f, null, range); }).sort(sorter(f.sort));
  }
  // Кількості для кожного значення фільтра з урахуванням решти фільтрів
  function facets(f, opts) {
    opts = opts || {}; f = f || S.f;
    var range = periodRange(f, opts.now);
    var src = opts.starred ? ALL.filter(function (t) { return S.starred[t.id]; }) : ALL;
    var out = { cats: {}, region: {}, type: {}, status: {} };
    src.forEach(function (t) {
      var i = info(t);
      if (pass(t, f, 'cats', range)) { i.catList.forEach(function (c) { out.cats[c] = (out.cats[c] || 0) + 1; }); if (!i.catList.length) out.cats.other = (out.cats.other || 0) + 1; }
      if (pass(t, f, 'region', range)) out.region[i.region] = (out.region[i.region] || 0) + 1;
      if (pass(t, f, 'type', range)) out.type[t.pmt] = (out.type[t.pmt] || 0) + 1;
      if (pass(t, f, 'status', range)) out.status[i.group] = (out.status[i.group] || 0) + 1;
    });
    return out;
  }
  function setF(patch) { Object.keys(patch).forEach(function (k) { S.f[k] = patch[k]; }); save(); }
  function resetF() { var keep = S.f.sort; S.f = JSON.parse(JSON.stringify(DEF_F)); S.f.sort = keep; save(); }
  function activeCount(f) { f = f || S.f; var n = 0; if (f.cats.length) n++; if (f.period !== DEF_F.period) n++; if (f.region) n++; if (f.type) n++; if (f.status) n++; return n; }

  function toggleStar(id) { if (S.starred[id]) delete S.starred[id]; else S.starred[id] = Date.now(); save(); return !!S.starred[id]; }
  function isNew(t) { return S.prevOpen > 0 && pubMs(t) > S.prevOpen; }

  // ---------- Формат ----------
  var MON = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(iso, withTime) {
    var x = Date.parse(iso || ''); if (isNaN(x)) return '';
    var d = new Date(x), now = new Date();
    var s = d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '');
    return withTime ? s + ', ' + two(d.getHours()) + ':' + two(d.getMinutes()) : s;
  }
  function fmtMoney(v, cur) {
    if (v == null || isNaN(v)) return '';
    var s = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return s + ' ' + (!cur || cur === 'UAH' ? '₴' : cur);
  }
  function fmtQty(q) { if (q == null) return ''; return (Math.round(q * 1000) / 1000).toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  // Скільки лишилося до кінця подачі: текст і рівень терміновості
  function deadline(t, now) {
    now = now || Date.now();
    var e = endMs(t); if (!e || info(t).group !== 'open') return null;
    var left = e - now;
    if (left <= 0) return { text: 'Подачу завершено', level: 'past', frac: 0 };
    var start = Date.parse(t.pub || '') || (e - 7 * DAY);
    var frac = Math.max(0, Math.min(1, left / Math.max(1, e - start)));
    var d = Math.floor(left / DAY), h = Math.floor(left / 36e5);
    var text = h < 24 ? (h < 1 ? 'Менше години' : 'Ще ' + h + ' ' + plural(h, 'година', 'години', 'годин')) : 'Ще ' + d + ' ' + plural(d, 'день', 'дні', 'днів');
    return { text: text, level: left < 2 * DAY ? 'hot' : left < 5 * DAY ? 'soon' : 'ok', frac: frac };
  }
  function prozorroUrl(t) { return 'https://prozorro.gov.ua/tender/' + encodeURIComponent(t.tid || t.id); }

  function wipe() { ALL = []; BY = {}; var url = S.url, starred = S.starred; S = defaults(); S.url = url; S.starred = starred; save(); return dbClear(); }

  var api = {
    VERSION: VERSION, CATS: CATS, CAT_BY: CAT_BY, OTHER: OTHER, GROUPS: GROUPS, TYPES: TYPES,
    fetch: function (u, o) { return root.fetch(u, o); },
    get S() { return S; }, all: function () { return ALL; }, byId: function (id) { return BY[id]; },
    init: init, save: save, sync: sync, normUrl: normUrl, errText: errText, validUrl: validUrl, merge: merge, wipe: wipe,
    catsOfItem: catsOfItem, info: info, statusName: statusName, statusGroup: statusGroup, typeName: typeName, regionName: regionName, regionList: regionList, typeList: typeList,
    query: query, facets: facets, setF: setF, resetF: resetF, activeCount: activeCount, periodRange: periodRange,
    toggleStar: toggleStar, isNew: isNew, deadline: deadline, prozorroUrl: prozorroUrl,
    fmtDate: fmtDate, fmtMoney: fmtMoney, fmtQty: fmtQty, plural: plural, pubMs: pubMs, norm: norm
  };
  root.MT = api;
})(typeof window !== 'undefined' ? window : globalThis);
