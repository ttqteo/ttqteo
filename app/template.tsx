/**
 * `template.tsx` (unlike `layout.tsx`) remounts on every navigation, which is
 * what lets the enter animation replay per route.
 *
 * Fade only, deliberately: `slide-in-*` animates `transform`, and
 * `animation-fill-mode: both` leaves that transform on the element afterwards —
 * a transformed ancestor becomes the containing block for `position: fixed`
 * descendants, which would quietly break the editor's fullscreen split mode and
 * any dialog rendered inside a page. Opacity has no such side effect.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-200 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
