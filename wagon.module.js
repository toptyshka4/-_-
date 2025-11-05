/*! wagon.module.js — UI для вагонов: подгрузка БД, выбор картинки по типу и инверсия стороны */

(function (global) {
  const WagonUI = {};

  // ====== Состояние по умолчанию (ОТНОСИТЕЛЬНЫЕ пути для GitHub Pages!) ======
  const _state = {
    dataUrl: './data/wagons_2000.json',
    youngYear: 2018,
    cellSelector: '.wagon, [data-number]',
    typeToAsset: {
      'одноэтажный': './assets/wagon_single.jpg',
      'двухэтажный': './assets/wagon_double.jpg'
    },
    debug: false
  };

  // ====== Простое логирование ======
  function log(...args) {
    if (_state.debug) console.log('[WagonUI]', ...args);
  }

  // ====== БД в памяти ======
  const db = {
    byNumber: new Map() // ключ: нормализованный номер '########'
  };

  // ====== Утилиты ======
  function normalizeWagonNumber(num) {
    if (num == null) return '';
    const s = String(num).replace(/[^\d]/g, '');
    return s.length ? s : '';
  }

  function getField(obj, list) {
    for (const k of list) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return undefined;
  }

  // ====== Загрузка БД ======
  async function loadData() {
    const url = _state.dataUrl;
    log('Loading DB:', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('DB fetch failed: ' + res.status + ' ' + res.statusText);
    const arr = await res.json();
    db.byNumber.clear();
    for (const row of arr) {
      const numberRaw = getField(row, ['number', 'Номер', 'Номер вагона']);
      const num = normalizeWagonNumber(numberRaw);
      if (!num) continue;
      db.byNumber.set(num, row);
    }
    log('DB loaded. Records:', db.byNumber.size);
  }

  // ====== Поиск записи по элементу ======
  function extractKey(el) {
    // приоритет: data-number на самом элементе
    const selfNum = el.getAttribute('data-number') || el.dataset.number;
    if (selfNum) {
      const n = normalizeWagonNumber(selfNum);
      return n ? { type: 'number', value: n } : null;
    }
    // по вложенному атрибуту
    const child = el.querySelector('[data-number]');
    if (child) {
      const n = normalizeWagonNumber(child.getAttribute('data-number') || child.dataset.number);
      return n ? { type: 'number', value: n } : null;
    }
    // если внутри уже есть <img src="...00112233.jpg"> — извлечём номер из пути
    const img = el.querySelector('img[src]');
    if (img && img.src) {
      const m = String(img.src).match(/(\d{6,})/);
      if (m) return { type: 'number', value: m[1] };
    }
    return null;
  }

  function getRecByKey(key) {
    if (!key) return null;
    if (key.type === 'number') {
      return db.byNumber.get(key.value) || null;
    }
    return null;
  }

  // ====== Разрешение картинки с учётом «инверсии» ======
  function resolveAssetByType(typeName, el) {
    if (!typeName) return null;
    const type = String(typeName).toLowerCase();
    let path = _state.typeToAsset[type] || null;
    if (!path) return null;

    // определяем, нужно ли инвертировать
    let node = el, inverted = false;
    while (node && node !== document.body) {
      const ds = node.dataset || {};
      if (
        ds.side === 'invert' ||
        ds.flip === '1' ||
        ds.inverted === '1' ||
        ds.workingSide === 'right'
      ) { inverted = true; break; }

      if (node.classList && (node.classList.contains('is-inverted') || node.classList.contains('flip-h'))) {
        inverted = true; break;
      }
      node = node.parentElement;
    }

    if (inverted) {
      const dot = path.lastIndexOf('.');
      const inv = dot > 0 ? path.slice(0, dot) + '_inverted' + path.slice(dot) : path + '_inverted';
      return inv;
    }
    return path;
  }

  // ====== Рендер доп. информации (подсказка/бэйджи, опционально) ======
  function buildTooltipHTML(rec) {
    if (!rec) return '';
    const rows = [
      ['Тип вагона', getField(rec, ['Тип вагона', 'Тип_вагона'])],
      ['Кол-во мест', getField(rec, ['Кол-во мест'])],
      ['ЭЧТК', rec['ЭЧТК']],
      ['УКВ', rec['УКВ']],
      ['Переход р/с', rec['Переход р/с']],
      ['Переход н/с', rec['Переход н/с']],
      ['Сцепка р/с', rec['Сцепка р/с']],
      ['Сцепка н/с', rec['Сцепка н/с']],
      ['Постройка', rec['Постройка']],
      ['Модель вагона', rec['Модель вагона']]
    ];
    let html = '<div class="wagon-tooltip">';
    html += '<div class="title">Информация</div>';
    for (const [k, v] of rows) {
      html += `<div class="row"><div class="k">${k}</div><div class="v">${v ?? '—'}</div></div>`;
    }
    html += '</div>';
    return html;
  }

  // ====== Обогащение одного элемента ======
  function enhance(el) {
    try {
      const key = extractKey(el);
      const rec = getRecByKey(key);

      // <img> внутри элемента
      let img = el.querySelector('img.wagon-img');
      if (!img) {
        img = document.createElement('img');
        img.className = 'wagon-img';
        el.appendChild(img);
      }

      // тип вагона из БД
      let typeName = null;
      if (rec) {
        typeName = rec['Модель вагона'] || rec['Тип вагона'] || rec['Тип_вагона'] || rec.type;
      }

      // выбираем ресурс с учётом инверсии
      const src = resolveAssetByType(typeName, el);
      if (src) {
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      } else {
        // если тип не определён, визуально отметить
        el.classList.add('wagon-missing');
      }

      // подсказка (опционально — можно убрать)
      if (rec && !el.querySelector('.wagon-tooltip')) {
        const wrap = document.createElement('div');
        wrap.innerHTML = buildTooltipHTML(rec);
        const tip = wrap.firstChild;
        tip.style.position = 'absolute';
        tip.style.left = '-9999px'; // скрыто, показывайте в своём UI по ховеру/клику
        el.appendChild(tip);
      }
    } catch (e) {
      log('enhance failed', e);
    }
  }

  // ====== Скан страницы ======
  function scan() {
    const elements = document.querySelectorAll(_state.cellSelector);
    log('Found elements:', elements.length);
    elements.forEach(enhance);
  }

  // ====== Наблюдение за изменениями DOM ======
  function observe() {
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.addedNodes) {
          m.addedNodes.forEach(n => {
            if (!(n instanceof HTMLElement)) return;
            if (n.matches && n.matches(_state.cellSelector)) enhance(n);
            n.querySelectorAll && n.querySelectorAll(_state.cellSelector).forEach(enhance);
          });
        }
        if (m.type === 'attributes' && m.target instanceof HTMLElement) {
          if (m.target.matches(_state.cellSelector)) enhance(m.target);
        }
      }
    });
    mo.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-number', 'data-side', 'data-flip', 'data-inverted', 'data-working-side', 'class']
    });
  }

  // ====== Публичный API ======
  WagonUI.init = async function init(options) {
    Object.assign(_state, options || {});
    await loadData();
    scan();
    observe();
    log('WagonUI initialized', _state);
  };

  // авто-инициализация (если <script data-auto-init>)
  function auto() {
    const s = document.currentScript;
    if (s && s.dataset.autoInit !== undefined) {
      WagonUI.init({
        dataUrl: s.dataset.dataUrl || _state.dataUrl,
        youngYear: s.dataset.youngYear ? Number(s.dataset.youngYear) : _state.youngYear,
        cellSelector: s.dataset.cellSelector || _state.cellSelector
      });
    }
  }

  try { auto(); } catch (e) {}

  global.WagonUI = WagonUI;
})(window);
