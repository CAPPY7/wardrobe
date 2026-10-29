import { useState } from "react";
import { Button } from "../components/Bits.jsx";
import { useWardrobe } from "../store.jsx";

const SLIDES = [
  ["Photograph the piece", "Lay it on a plain sheet, fill the frame, and use daylight. The app keeps the photo on this phone."],
  ["Today picks three outfits", "Choose an occasion. Suggestions use the weather and what you wore recently. They work offline."],
  ["Camera and city, only when you ask", "The camera opens when you add a piece. Location is only for the forecast. You can type a city instead."],
];

export default function Onboarding() {
  const { settings, updateSettings } = useWardrobe();
  const [step, setStep] = useState(0);
  if (!settings || settings.onboardingDone) return null;
  const [title, body] = SLIDES[step];
  return (
    <div className="modal">
      <div className="card slides">
        <p className="muted">
          {step + 1} / {SLIDES.length}
        </p>
        <h2 className="big">{title}</h2>
        <p>{body}</p>
        <Button
          onClick={() => {
            if (step < SLIDES.length - 1) setStep(step + 1);
            else updateSettings({ onboardingDone: true });
          }}
        >
          {step < SLIDES.length - 1 ? "Next" : "Start"}
        </Button>
      </div>
    </div>
  );
}
