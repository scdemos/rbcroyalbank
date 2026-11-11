import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  createTag,
  fetchQueryIndexAll,
  getAuthoredLinks,
  normalizePath,
  resolveArticlesFromIndex,
} from '../../scripts/shared.js';

function buildLinksCard(article) {
  const href = normalizePath(article.path);
  const li = createTag('li');
  const link = createTag('a', { href, class: 'cards-card-link' });

  if (article.image) {
    const imageDiv = createTag('div', { class: 'cards-card-image' });
    imageDiv.append(createOptimizedPicture(article.image, article.title || '', false, [{ width: '750' }]));
    link.append(imageDiv);
  }

  const body = createTag('div', { class: 'cards-card-body' });
  body.append(createTag('p', {}, createTag('strong', {}, article.title || href)));
  if (article.description) {
    body.append(createTag('p', {}, article.description));
  }
  link.append(body);
  li.append(link);

  return li;
}

/**
 * Decorate "cards links" variant: fetch index, match paths, render cards.
 */
async function decorateLinks(block) {
  const authoredLinks = getAuthoredLinks(block);
  if (!authoredLinks.length) {
    block.textContent = '';
    block.append(createTag('p', { class: 'cards-links-empty' }, 'No links provided.'));
    return;
  }

  let indexRows = [];
  try {
    indexRows = await fetchQueryIndexAll();
  } catch {
    indexRows = [];
  }

  const articles = resolveArticlesFromIndex(authoredLinks, indexRows);

  const ul = createTag('ul');
  articles.forEach((article) => ul.append(buildLinksCard(article)));
  block.replaceChildren(ul);
}

/**
 * Decorate bento-grid cards variant.
 * Each authored row becomes a card. The first <p> in each card is treated
 * as a tag/label (e.g. "// Knowledge Base v1.0"), and the first card is
 * marked as the featured (primary) card.
 */
function decorateBento(block) {
  const ul = createTag('ul');

  [...block.children].forEach((row, idx) => {
    const li = createTag('li');
    if (idx === 0) li.classList.add('cards-card-featured');
    while (row.firstElementChild) li.append(row.firstElementChild);

    // Unwrap the single wrapper div if present
    const wrapper = li.firstElementChild;
    if (wrapper && wrapper.tagName === 'DIV' && li.children.length === 1) {
      while (wrapper.firstChild) li.append(wrapper.firstChild);
      wrapper.remove();
    }

    // Separate image into its own wrapper (consistent with default cards)
    const picture = li.querySelector('picture');
    if (picture) {
      const imageDiv = createTag('div', { class: 'cards-card-image' });
      const pictureParent = picture.parentElement;
      imageDiv.append(picture);
      li.prepend(imageDiv);
      if (pictureParent && pictureParent.tagName === 'A' && !pictureParent.children.length) {
        pictureParent.remove();
      }
    } else {
      li.classList.add('cards-card-text-only');
    }

    // Find and mark the tag/label (first <p> that looks like a category tag)
    // only a paragraph above the card heading is a tag
    const firstP = li.querySelector('p');
    const heading = li.querySelector('h2, h3, h4');
    const beforeHeading = !heading || (firstP?.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (firstP && beforeHeading && !firstP.querySelector('picture') && !firstP.classList.contains('button-container')) {
      firstP.classList.add('cards-card-tag');
    }

    // Wrap remaining non-image content in a body div
    const body = createTag('div', { class: 'cards-card-body' });
    [...li.children].forEach((child) => {
      if (!child.classList.contains('cards-card-image')) body.append(child);
    });
    li.append(body);

    ul.append(li);
  });

  block.replaceChildren(ul);
}

/**
 * Decorate regular cards (authored rows with image + body).
 * @param {Element} block
 * @param {{ keepButtons?: boolean }} [opts] keepButtons: don't turn the card into one link
 */
function decorateDefault(block, opts = {}) {
  const ul = createTag('ul');

  [...block.children].forEach((row) => {
    const li = createTag('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    const content = li.firstElementChild;
    if (content?.children?.length > 1) {
      // a linked picture (badge, logo) is content, not the card image
      const withPicture = [...content.children].filter((el) => el.querySelector('picture'));
      const imageEl = withPicture.find((el) => !el.querySelector('a')) || withPicture[0];
      if (imageEl) {
        const picture = imageEl.querySelector('picture');
        const imageDiv = createTag('div', { class: 'cards-card-image' });
        if (picture) imageDiv.append(picture);
        const bodyDiv = createTag('div', { class: 'cards-card-body' });
        [...content.children].forEach((el) => { if (el !== imageEl) bodyDiv.append(el); });
        li.replaceChildren(imageDiv, bodyDiv);
      } else {
        content.className = 'cards-card-body';
      }
    } else {
      [...li.children].forEach((div) => {
        div.className = (div.children.length === 1 && div.querySelector('picture'))
          ? 'cards-card-image' : 'cards-card-body';
      });
    }

    const linkEl = !opts.keepButtons && (li.querySelector('.cards-card-image a[href]') || li.querySelector('.cards-card-body a[href]'));
    if (linkEl) {
      const wrapper = createTag('div', { class: 'cards-card-link' });
      while (li.firstChild) wrapper.append(li.firstChild);
      li.append(wrapper);
      const parent = linkEl.parentElement;
      if (parent) {
        parent.classList.remove('button-container');
      }
      linkEl.classList.remove('button');
    }

    const article = createTag('article');
    while (li.firstChild) article.append(li.firstChild);
    li.append(article);

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const picture = img.closest('picture');
    if (picture) {
      picture.replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]));
    }
  });

  block.replaceChildren(ul);
}

