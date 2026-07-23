import { ManualViewer } from "../components/ManualViewer";
import { agentManual } from "../content/manual/agent";

export function ManualAgent() {
  return <ManualViewer manual={agentManual} />;
}
