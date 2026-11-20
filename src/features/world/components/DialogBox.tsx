import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import styled from "@emotion/styled";

export interface DialogData {
  speaker?: string;
  text: string;
  choices?: Array<string>;
}

export interface DialogApi {
  press: () => void;
  move: (delta: number) => void;
}

interface Props {
  data: DialogData;
  onDone: (choice: number) => void;
}

const Box = styled("div")({
  position: "absolute",
  left: "50%",
  bottom: "max(16px, env(safe-area-inset-bottom))",
  transform: "translateX(-50%)",
  width: "min(720px, calc(100% - 24px))",
  minHeight: "96px",
  padding: "14px 18px 18px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  boxShadow: "inset 0 0 0 3px #7dd3fc, 0 6px 0 rgba(0,0,0,0.35)",
  borderRadius: "6px",
  fontSize: "1.55rem",
  lineHeight: 1.15,
  color: "#1f2937",
  zIndex: 30,
  cursor: "pointer",
  userSelect: "none",
  "@media (max-width: 640px)": {
    bottom: "170px",
    fontSize: "1.3rem",
  },
});

const Speaker = styled("div")({
  position: "absolute",
  top: "-18px",
  left: "14px",
  padding: "0 8px",
  backgroundColor: "#2b2b2b",
  color: "#fde047",
  fontSize: "1.1rem",
  letterSpacing: "1px",
});

const Arrow = styled("span")({
  position: "absolute",
  right: "14px",
  bottom: "6px",
  fontSize: "1rem",
  animation: "dlg-bob 0.8s steps(2) infinite",
  "@keyframes dlg-bob": {
    "0%": { transform: "translateY(0)" },
    "100%": { transform: "translateY(3px)" },
  },
});

const Choices = styled("ul")({
  position: "absolute",
  right: "0",
  bottom: "calc(100% + 8px)",
  listStyle: "none",
  padding: "8px 14px",
  backgroundColor: "#fdfdf8",
  border: "4px solid #2b2b2b",
  borderRadius: "6px",
  boxShadow: "0 6px 0 rgba(0,0,0,0.35)",
});

const Choice = styled("li")<{ active: boolean }>(({ active }) => ({
  padding: "2px 4px 2px 22px",
  position: "relative",
  cursor: "pointer",
  "&::before": {
    content: active ? '"▶"' : '""',
    position: "absolute",
    left: 2,
    fontSize: "0.9em",
  },
}));

const CHAR_MS = 22;

/** Classic bottom text box: types out, A to finish/continue, arrows to choose. */
const DialogBox = forwardRef<DialogApi, Props>(({ data, onDone }, ref) => {
  const [shown, setShown] = useState(0);
  const [cursor, setCursor] = useState(0);
  const full = shown >= data.text.length;

  useEffect(() => {
    setShown(0);
    setCursor(0);
  }, [data]);

  useEffect(() => {
    if (full) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => window.clearTimeout(t);
  }, [shown, full]);

  const press = () => {
    if (!full) setShown(data.text.length);
    else onDone(cursor);
  };

  useImperativeHandle(ref, () => ({
    press,
    move: (delta) => {
      const n = data.choices?.length ?? 0;
      if (n) setCursor((c) => (c + delta + n) % n);
    },
  }));

  return (
    <Box onClick={() => !data.choices && press()} role="dialog" aria-live="polite">
      {data.speaker && <Speaker>{data.speaker}</Speaker>}
      {data.text.slice(0, shown)}
      {full && data.choices && (
        <Choices>
          {data.choices.map((c, i) => (
            <Choice
              key={c}
              active={i === cursor}
              onPointerEnter={() => setCursor(i)}
              onClick={(e) => {
                e.stopPropagation();
                onDone(i);
              }}>
              {c}
            </Choice>
          ))}
        </Choices>
      )}
      {full && !data.choices && <Arrow>▼</Arrow>}
    </Box>
  );
});

export default DialogBox;
