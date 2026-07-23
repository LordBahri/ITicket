import { ManualViewer } from "../components/ManualViewer";
import { userManual } from "../content/manual/user";

export function ManualUser() {
  return <ManualViewer manual={userManual} />;
}
