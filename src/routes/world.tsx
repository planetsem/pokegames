import { createFileRoute } from "@tanstack/react-router";
import WorldModule from "@/features/world/modules/World";

export const Route = createFileRoute("/world")({
  component: WorldModule,
});
