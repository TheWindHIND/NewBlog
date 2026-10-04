/**
 * 本地动效测试夹具（只写进 dist/，不进仓库）
 *
 * 无头截图不会动鼠标，而「双下巴 / 尾巴割裂」只在动起来时才出现。
 * 这里把房间页复制一份，注入一段脚本，用**和生产完全相同的公式**
 * 把猫固定在任意姿态（cx/cy/tail 由查询参数给），再截图复核。
 *
 *   node scripts/_motion-fixture.cjs
 *   → http://[::1]:4321/NewBlog/__motion/?cx=0.9&cy=1&tail=9
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist', 'room', 'index.html');
const outDir = path.join(__dirname, '..', 'dist', '__motion');
const out = path.join(outDir, 'index.html');

let html = fs.readFileSync(src, 'utf8');

const inject = `
<style id="fx"></style>
<script>
  // 与 Live2DCat.astro 的视线跟随公式逐字一致
  (() => {
    const p = new URLSearchParams(location.search);

    // bg=magenta：把房间布景藏起来、页面刷成品红 —— 图层若缺像素就会漏成品红，一眼可见
    if (p.get('bg') === 'magenta') {
      document.getElementById('fx').textContent =
        '.scene{display:none!important}body{background:#ff00ff!important}' +
        '.stage,.cat-room{background:transparent!important}';
    }

    const cx = parseFloat(p.get('cx') || '0');
    const cy = parseFloat(p.get('cy') || '0');
    const tailDeg = p.get('tail');

    const head = document.querySelector('[data-cat-head]');
    const body = document.querySelector('[data-cat-body]');
    if (head) {
      head.style.transform =
        'translate(' + (cx * 1.3).toFixed(2) + '%, ' + (cy * 0.12).toFixed(2) + '%) ' +
        'rotate(' + (cx * 2.4).toFixed(2) + 'deg) ' +
        'scaleY(' + (1 - cy * 0.05).toFixed(4) + ')';
    }
    if (body) {
      body.style.transform =
        'translateX(' + (cx * 0.9).toFixed(2) + '%) rotate(' + (cx * 1.1).toFixed(2) + 'deg)';
    }
    if (tailDeg !== null) {
      const tail = document.querySelector('.tail');
      if (tail) {
        tail.style.setProperty('animation', 'none', 'important');
        tail.style.setProperty('transform', 'rotate(' + tailDeg + 'deg)', 'important');
      }
    }
  })();
</script>
</body>`;

html = html.replace('</body>', inject);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, html);
console.log('fixture ->', out);
