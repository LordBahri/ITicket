import { Link } from "react-router-dom";
import type { OrgUser } from "../types";

interface OrgNode {
  user: OrgUser;
  children: OrgNode[];
}

function buildForest(users: OrgUser[]): OrgNode[] {
  const byId = new Map(users.map((u) => [u.id, { user: u, children: [] as OrgNode[] }]));
  const roots: OrgNode[] = [];
  const visited = new Set<string>();

  for (const node of byId.values()) {
    const managerId = node.user.managerId;
    if (managerId && byId.has(managerId) && managerId !== node.user.id) {
      byId.get(managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortTree(nodes: OrgNode[]) {
    nodes.sort((a, b) => a.user.name.localeCompare(b.user.name));
    for (const n of nodes) sortTree(n.children);
  }
  sortTree(roots);

  function dropCycles(nodes: OrgNode[]): OrgNode[] {
    return nodes.filter((n) => {
      if (visited.has(n.user.id)) return false;
      visited.add(n.user.id);
      n.children = dropCycles(n.children);
      return true;
    });
  }
  return dropCycles(roots);
}

function OrgNodeItem({ node }: { node: OrgNode }) {
  return (
    <li>
      <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
        <Link to={`/admin/users/${node.user.id}`} className="font-medium text-brand-700 hover:underline">
          {node.user.name}
        </Link>
        {node.user.service && <span className="text-xs text-slate-400">{node.user.service.name}</span>}
        {!node.user.isActive && <span className="text-xs text-slate-400">(désactivé)</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="ml-4 mt-1.5 space-y-1.5 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <OrgNodeItem key={child.user.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart({ users }: { users: OrgUser[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-slate-400">Aucun utilisateur</p>;
  }
  const forest = buildForest(users);
  return (
    <ul className="space-y-1.5">
      {forest.map((node) => (
        <OrgNodeItem key={node.user.id} node={node} />
      ))}
    </ul>
  );
}
