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
      <style href="admin-hide-site-navbar" precedence="high">
        {`html.is-admin .site-navbar { display: none; }`}
      </style>
      {children}
    </>
  );
}