/**
 * Product cards: everything before the first list forms a coloured card head;
 * a trailing plain-text paragraph in the head becomes its pill label.
 */
function decorateProduct(block) {
  decorateDefault(block, { keepButtons: true });
  block.querySelectorAll('.cards-card-body').forEach((body) => {
    const list = body.querySelector(':scope > ul');
    if (!list) return;
    const head = createTag('div', { class: 'cards-product-head' });
    while (body.firstElementChild && body.firstElementChild !== list) {
      head.append(body.firstElementChild);
    }
    const last = head.lastElementChild;
    if (head.children.length > 2 && last?.tagName === 'P' && !last.querySelector('a, picture')) {
      last.classList.add('cards-product-label');
    }
    body.prepend(head);
  });
}

/**
 * Filter cards: row 1 (one cell) holds the select label, an optional results prefix
 * and a list of options, the first meaning "all"; each card row's 2nd cell lists its options.
 */
function decorateFilter(block) {
  const config = block.firstElementChild;
  const options = [...(config?.querySelectorAll('li') || [])].map((li) => li.textContent.trim());
  const [label = '', prefix = ''] = [...(config?.querySelectorAll('p') || [])].map((p) => p.textContent.trim());
  config?.remove();
  const tags = [...block.children].map((row) => {
    const cell = row.children[1];
    if (!cell || cell.querySelector('picture')) return null;
    cell.remove();
    return cell.textContent.split(',').map((t) => t.trim()).filter(Boolean);
  });
  decorateDefault(block);
  if (options.length < 2) return;

  const cards = [...block.querySelectorAll(':scope > ul > li')];
  const id = `cards-filter-${Math.random().toString(36).slice(2, 8)}`;
  const select = createTag('select', { id, class: 'cards-filter-select' });
  options.forEach((opt) => select.append(createTag('option', { value: opt }, opt)));
  const status = createTag('p', { class: 'cards-filter-status', 'aria-live': 'polite' });
  const apply = () => {
    const all = select.selectedIndex === 0;
    cards.forEach((card, i) => {
      card.hidden = !all && !(tags[i] || []).includes(select.value);
    });
    status.textContent = `${prefix} ${select.value}`.trim();
  };
  select.addEventListener('change', apply);
  const bar = createTag('div', { class: 'cards-filter-bar' }, [
    createTag('label', { for: id }, label), select,
  ]);
  block.prepend(bar, status);
  apply();
}

export default async function decorate(block) {
  if (block.classList.contains('links')) {
    await decorateLinks(block);
  } else if (block.classList.contains('bento')) {
    decorateBento(block);
  } else if (block.classList.contains('product')) {
    decorateProduct(block);
  } else if (block.classList.contains('filter')) {
    decorateFilter(block);
  } else if (['boxed', 'mosaic', 'showcase', 'text'].some((c) => block.classList.contains(c))) {
    decorateDefault(block, { keepButtons: true });
  } else {
    decorateDefault(block);
  }
}
