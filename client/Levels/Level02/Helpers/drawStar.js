/**
 * Draws a 5-pointed star on a Phaser Graphics object.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx - center x
 * @param {number} cy - center y
 * @param {number} r  - outer radius
 * @param {number} color - fill color (hex)
 * @param {number} alpha - fill alpha
 * @param {number} [strokeAlpha=0.6] - stroke alpha
 */
export function drawStar(g, cx, cy, r, color, alpha, strokeAlpha = 0.6) {
  g.fillStyle(color, alpha);
  g.lineStyle(1.5, 0xffffff, strokeAlpha);
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a1 = Phaser.Math.DegToRad(-90 + i * 72);
    const a2 = Phaser.Math.DegToRad(-90 + i * 72 + 36);
    pts.push({ x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r });
    pts.push({ x: cx + Math.cos(a2) * (r * 0.45), y: cy + Math.sin(a2) * (r * 0.45) });
  }
  g.fillPoints(pts, true);
  g.strokePoints(pts, true);
}