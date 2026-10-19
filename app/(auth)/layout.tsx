import { StormBackdrop } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sky relative min-h-dvh overflow-hidden">
      <StormBackdrop />
      <div className="relative flex min-h-dvh flex-col">{children}</div>
    </div>
  );
}
