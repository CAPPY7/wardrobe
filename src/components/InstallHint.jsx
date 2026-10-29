import { useEffect, useState } from "react";
import { Button } from "./Bits.jsx";

export default function InstallHint() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem("wardrobe-install-hide") === "1");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone) setHidden(true);
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(apple);
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;

  function dismiss() {
    localStorage.setItem("wardrobe-install-hide", "1");
    setHidden(true);
  }

  return (
    <div className="card">
      <strong>Install Wardrobe</strong>
      {ios ? (
        <p className="muted">On iPhone, open this page in Safari, tap Share, then Add to Home Screen.</p>
      ) : (
        <p className="muted">Add it to your home screen so the closet stays one tap away.</p>
      )}
      <div className="row">
        {prompt ? (
          <Button
            onClick={async () => {
              prompt.prompt();
              await prompt.userChoice;
              dismiss();
            }}
          >
            Install app
          </Button>
        ) : null}
        <Button variant="soft" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
