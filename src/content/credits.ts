import data from './credits.json';

/** One third-party asset or source used by the site. */
export interface CreditEntry {
  readonly id: string;
  readonly title: string;
  /** The credit line, worded as the source asks. */
  readonly credit: string;
  /** The page that describes the asset. */
  readonly sourcePageUrl: string;
  /** The exact file (or document) that was used. */
  readonly fileUrl: string;
  /** How the site uses it. */
  readonly usage: string;
  /** What was changed from the original. */
  readonly modifications: string;
}

export const credits: readonly CreditEntry[] = data.credits;
