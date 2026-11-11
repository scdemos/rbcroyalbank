/**
 * Steps: the labels become a vertical tab list and only the chosen step's body shows.
 * @param {Element} block
 */
function decorateSteps(block) {
  const items = [...block.querySelectorAll(':scope > .accordion-item')];
  const id = `steps-${Math.random().toString(36).slice(2, 8)}`;
  const list = document.createElement('div');
  list.className = 'accordion-steps-list';
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  const panels = document.createElement('div');
  panels.className = 'accordion-steps-panels';
  const tabs = items.map((item, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `${id}-tab-${i}`;
    tab.className = 'accordion-steps-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-panel-${i}`);
    // authored "1. Label" numbering moves into the panel badge
    tab.textContent = item.querySelector('summary').textContent.trim().replace(/^\d+\.\s*/, '');
    const panel = item.querySelector('.accordion-item-body');
    panel.id = `${id}-panel-${i}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    const title = document.createElement('p');
    title.className = 'accordion-steps-title';
    const badge = document.createElement('span');
    badge.textContent = i + 1;
    title.append(badge, tab.textContent);
    panel.prepend(title);
    list.append(tab);
    panels.append(panel);
    return tab;
  });
  const select = (n) => tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === n));
    tab.tabIndex = i === n ? 0 : -1;
    panels.children[i].hidden = i !== n;
  });
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = (i + step + tabs.length) % tabs.length;
      select(next);
      tabs[next].focus();
    });
  });
  select(0);
  block.replaceChildren(list, panels);
}

/**
 * Accordion: one row per item; column 1 is the label, column 2 the body.
 * @param {Element} block
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [label, body] = row.children;
    const details = document.createElement('details');
    details.className = 'accordion-item';
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...(label?.childNodes || []));
    const content = document.createElement('div');
    content.className = 'accordion-item-body';
    if (body) content.append(...body.childNodes);
    details.append(summary, content);
    row.replaceWith(details);
  });
  if (block.classList.contains('steps')) decorateSteps(block);
}
