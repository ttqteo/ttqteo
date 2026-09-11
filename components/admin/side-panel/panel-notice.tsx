import { Button } from "@/components/ui/button";

/** What a panel shows instead of its list when loading failed. */
export function PanelNotice({
  kind,
  onRetry,
}: {
  kind: "missing_table" | "error";
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3 p-4 text-sm text-muted-foreground">
      {kind === "missing_table" ? (
        <p>
          Chưa có bảng dữ liệu. Chạy{" "}
          <code className="font-mono text-xs">supabase/add_admin_side_panel.sql</code> trong SQL
          Editor của Supabase rồi thử lại.
        </p>
      ) : (
        <p>Không tải được dữ liệu.</p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}
