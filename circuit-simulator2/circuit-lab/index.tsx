import { useEffect, useState, type ComponentType } from "react";
import { useLab } from "@/store/lab";
import { LabOverlay } from "./overlay";

export function CircuitLab() {
  const [Canvas, setCanvas] = useState<ComponentType | null>(null);

  useEffect(() => {
    let live = true;
    void import("./lab-canvas").then((m) => {
      if (live) setCanvas(() => m.LabCanvas);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        useLab.getState().deleteSelected();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useLab.getState().redo();
        else useLab.getState().undo();
      }
      if (e.key === "Escape") useLab.getState().resetPending();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ece-circuit-lab">
      {Canvas ? (
        <Canvas />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-paper/70">
          Opening the bench…
        </div>
      )}
      <LabOverlay />
    </div>
  );
}
