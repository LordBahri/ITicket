import { ManualViewer } from "../components/ManualViewer";
import { adminManual } from "../content/manual/admin";

export function ManualAdmin() {
  return <ManualViewer manual={adminManual} />;
}
