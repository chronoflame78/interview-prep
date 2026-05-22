import type { Difficulty } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DIFFICULTY_COLORS } from "@/lib/constants";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-medium", DIFFICULTY_COLORS[difficulty])}
    >
      {difficulty}
    </Badge>
  );
}
