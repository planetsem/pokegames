import styled from "@emotion/styled";

export const Screen = styled("div")({
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  backgroundColor: "#0b0b0b",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
});

export const Canvas = styled("canvas")({
  display: "block",
  width: "100%",
  height: "100%",
  imageRendering: "pixelated",
});

export const Fade = styled("div")<{ show: boolean; flash: boolean }>(
  ({ show, flash }) => ({
    position: "absolute",
    inset: 0,
    backgroundColor: flash ? "#ffffff" : "#000000",
    opacity: show ? 1 : 0,
    transition: `opacity ${flash ? 120 : 240}ms linear`,
    pointerEvents: "none",
    zIndex: 40,
  }),
);

export const Banner = styled("div")<{ show: boolean }>(({ show }) => ({
  position: "absolute",
  top: 14,
  left: 14,
  padding: "6px 16px 8px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  borderRadius: 4,
  fontSize: "1.5rem",
  letterSpacing: 1,
  color: "#1f2937",
  boxShadow: "0 5px 0 rgba(0,0,0,0.35)",
  transform: show ? "translateY(0)" : "translateY(-120%)",
  opacity: show ? 1 : 0,
  transition: "transform 0.35s, opacity 0.35s",
  zIndex: 15,
  pointerEvents: "none",
}));

export const TopRight = styled("div")({
  position: "absolute",
  top: 14,
  right: 14,
  display: "flex",
  gap: 8,
  zIndex: 15,
});

export const HudButton = styled("button")({
  padding: "6px 14px 8px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  borderRadius: 4,
  fontSize: "1.3rem",
  color: "#1f2937",
  boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
  cursor: "pointer",
  "&:active": { transform: "translateY(2px)", boxShadow: "0 2px 0 rgba(0,0,0,0.35)" },
});

export const Menu = styled("div")({
  position: "absolute",
  top: 70,
  right: 14,
  width: "min(300px, calc(100% - 28px))",
  padding: "12px 14px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  borderRadius: 6,
  boxShadow: "0 6px 0 rgba(0,0,0,0.35)",
  zIndex: 35,
  fontSize: "1.35rem",
  color: "#1f2937",
});

export const MenuHeader = styled("div")({
  paddingBottom: 8,
  marginBottom: 8,
  borderBottom: "3px dashed #d1d5db",
  lineHeight: 1.1,
  "& small": { display: "block", fontSize: "1.05rem", color: "#6b7280" },
});

export const Party = styled("div")({
  display: "flex",
  gap: 4,
  margin: "6px 0 2px",
  "& img": { width: 44, height: 44, imageRendering: "pixelated", objectFit: "contain" },
});

export const MenuItem = styled("button")<{ active?: boolean }>(({ active }) => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "3px 4px 3px 24px",
  position: "relative",
  background: "none",
  fontSize: "1.4rem",
  color: "#1f2937",
  cursor: "pointer",
  "&::before": {
    content: active ? '"▶"' : '""',
    position: "absolute",
    left: 4,
    fontSize: "0.9em",
  },
  "&:hover::before": { content: '"▶"' },
}));

export const NameCard = styled("form")({
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(380px, calc(100% - 32px))",
  padding: "18px 20px 20px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  borderRadius: 6,
  boxShadow: "inset 0 0 0 3px #7dd3fc, 0 6px 0 rgba(0,0,0,0.35)",
  zIndex: 45,
  fontSize: "1.4rem",
  color: "#1f2937",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  "& input": {
    fontSize: "1.6rem",
    padding: "4px 10px",
    border: "3px solid #2b2b2b",
    borderRadius: 4,
    textTransform: "uppercase",
  },
  "& button": {
    padding: "6px 12px 8px",
    backgroundColor: "#dc2626",
    color: "#fff",
    fontSize: "1.4rem",
    border: "3px solid #2b2b2b",
    borderRadius: 4,
    cursor: "pointer",
  },
  "& a": { color: "#2563eb", textDecoration: "underline" },
});
