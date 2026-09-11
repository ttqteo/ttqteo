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
          disappearing on hydration; React drops it again when you navigate out
          of /admin. */}
      <style href="admin-shell" precedence="high">
        {`
          html.is-admin .site-navbar { display: none; }

          /* The shared <main> is w-[90vw] on phones, which reads well for an
             article but costs the posts table ~19px a side before its own
             padding starts. Admin is a working screen, not a reading one, so
             it takes the full width and sets its own gutters. Unchanged from
             sm up, where sm:container takes over anyway. */
          @media (max-width: 639px) {
            .app-shell > main { width: 100%; }
          }

          /* Room for the side panel (components/admin/side-panel): a 48px
             rail on the right edge and the 360px panel it opens.
             --admin-side-w is how much of that edge they take, so the shell's
             padding and the editor's fixed pieces all move by one number.
             The panel pushes the page only from 1280px; narrower, it floats
             over it, since 408px out of a laptop screen leaves the post table
             too tight. Under 768px neither shows and a phone gets a sheet.

             Keyed on :has() the rail rather than on this stylesheet being
             present, so the room goes with the rail when you leave /admin
             even if the hoisted style stays. data-admin-panel is set before
             first paint by the head script in app/layout.tsx. */
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
        `}
      </style>
      {children}
      <AdminSidePanel />
    </>
  );
}
