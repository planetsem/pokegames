import { createFileRoute } from "@tanstack/react-router";
import AccountModule from "@/features/account/modules/Account";

export const Route = createFileRoute("/account")({
  component: AccountModule,
});
