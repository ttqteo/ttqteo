import type { Publication, ServiceEntry } from "@/components/portfolio/PublicationList";

/** Bolded wherever it appears in an author list. */
export const SELF = "Tran Tu Quang";

/** Shown next to the page header so the section reads as maintained. */
export const RESEARCH_UPDATED = "2026-08-21";

/**
 * Peer-reviewed and forthcoming work. Entries move here from
 * `underSubmission` once a venue notifies acceptance.
 */
export const publications: Publication[] = [];

/**
 * Papers currently under review. Venues with a double-blind policy are listed
 * without a title, author list, PDF, or repo link: a distinctive title is
 * enough to deanonymize a submission if a reviewer searches for it. Fill the
 * withheld fields in and move the entry to `publications` after notification.
 */
export const underSubmission: Publication[] = [
  {
    id: "asiaccs27-c1",
    venue: "Security venue",
    year: 2027,
    status: "Under submission",
    note: "Software supply-chain security. Details withheld while the venue's double-blind review is open.",
  },
];

/** Program committees, artifact evaluation, external reviewing. */
export const service: ServiceEntry[] = [];
