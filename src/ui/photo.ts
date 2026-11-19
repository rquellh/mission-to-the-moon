import { copy } from '../content/copy';
import type { Photo } from '../content/types';
import { externalLink } from './citations';
import { el } from './dom';

/** Resolve a path under public/ (a photo, a recording) against the site's base address. */
export function mediaUrl(src: string): string {
  if (/^[a-z]+:/i.test(src)) return src;
  return `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`;
}

/**
 * Fill a figure with a photo and its credit line, with a link to the
 * original. If the file does not load, the figure hides rather than show a
 * broken image.
 */
export function fillPhoto(figure: HTMLElement, photo: Photo): void {
  const image = el('img', 'card__image');
  image.src = mediaUrl(photo.src);
  image.alt = photo.alt;
  image.width = photo.width;
  image.height = photo.height;
  image.decoding = 'async';
  image.addEventListener('error', () => {
    figure.hidden = true;
  });
  const caption = el('figcaption', 'card__credit');
  caption.append(`${copy.card.photoCredit} ${photo.credit}. `, externalLink(photo.sourceUrl, copy.card.original));
  figure.replaceChildren(image, caption);
  figure.hidden = false;
}
