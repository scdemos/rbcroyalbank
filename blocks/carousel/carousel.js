function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function moveContents(source, target) {
  if (!source) return;
  while (source.firstChild) target.append(source.firstChild);
}

// third-cell keywords that style a slide instead of labelling it
const SLIDE_OPTIONS = ['start', 'end', 'dark', 'cover', 'silver', 'teal', 'charcoal', 'sky', 'ice', 'blue', 'black'];

function slideOptions(cell) {
  const words = cell?.textContent.trim().toLowerCase().split(/[\s,]+/).filter(Boolean) || [];
  return words.length && words.every((word) => SLIDE_OPTIONS.includes(word)) ? words : null;
}

function buildSlides(block) {
  return [...block.children].map((row, index, rows) => {
    const cells = [...row.children];
    const slide = createElement('div', 'carousel-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} of ${rows.length}`);

    const media = createElement('div', 'carousel-slide-media');
    const picture = cells[0]?.querySelector('picture');
    const image = cells[0]?.querySelector('img');
    if (picture) media.append(picture);
    else if (image) media.append(image);
    if (media.childElementCount) slide.append(media);

    const content = createElement('div', 'carousel-slide-content');
    // a slide without a media cell starts with its text cell
    const textIndex = image || !cells[0]?.textContent.trim() ? 1 : 0;
    moveContents(cells[textIndex], content);
    if (content.childElementCount) slide.append(content);
    // optional last cell: slide options (e.g. "end dark", "teal") or a thumbnail label
    const extra = cells[textIndex + 1];
    const options = slideOptions(extra);
    if (options) slide.classList.add(...options.map((option) => `slide-${option}`));
    slide.dataset.title = (!options && extra?.textContent.trim())
      || slide.querySelector('h2, h3, h4')?.textContent.trim() || `Slide ${index + 1}`;
    return slide;
  });
}

function buildButton(label, className) {
  const button = createElement('button', className, label);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  return button;
}

function decorateHero(block, track, slides, controls) {
  const previous = buildButton('Previous slide', 'carousel-previous');
  const next = buildButton('Next slide', 'carousel-next');
  const indicators = createElement('div', 'carousel-indicators');
  indicators.setAttribute('role', 'group');
  indicators.setAttribute('aria-label', 'Choose a slide');
  const autoplay = block.classList.contains('autoplay') && slides.length > 1;
  const thumbnails = block.classList.contains('thumbs');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const playPause = autoplay ? buildButton('Play slides', 'carousel-play-pause') : null;

  let activeIndex = 0;
  let paused = !autoplay || reducedMotion.matches;
  let timer;
  const indicatorButtons = slides.map((slide, index) => {
    const button = buildButton(`Show slide ${index + 1}: ${slide.dataset.title}`, 'carousel-indicator');
    if (thumbnails) {
      button.textContent = '';
      const image = slide.querySelector('img');
      if (image) {
        const thumbnail = image.cloneNode();
        thumbnail.alt = '';
        thumbnail.setAttribute('aria-hidden', 'true');
        thumbnail.removeAttribute('loading');
        button.append(thumbnail);
      }
      button.append(createElement('span', 'carousel-thumbnail-label', slide.dataset.title));
      button.title = slide.dataset.title;
      button.classList.add('carousel-thumbnail');
    }
    button.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    button.addEventListener('click', () => showSlide(index));
    indicators.append(button);
    return button;
  });

  function updateTimer() {
    window.clearInterval(timer);
    if (paused) return;
    timer = window.setInterval(() => showSlide(activeIndex + 1), 7000);
  }

  function updatePlayPause() {
    if (!playPause) return;
    const label = paused ? 'Play slides' : 'Pause slides';
    playPause.textContent = paused ? 'Play' : 'Pause';
    playPause.setAttribute('aria-label', label);
  }

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== activeIndex;
      indicatorButtons[slideIndex].setAttribute('aria-current', slideIndex === activeIndex ? 'true' : 'false');
    });
    track.setAttribute('aria-label', `${slides[activeIndex].dataset.title}, slide ${activeIndex + 1} of ${slides.length}`);
    updateTimer();
  }

  previous.addEventListener('click', () => showSlide(activeIndex - 1));
  next.addEventListener('click', () => showSlide(activeIndex + 1));
  if (playPause) {
    playPause.addEventListener('click', () => {
      paused = !paused;
      updatePlayPause();
      updateTimer();
    });
    updatePlayPause();
  }
  slides.forEach((slide, index) => { slide.hidden = index !== activeIndex; });
  track.setAttribute('aria-live', 'polite');
  track.setAttribute('aria-label', `${slides[0]?.dataset.title || 'Featured content'}, slide 1 of ${slides.length}`);
  controls.append(previous, indicators);
  if (playPause) controls.append(playPause);
  controls.append(next);
  updateTimer();
}

