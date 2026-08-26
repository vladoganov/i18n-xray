/**
 * The squarified treemap layout, as plain JavaScript source.
 *
 * It is kept as a string because it has to be inlined verbatim into the report
 * — but a string is also untestable, which is exactly the wrong trade for the
 * one piece of real geometry in the viewer. So the same source is `new
 * Function`-ed in the tests: what runs there is byte-for-byte what ships.
 *
 * Algorithm: Bruls, Huizing & van Wijk. Fill the container's shorter side with
 * a row, extending it while the worst aspect ratio in that row keeps improving,
 * then recurse into what is left.
 */
export const TREEMAP_LAYOUT_SOURCE = `
function worst(row, side, scale) {
  var sum = 0, max = -Infinity, min = Infinity;
  for (var i = 0; i < row.length; i++) {
    var v = row[i].value * scale;
    sum += v;
    if (v > max) max = v;
    if (v < min) min = v;
  }
  var s2 = side * side, sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

function squarify(items, box) {
  var total = 0;
  for (var i = 0; i < items.length; i++) total += items[i].value;
  if (total <= 0 || box.w <= 0 || box.h <= 0) return [];
  var scale = (box.w * box.h) / total;
  var out = [];
  var rest = items.slice();
  var r = { x: box.x, y: box.y, w: box.w, h: box.h };

  while (rest.length) {
    var side = Math.min(r.w, r.h);
    if (side <= 0) break;
    var row = [rest[0]];
    var best = worst(row, side, scale);
    for (var j = 1; j < rest.length; j++) {
      var trial = row.concat([rest[j]]);
      var next = worst(trial, side, scale);
      if (next > best) break;
      row = trial;
      best = next;
    }
    var rowArea = 0;
    for (var k = 0; k < row.length; k++) rowArea += row[k].value * scale;
    var thickness = rowArea / side;
    var horizontal = r.w >= r.h;
    var offset = 0;
    for (var m = 0; m < row.length; m++) {
      var length = (row[m].value * scale) / thickness;
      out.push(
        horizontal
          ? { item: row[m], x: r.x, y: r.y + offset, w: thickness, h: length }
          : { item: row[m], x: r.x + offset, y: r.y, w: length, h: thickness }
      );
      offset += length;
    }
    if (horizontal) { r.x += thickness; r.w -= thickness; }
    else { r.y += thickness; r.h -= thickness; }
    rest = rest.slice(row.length);
  }
  return out;
}
`
