// Use normalized coordinates so touch strokes stay aligned at every screen size.
const KanjiPad = (() => {
  const canvas = document.querySelector('#kanji-pad');
  const context = canvas.getContext('2d');
  const undo = document.querySelector('#undo-stroke');
  const clear = document.querySelector('#clear-drawing');
  let strokes = [], active = null, pointer = null, locked = false;
  function paint() {
    context.clearRect(0, 0, 600, 600);
    context.strokeStyle = '#d5d5d0'; context.lineWidth = 2;
    context.setLineDash([10, 10]);
    context.beginPath(); context.moveTo(300, 0); context.lineTo(300, 600);
    context.moveTo(0, 300); context.lineTo(600, 300); context.stroke();
    context.setLineDash([]); context.strokeStyle = '#252525'; context.fillStyle = '#252525';
    context.lineWidth = 12; context.lineCap = 'round'; context.lineJoin = 'round';
    for (const points of strokes) {
      context.beginPath(); context.moveTo(...points[0]);
      for (const point of points.slice(1)) context.lineTo(...point);
      context.stroke();
      if (points.length === 1) { context.beginPath(); context.arc(...points[0], 6, 0, 2 * Math.PI); context.fill(); }
    }
    undo.disabled = clear.disabled = locked || !strokes.length;
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * 600 / rect.width, (event.clientY - rect.top) * 600 / rect.height];
  }
  canvas.addEventListener('pointerdown', event => {
    if (locked || pointer !== null || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); pointer = event.pointerId; canvas.setPointerCapture(pointer);
    active = [point(event)]; strokes.push(active); paint();
  });
  canvas.addEventListener('pointermove', event => {
    if (locked || event.pointerId !== pointer || !active) return;
    event.preventDefault(); active.push(point(event)); paint();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, event => {
      if (event.pointerId === pointer) { pointer = null; active = null; }
    });
  }
  undo.addEventListener('click', () => { if (!locked) { strokes.pop(); paint(); } });
  clear.addEventListener('click', () => { if (!locked) { strokes = []; paint(); } });
  return {
    reset() { strokes = []; active = null; pointer = null; locked = false; paint(); },
    hasDrawing() { return strokes.length > 0; },
    lock() { locked = true; active = null; pointer = null; paint(); },
  };
})();
