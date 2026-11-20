import styled from "@emotion/styled";
import type { Facing } from "@/store/app/worldStore";

interface Props {
  onDir: (dir: Facing, down: boolean) => void;
  onA: () => void;
  onB: () => void;
}

const Wrap = styled("div")({
  position: "absolute",
  inset: "auto 0 0 0",
  display: "none",
  justifyContent: "space-between",
  alignItems: "flex-end",
  padding: "0 18px max(18px, env(safe-area-inset-bottom))",
  pointerEvents: "none",
  zIndex: 20,
  "@media (pointer: coarse), (max-width: 820px)": { display: "flex" },
});

const Pad = styled("div")({
  position: "relative",
  width: "150px",
  height: "150px",
  pointerEvents: "auto",
  touchAction: "none",
});

const DirBtn = styled("button")({
  position: "absolute",
  width: "50px",
  height: "50px",
  backgroundColor: "rgba(31,41,55,0.82)",
  color: "#f3f4f6",
  border: "3px solid #111827",
  borderRadius: "8px",
  fontSize: "1.4rem",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  "&:active": { backgroundColor: "rgba(17,24,39,0.95)" },
});

const Round = styled("button")<{ color: string }>(({ color }) => ({
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  backgroundColor: color,
  color: "#fff",
  border: "4px solid #111827",
  fontSize: "1.6rem",
  pointerEvents: "auto",
  touchAction: "none",
  boxShadow: "0 4px 0 #111827",
  userSelect: "none",
  "&:active": { transform: "translateY(3px)", boxShadow: "0 1px 0 #111827" },
}));

const Buttons = styled("div")({
  display: "flex",
  gap: "14px",
  alignItems: "flex-end",
  paddingBottom: "12px",
  "& > :last-of-type": { marginBottom: "40px" },
});

const POS: Record<Facing, { left: number; top: number; label: string }> = {
  up: { left: 50, top: 0, label: "▲" },
  down: { left: 50, top: 100, label: "▼" },
  left: { left: 0, top: 50, label: "◀" },
  right: { left: 100, top: 50, label: "▶" },
};

/** On-screen D-pad and A/B buttons for phones and tablets. */
const TouchControls = ({ onDir, onA, onB }: Props) => (
  <Wrap>
    <Pad onContextMenu={(e) => e.preventDefault()}>
      {(Object.keys(POS) as Array<Facing>).map((dir) => (
        <DirBtn
          key={dir}
          aria-label={dir}
          style={{ left: POS[dir].left, top: POS[dir].top }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onDir(dir, true);
          }}
          onPointerUp={() => onDir(dir, false)}
          onPointerCancel={() => onDir(dir, false)}
          onLostPointerCapture={() => onDir(dir, false)}>
          {POS[dir].label}
        </DirBtn>
      ))}
    </Pad>
    <Buttons>
      <Round color="#6b7280" aria-label="B" onPointerDown={onB}>
        B
      </Round>
      <Round color="#dc2626" aria-label="A" onPointerDown={onA}>
        A
      </Round>
    </Buttons>
  </Wrap>
);

export default TouchControls;
