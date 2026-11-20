import styled from "@emotion/styled";

export const Page = styled("main")({
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: "24px 16px",
  background:
    "repeating-linear-gradient(45deg, #7ccf4a 0 18px, #6fc243 18px 36px)",
});

export const Card = styled("section")({
  width: "min(440px, 100%)",
  padding: "20px 22px 18px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  borderRadius: 6,
  boxShadow: "inset 0 0 0 3px #7dd3fc, 0 8px 0 rgba(0,0,0,0.35)",
  color: "#1f2937",
  fontSize: "1.35rem",
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const Title = styled("h1")({
  fontSize: "2.2rem",
  letterSpacing: 2,
  textAlign: "center",
});

export const Tabs = styled("div")({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 });

export const Tab = styled("button")<{ active: boolean }>(({ active }) => ({
  padding: "6px 0 8px",
  fontSize: "1.35rem",
  border: "3px solid #2b2b2b",
  borderRadius: 4,
  backgroundColor: active ? "#2b2b2b" : "#fff",
  color: active ? "#fde047" : "#1f2937",
  cursor: "pointer",
}));

export const Form = styled("form")({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  "& label": { display: "flex", flexDirection: "column", gap: 2 },
  "& input": {
    fontSize: "1.4rem",
    padding: "4px 10px",
    border: "3px solid #2b2b2b",
    borderRadius: 4,
  },
});

const btn = {
  padding: "7px 14px 9px",
  fontSize: "1.4rem",
  border: "3px solid #2b2b2b",
  borderRadius: 4,
  cursor: "pointer",
  boxShadow: "0 4px 0 #2b2b2b",
  "&:disabled": { opacity: 0.6 },
  "&:active": { transform: "translateY(2px)", boxShadow: "0 2px 0 #2b2b2b" },
};

export const Primary = styled("button")({ ...btn, backgroundColor: "#dc2626", color: "#fff" });
export const Secondary = styled("button")({ ...btn, backgroundColor: "#e5e7eb", color: "#1f2937" });

export const Row = styled("div")({ display: "flex", gap: 8, flexWrap: "wrap" });

export const Profile = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "10px 12px",
  backgroundColor: "#f3f4f6",
  border: "3px solid #2b2b2b",
  borderRadius: 4,
});

export const Big = styled("strong")({ fontSize: "1.9rem", letterSpacing: 1 });

export const Note = styled("p")({ fontSize: "1.15rem", color: "#4b5563" });

export const Message = styled("p")<{ ok: boolean }>(({ ok }) => ({
  padding: "6px 10px",
  border: "3px solid #2b2b2b",
  borderRadius: 4,
  backgroundColor: ok ? "#dcfce7" : "#fee2e2",
  fontSize: "1.2rem",
}));

export const Links = styled("nav")({
  display: "flex",
  justifyContent: "center",
  gap: 16,
  "& a": { color: "#2563eb", textDecoration: "underline" },
});
