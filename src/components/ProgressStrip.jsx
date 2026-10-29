export default function ProgressStrip({ label }) {
  if (!label) return null;
  return <div className="banner">{label}</div>;
}
