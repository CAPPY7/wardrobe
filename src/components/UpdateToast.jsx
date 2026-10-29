import { useEffect, useState } from "react";
import { Button } from "./Bits.jsx";

export default function UpdateToast() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onNeed = () => setOpen(true);
    window.addEventListener("wardrobe-update", onNeed);
    return () => window.removeEventListener("wardrobe-update", onNeed);
  }, []);
  if (!open) return null;
  return (
    <div className="toast card row">
      <span>New version. Tap to refresh.</span>
      <Button
        onClick={() => {
          const update = window.__wardrobeUpdate;
          if (update) update(true);
          else window.location.reload();
        }}
      >
        Refresh
      </Button>
    </div>
  );
}
