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
        `}
      </style>
      {children}
    </>
  );
}
