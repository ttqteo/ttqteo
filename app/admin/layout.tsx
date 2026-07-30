export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Inside /admin the toolbar already is the navigation, so the public
          navbar is just noise. Hiding it with a server-rendered style (scoped to
          this route segment, and to admins via the `is-admin` class the head
          script sets) keeps it gone from first paint instead of flashing in and
          then disappearing on hydration. React drops the style again when you
          navigate out of /admin. */}
      <style href="admin-hide-site-navbar" precedence="high">
        {`html.is-admin .site-navbar { display: none; }`}
      </style>
      {children}
    </>
  );
}
