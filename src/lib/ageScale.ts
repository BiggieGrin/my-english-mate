/**
 * Age-appropriate presentation, in one place.
 *
 * The product spans grades 1-12, which is roughly ages 6 to 18 -- a range no
 * single visual treatment serves well. The research is consistent on both ends:
 *
 * - Young children need large touch targets (44px is the floor, 60px+ is
 *   comfortable for still-developing fine motor control), big type, and picture
 *   -first cards, because they read slowly or not at all.
 * - Teenagers reject anything that reads as childish -- oversized emoji,
 *   primary-colour blocks, bouncy animation -- and prefer the denser, calmer
 *   layouts of the "grown-up" apps they already use.
 *
 * So the dashboard keeps *one* layout and *one* interaction model at every age
 * (learning the app once is worth more than a per-age novelty), and varies only
 * scale, density, and copy. That is what this module encodes: no component
 * branches on age group itself, it just reads the scale it is handed.
 */

import type { AgeGroup } from '@/store/slices/ageGroupSlice';

export interface AgeScale {
  /** Emoji in the hero card. */
  heroIcon: string;
  /** Hero headline. */
  heroTitle: string;
  /** Section headings ("My topics"). */
  sectionTitle: string;
  /** Emoji on a topic tile. */
  cardIcon: string;
  /** Topic tile title. */
  cardTitle: string;
  /** Supporting copy everywhere. */
  body: string;
  /** Padding inside interactive cards -- drives the touch-target size. */
  cardPadding: string;
  /** Minimum tile height, so a tile is never smaller than a comfortable tap. */
  cardMinHeight: string;
  /** Topic grid columns. Older students get a denser grid. */
  gridColumns: string;
  /** Primary button size passed to <Button size=...>. */
  buttonSize: 'default' | 'lg';
  /** Sub-headline under the greeting. Tone shifts with age, meaning does not. */
  tagline: string;
}

const SCALES: Record<AgeGroup, AgeScale> = {
  // Grades 1-3. Biggest type, biggest targets, fewest tiles per row.
  young: {
    heroIcon: 'text-6xl sm:text-7xl',
    heroTitle: 'text-2xl sm:text-3xl',
    sectionTitle: 'text-2xl',
    cardIcon: 'text-5xl',
    cardTitle: 'text-xl',
    body: 'text-lg',
    cardPadding: 'p-6',
    cardMinHeight: 'min-h-[13rem]',
    gridColumns: 'grid-cols-2 lg:grid-cols-3',
    buttonSize: 'lg',
    tagline: 'בוא נלמד משהו חדש היום',
  },
  // Grades 4-6. The middle setting, and the default before a grade is known.
  middle: {
    heroIcon: 'text-5xl sm:text-6xl',
    heroTitle: 'text-2xl',
    sectionTitle: 'text-xl',
    cardIcon: 'text-4xl',
    cardTitle: 'text-lg',
    body: 'text-base',
    cardPadding: 'p-5',
    cardMinHeight: 'min-h-[11.5rem]',
    gridColumns: 'grid-cols-2 lg:grid-cols-4',
    buttonSize: 'lg',
    tagline: 'בקצב שלך, בלי לחץ',
  },
  // Grades 7-12. Denser and plainer: no cheerleading, no oversized graphics.
  high: {
    heroIcon: 'text-4xl sm:text-5xl',
    heroTitle: 'text-xl',
    sectionTitle: 'text-lg',
    cardIcon: 'text-3xl',
    cardTitle: 'text-base',
    body: 'text-sm',
    cardPadding: 'p-4',
    cardMinHeight: 'min-h-[10rem]',
    gridColumns: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    buttonSize: 'default',
    tagline: 'המשך מאיפה שהפסקת',
  },
};

export const getAgeScale = (ageGroup: AgeGroup): AgeScale =>
  SCALES[ageGroup] ?? SCALES.middle;
