export interface Source {
  /** The publication or page title, as the source gives it. */
  title: string;
  /** Who publishes it. */
  publisher: string;
  /** The main address: a table of contents or landing page. */
  url: string;
  /** ISO date this URL was last confirmed to work. */
  checked: string;
  /** What we use it for. */
  use: string;
}
