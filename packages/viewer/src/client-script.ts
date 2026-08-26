/**
 * The browser half of the report: selection, hover and tile painting around
 * the shared squarified-layout source. No framework, no network, no build step — this string is
 * inlined verbatim into a `<script>` tag.
 *
 * Everything it needs is precomputed and embedded as JSON; it does no analysis.
 * The finding lists are already in the DOM, so with JavaScript disabled the
 * page still shows every finding — only the treemap is lost, and the table view
 * covers that.
 */
import { TREEMAP_LAYOUT_SOURCE } from './treemap-layout'

export const CLIENT_SCRIPT = `
(function () {
  var node = document.getElementById('report-data');
  if (!node) return;
  var data = JSON.parse(node.textContent || '{}');
  var cells = data.namespaces || [];
  var host = document.getElementById('treemap');
  var tip = document.getElementById('tooltip');
  if (!host || !cells.length) return;

${TREEMAP_LAYOUT_SOURCE}

  var selected = data.initialSelection || (cells[0] && cells[0].name) || null;

  function select(name) {
    selected = name;
    var panels = document.querySelectorAll('.ns-detail');
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.toggle('is-selected', panels[i].getAttribute('data-ns') === name);
    }
    var tiles = host.querySelectorAll('.tile');
    for (var j = 0; j < tiles.length; j++) {
      tiles[j].setAttribute('aria-pressed', tiles[j].getAttribute('data-ns') === name ? 'true' : 'false');
    }
  }

  function showTip(event, cell) {
    if (!tip) return;
    tip.innerHTML =
      '<b>' + cell.label + '</b><br>' + cell.keys + ' keys · ' + cell.severityLabel +
      '<br>' + cell.dead + ' dead · ' + cell.duplicated + ' duplicated';
    tip.classList.add('is-on');
    var pad = 14;
    var box = tip.getBoundingClientRect();
    var x = Math.min(event.clientX + pad, window.innerWidth - box.width - 8);
    var y = event.clientY + pad + box.height > window.innerHeight
      ? event.clientY - box.height - pad
      : event.clientY + pad;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }

  function hideTip() { if (tip) tip.classList.remove('is-on'); }

  function draw() {
    var width = host.clientWidth;
    var height = host.clientHeight;
    if (!width || !height) return;
    var sorted = cells.slice().sort(function (a, b) { return b.keys - a.keys; });
    var laid = squarify(
      sorted.map(function (c) { return { value: Math.max(c.keys, 0.0001), cell: c }; }),
      { x: 0, y: 0, w: width, h: height }
    );

    host.textContent = '';
    for (var i = 0; i < laid.length; i++) {
      var box = laid[i];
      var cell = box.item.cell;
      var tile = document.createElement('button');
      tile.type = 'button';
      /* A 2px surface gap between fills, rather than a border around each. */
      tile.className = 'tile t-' + cell.severity;
      tile.style.left = (box.x + 1) + 'px';
      tile.style.top = (box.y + 1) + 'px';
      tile.style.width = Math.max(box.w - 2, 0) + 'px';
      tile.style.height = Math.max(box.h - 2, 0) + 'px';
      tile.setAttribute('data-ns', cell.name);
      tile.setAttribute('aria-pressed', cell.name === selected ? 'true' : 'false');
      tile.setAttribute('aria-label',
        cell.label + ', ' + cell.keys + ' keys, ' + cell.severityLabel + ', ' +
        cell.dead + ' dead, ' + cell.duplicated + ' duplicated');

      /* Never render a label that will not fit — a clipped tile label is worse
         than none, and the tooltip and table view still carry the numbers. */
      if (box.w < 54 || box.h < 30) tile.classList.add('is-tiny');
      else if (box.w < 132 || box.h < 74) tile.classList.add('is-compact');

      var name = document.createElement('div');
      name.className = 't-name';
      name.textContent = cell.label;
      var meta = document.createElement('div');
      meta.className = 't-meta';
      meta.textContent = cell.keys + ' keys · ' + cell.severityLabel;
      var chips = document.createElement('div');
      chips.className = 't-chips';
      var dead = document.createElement('span');
      dead.textContent = cell.dead + ' dead';
      var dup = document.createElement('span');
      dup.textContent = cell.duplicated + ' duplicated';
      chips.appendChild(dead);
      chips.appendChild(dup);
      tile.appendChild(name);
      tile.appendChild(meta);
      tile.appendChild(chips);

      (function (c) {
        tile.addEventListener('click', function () { select(c.name); });
        tile.addEventListener('mousemove', function (e) { showTip(e, c); });
        tile.addEventListener('mouseleave', hideTip);
        tile.addEventListener('focus', function () { select(c.name); });
        tile.addEventListener('blur', hideTip);
      })(cell);

      host.appendChild(tile);
    }
    select(selected);
  }

  draw();
  var pending;
  window.addEventListener('resize', function () {
    clearTimeout(pending);
    pending = setTimeout(draw, 120);
  });
})();
`
