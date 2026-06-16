import {
  SiJavascript,
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiHtml5,
  SiGit,
  SiDocker,
} from "react-icons/si";
import {
  Briefcase,
  Building2,
  Calculator,
  FolderOpen,
  Globe,
  Network,
  PenLine,
  Radio,
  Scale,
  Search,
  ShieldAlert,
  Sigma,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string }
>;

type TopicMeta = {
  icon: IconComponent;
  color?: string;
};

const TOPIC_META: Record<string, TopicMeta> = {
  // Software Engineering — brand icons with official colors
  JavaScript: { icon: SiJavascript, color: "#F7DF1E" },
  TypeScript: { icon: SiTypescript, color: "#3178C6" },
  React: { icon: SiReact, color: "#61DAFB" },
  "Next.js": { icon: SiNextdotjs }, // black/white mark — use currentColor for legibility
  "Node.js": { icon: SiNodedotjs, color: "#5FA04E" },
  "SQL & Databases": { icon: SiPostgresql, color: "#4169E1" },
  "HTML & CSS": { icon: SiHtml5, color: "#E34F26" },
  Git: { icon: SiGit, color: "#F05032" },
  DevOps: { icon: SiDocker, color: "#2496ED" },

  // Software Engineering — generic (theme-aware)
  "System Design": { icon: Network },
  "Data Structures": { icon: Workflow },
  Algorithms: { icon: Sigma },

  // Finance
  "Accounting Principles": { icon: Calculator },
  "Financial Modeling": { icon: TrendingUp },
  "Investment Banking": { icon: Building2 },
  "Risk Management": { icon: ShieldAlert },
  "Corporate Finance": { icon: Briefcase },

  // Journalism
  "Investigative Reporting": { icon: Search },
  "Ethics in Journalism": { icon: Scale },
  "Digital Media": { icon: Globe },
  "Broadcast News": { icon: Radio },
  "Feature Writing": { icon: PenLine },
};

export function TopicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const meta = TOPIC_META[name];
  const Icon = meta?.icon ?? FolderOpen;
  return (
    <Icon
      className={className}
      style={meta?.color ? { color: meta.color } : undefined}
      aria-hidden
    />
  );
}
