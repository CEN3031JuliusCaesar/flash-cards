import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSetTrackedStatus, trackSet, untrackSet } from "../api/sets.ts";

import "./SetCard.css";
import { useLocation } from "preact-iso";
// import { EditButton } from "./EditButton.tsx";

export function SetCard({ set, previewCard }: {
  set: {
    title: string;
    owner: string;
    id: string;
  };
  previewCard?: { front: string; back: string };
}) {
  const location = useLocation();
  const queryClient = useQueryClient();

  // Query to check if this specific set is tracked
  const { data: trackedStatus = { isTracked: "SET_UNTRACKED" } } = useQuery({
    queryKey: ["setTrackedStatus", set.id],
    queryFn: () => getSetTrackedStatus(set.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const trackSetMutation = useMutation({
    mutationFn: trackSet,
    onSuccess: (_, setId) => {
      queryClient.invalidateQueries({ queryKey: ["trackedSets"] });
      queryClient.invalidateQueries({ queryKey: ["setTrackedStatus", setId] });
    },
  });

  const untrackSetMutation = useMutation({
    mutationFn: untrackSet,
    onSuccess: (_, setId) => {
      queryClient.invalidateQueries({ queryKey: ["trackedSets"] });
      queryClient.invalidateQueries({ queryKey: ["setTrackedStatus", setId] });
    },
  });

  const toggleEnabled = () => {
    if (trackedStatus.isTracked == "SET_TRACKED") {
      untrackSetMutation.mutate(set.id);
    } else {
      trackSetMutation.mutate(set.id);
    }
  };

  return (
    <div class="set-card">
      <div class="primary-info">
        <div
          class="set-card-title clickable"
          onClick={() => location.route(`/set/${set.id}`)}
        >
          {set.title}
        </div>

        <div class="set-card-info clickable">
          <div>
            Creator:{" "}
            <span
              onClick={() => location.route(`/user/${set.owner}`)}
              class="creator"
            >
              {set.owner}
            </span>
          </div>
          {
            /*<div>Published: {set.published}</div>
          <div>{set.cards} Cards</div>*/
          }
        </div>

        <div class="set-card-controls">
          <div class="set-card-icon" onClick={toggleEnabled}>
            {trackedStatus.isTracked === "SET_TRACKED"
              ? <div class="icon-check">✔</div>
              : <div class="icon-plus">＋</div>}
          </div>
        </div>
      </div>

      {previewCard && (
        <div class="preview-card">
          <div class="front">{previewCard.front}</div>
          <div class="back">{previewCard.back}</div>
        </div>
      )}
    </div>
  );
}
