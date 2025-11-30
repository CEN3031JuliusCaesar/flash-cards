import { useQuery } from "@tanstack/react-query";
import { getSetTrackedStatus } from "../api/sets.ts";

import "./SetCard.css";
import { useLocation } from "preact-iso";
import { EditButton } from "./EditButton.tsx";

export function SetCard({ set, onToggle }: {
  set: {
    title: string;
    creator: string;
    published: string;
    cards: number;
    id: string;
    isOwned: boolean;
  };
  onToggle?: (
    setId: string,
    currentlyTracked: "SET_UNTRACKED" | "SET_TRACKED",
  ) => void;
}) {
  const location = useLocation();

  // Query to check if this specific set is tracked
  const { data: trackedStatus = { isTracked: "SET_UNTRACKED" } } = useQuery({
    queryKey: ["setTrackedStatus", set.id],
    queryFn: () => getSetTrackedStatus(set.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleEnabled = () => {
    if (onToggle) {
      onToggle(set.id, trackedStatus.isTracked);
    }
  };

  return (
    <div class="set-card">
      <div
        class="set-card-title clickable"
        onClick={() => location.route(`/view/${set.id}`)}
      >
        {set.title}
      </div>

      <div class="set-card-info">
        <div>
          Creator:{" "}
          <span
            onClick={() => location.route(`/user/${set.creator}`)}
            class="creator"
          >
            {set.creator}
          </span>
        </div>
        {
          /*<div>Published: {set.published}</div>
        <div>{set.cards} Cards</div>*/
        }
      </div>

      <div class="set-card-controls">
        {set.isOwned && (
          <EditButton onClick={() => location.route(`/set/${set.id}`)} />
        )}
        <div class="set-card-icon" onClick={toggleEnabled}>
          {trackedStatus.isTracked === "SET_TRACKED"
            ? <div class="icon-check">✔</div>
            : <div class="icon-plus">＋</div>}
        </div>
      </div>
    </div>
  );
}
