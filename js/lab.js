import { LAB } from './data.js';
import { drawLabThumb, lazyDraw } from './drawings.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function initLab(section) {
  const list = section.querySelector('.lab-list');
  list.innerHTML = LAB.map((x, i) => `
    <li class="lab-row">
      <canvas class="lab-thumb" aria-hidden="true"></canvas>
      <p class="lab-id mono">${esc(x.id)}<br><span class="muted">${esc(x.date)}</span></p>
      <div class="lab-body">
        <h3>${esc(x.title)}</h3>
        <p>${esc(x.text)}${x.href ? ` <a href="${esc(x.href)}">${esc(x.hrefLabel)} ↑</a>` : ''}</p>
        ${x.note ? `<span class="note lab-note" data-arrow="left">${esc(x.note)}</span>` : ''}
      </div>
      <ul class="lab-tags mono" aria-label="Categories">${x.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="lab-status mono" style="--status:${x.statusColor}"><span class="visually-hidden">Status: </span>${esc(x.status)}</p>
    </li>`).join('');

  list.querySelectorAll('.lab-thumb').forEach((c, i) => {
    lazyDraw(c, () => drawLabThumb(c, LAB[i].thumb, 101 + i));
  });
}