function decorateCards(track, slides, controls) {
  const previous = buildButton('Previous items', 'carousel-previous');
  const next = buildButton('Next items', 'carousel-next');
  const progress = createElement('div', 'carousel-progress');
  progress.setAttribute('aria-hidden', 'true');
  const thumb = createElement('div', 'carousel-progress-thumb');
  progress.append(thumb);
  const updateControls = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= maxScroll - 1;
    const share = track.scrollWidth ? track.clientWidth / track.scrollWidth : 1;
    thumb.style.width = `${Math.min(100, share * 100)}%`;
    thumb.style.marginLeft = `${maxScroll > 0 ? (track.scrollLeft / maxScroll) * (1 - share) * 100 : 0}%`;
    progress.hidden = maxScroll <= 1;
  };
  const scroll = (direction) => {
    const firstSlide = slides[0];
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const amount = (firstSlide?.getBoundingClientRect().width || track.clientWidth) + gap;
    track.scrollBy({ left: direction * amount, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  previous.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  track.setAttribute('aria-label', 'Featured items');
  track.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', updateControls);
  controls.append(progress, previous, next);
  requestAnimationFrame(updateControls);
}

/** Offer cards: category tag, highlighted offer, "Label value · Label value" facts grid, CTA row. */
function decorateOffers(slides) {
  slides.forEach((slide) => {
    const content = slide.querySelector('.carousel-slide-content');
    if (!content) return;
    const heading = content.querySelector('h2, h3, h4');
    const first = content.firstElementChild;
    if (first?.tagName === 'P' && heading && first !== heading && !first.querySelector('a, strong')) {
      first.classList.add('carousel-slide-tag');
    }
    [...content.querySelectorAll(':scope > p')].forEach((p) => {
      if (p.firstElementChild?.tagName === 'STRONG' && !p.querySelector('a')) p.classList.add('carousel-slide-offer');
      else if (p.textContent.includes(' · ')) {
        const facts = createElement('dl', 'carousel-slide-facts');
        p.textContent.split(' · ').forEach((fact) => {
          const [, term, value] = fact.trim().match(/^(.*?)\s+(\S+)$/) || [null, fact, ''];
          const item = createElement('div');
          item.append(createElement('dt', null, term), createElement('dd', null, value));
          facts.append(item);
        });
        p.replaceWith(facts);
      }
    });
    const buttons = content.querySelectorAll(':scope > p.button-container');
    if (buttons.length > 1) {
      const actions = createElement('div', 'carousel-slide-actions');
      buttons[0].before(actions);
      actions.append(...buttons);
    }
  });
}

export default function decorate(block) {
  const slides = buildSlides(block);
  if (!slides.length) return;
  if (block.classList.contains('offers')) decorateOffers(slides);

  const track = createElement('div', 'carousel-track');
  slides.forEach((slide) => track.append(slide));
  const controls = createElement('div', 'carousel-controls');
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', block.classList.contains('hero') ? 'Featured promotions' : 'Featured items');
  block.classList.add('carousel-ready');
  block.replaceChildren(track, controls);

  if (block.classList.contains('hero')) decorateHero(block, track, slides, controls);
  else decorateCards(track, slides, controls);
}
