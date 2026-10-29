import { Link } from "react-router-dom";
import { Photo } from "./Bits.jsx";

export default function ItemCard({ item }) {
  const badge = item.status === "needs_review" ? "Check tags" : item.status === "pending_analysis" ? "Waiting" : "";
  return (
    <Link className="tile" to={`/item/${item.id}`}>
      <Photo blob={item.thumbBlob || item.imageBlob} alt={item.name} />
      <p>
        {item.name}
        {badge ? <span className="badge"> {badge}</span> : null}
      </p>
    </Link>
  );
}
