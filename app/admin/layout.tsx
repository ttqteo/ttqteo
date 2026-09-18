import { AdminSidePanel } from "@/components/admin/side-panel/admin-side-panel";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Everything under /admin has the admin toolbar for navigation, so the
          public navbar is redundant across the whole segment. A server-rendered
          style keeps it hidden from first paint instead of flashing in and then
          disappearing on hydration. React does not remove a hoisted style when
          you navigate out of /admin, so every rule here is keyed on the side
          panel's rail, which is only in the DOM under /admin. */}
      <style href="admin-shell" precedence="high">
        {`
          html.is-admin:has(.admin-side-rail) .site-navbar { display: none; }

          /* The shared <main> is w-[90vw] on phones, which reads well for an
             article but costs the posts table ~19px a side before its own
             padding starts. Admin is a working screen, not a reading one, so
             it takes the full width and sets its own gutters. Unchanged from
             sm up, where sm:container takes over anyway. */
          @media (max-width: 639px) {
            .app-shell:has(.admin-side-rail) > main { width: 100%; }
          }

          /* Room for the side panel (components/admin/side-panel): a 48px
             rail on the right edge and the 360px panel it opens.
             --admin-side-w is how much of that edge they take, so the shell's
             padding and the editor's fixed pieces all move by one number.
             The panel pushes the page only from 1280px; narrower, it floats
             over it, since 408px out of a laptop screen leaves the post table
             too tight. Under 768px neither shows and a phone gets a sheet.

             Keyed on :has() the rail, like the rules above: the style stays
             after you leave /admin, the rail does not. data-admin-panel is
             set before first paint by the head script in app/layout.tsx. */
          .admin-side-rail,
          .admin-side-panel { display: none; }
          @media (min-width: 768px) {
            html.is-admin:has(.admin-side-rail) { --admin-side-w: 48px; }
            html.is-admin:has(.admin-side-rail) .app-shell {
              padding-right: var(--admin-side-w, 0px);
            }
            html.is-admin .admin-side-rail { display: flex; }
            html.is-admin[data-admin-panel] .admin-side-panel { display: flex; }
          }
          @media (min-width: 1280px) {
            html.is-admin[data-admin-panel]:has(.admin-side-panel) { --admin-side-w: 408px; }
          }
          /* Focus mode hides rail and panel (focus-mode-hidden); hand their room back too. */
          body.focus-mode { --admin-side-w: 0px; }

          /* The calendar panel's month grid: a dot under each day with something on it. */
          .admin-cal-has-items button::after {
            content: "";
            position: absolute;
            bottom: 4px;
            left: 50%;
            width: 4px;
            height: 4px;
            margin-left: -2px;
            border-radius: 9999px;
            background: currentColor;
            opacity: 0.6;
          }

          /* A dialog, alert dialog or sheet (all z-50) must not open under the
             rail (z-57) or the panel (z-56). Radix marks <body> with
             data-scroll-locked while one of them is open. */
          body[data-scroll-locked] :is(.admin-side-rail, .admin-side-panel) { z-index: 49; }
        `}
      </style>
      <AdminSidePanel>{children}</AdminSidePanel>
    </>
  );
}
