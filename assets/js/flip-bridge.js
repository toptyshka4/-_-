// assets/js/flip-bridge.js (DOM-observing version)
(function(){
  function normKey(n){ return String(n||'').replace(/\D/g,'').slice(-8).padStart(8,'0'); }
  function getMap(){
    try { return JSON.parse(localStorage.getItem('wagonFlipByNumber')) || {}; } catch(_){ return {}; }
  }
  function applyAll(){
    const map = getMap();
    document.querySelectorAll('[data-number]').forEach(root=>{
      const num = root.getAttribute('data-number');
      if (!num) return;
      const flipped = map[normKey(num)] === 1;
      const side = flipped ? 'right' : 'left';
      if (root.dataset.workingSide !== side){
        root.dataset.workingSide = side;
      }
      // Если проект использует подстановку файлов _inverted.* — обновим src
      try {
        if (typeof getWagonImgSrcBy === 'function'){
          const img = root.querySelector('.wagon img');
          const model = root.dataset.model || '';
          if (img) {
            const want = getWagonImgSrcBy(num, model);
            if (want && img.getAttribute('src') !== want) img.src = want;
          }
        }
      } catch(e){}
    });
  }

  // Первичные прогонки
  document.addEventListener('DOMContentLoaded', applyAll);
  window.addEventListener('load', applyAll);

  // Редко, но полезно: при изменении localStorage с другой вкладки
  window.addEventListener('storage', function(e){
    if (e.key === 'wagonFlipByNumber') applyAll();
  });

  // Подхватываем отложенные/динамические изменения DOM (hydrate, добавление вагонов)
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      if (m.type === 'childList' || (m.type === 'attributes' && m.attributeName === 'data-number')){
        // Дешёвый троттлинг одной задачей
        if (!mo._raf){
          mo._raf = requestAnimationFrame(()=>{
            mo._raf = null;
            applyAll();
          });
        }
        break;
      }
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-number'] });

  // Хук для явного вызова после вашей hydrate()
  window.__wagonFlipBridgeApply = applyAll;
})();
