// assets/js/flip-bridge.js
(function(){
  function getMap(){
    try { return JSON.parse(localStorage.getItem('wagonFlipByNumber')) || {}; } catch(_){ return {}; }
  }
  function applyAll(){
    const map = getMap();
    document.querySelectorAll('[data-number]').forEach(root=>{
      const num = root.getAttribute('data-number');
      if (!num) return;
      const flipped = map[String(num)] === 1;
      root.dataset.workingSide = flipped ? 'right' : 'left';
      try {
        if (typeof getWagonImgSrcBy === 'function'){
          const img = root.querySelector('.wagon img');
          const model = root.dataset.model || '';
          if (img) img.src = getWagonImgSrcBy(num, model);
        }
      } catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded', applyAll);
  window.addEventListener('storage', function(e){
    if (e.key === 'wagonFlipByNumber') applyAll();
  });
  window.__wagonFlipBridgeApply = applyAll;
})();
