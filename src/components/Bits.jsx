import { useEffect, useState } from "react";

export function useBlob(blob) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function Button({ children, variant = "primary", ...props }) {
  return (
    <button className={`btn ${variant}`} type="button" {...props}>
      {children}
    </button>
  );
}

export function Chip({ active, children, ...props }) {
  return (
    <button className={`chip ${active ? "active" : ""}`} type="button" {...props}>
      {children}
    </button>
  );
}

export function Photo({ blob, className, alt }) {
  const url = useBlob(blob);
  if (!url) return <div className={className || "ph"} />;
  return <img className={className} src={url} alt={alt || ""} />;
}
