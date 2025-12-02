import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSet,
  getSetsByOwner,
  getTrackedSets,
  type Set,
} from "../../api/sets.ts";
import { useAuthRedirect } from "../../utils/cookies.ts";
import "./style.css";
import { useLocation } from "preact-iso";
import { SetCard } from "../../components/SetCard.tsx";

export default function StudySetsPage() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const { username, isLoading: authLoading } = useAuthRedirect();

  if (authLoading) return <div class="studysets-page">Loading...</div>;
  if (!username) return null;

  const {
    data: ownedSets = [],
    isLoading: ownedSetsLoading,
    error: ownedSetsError,
  } = useQuery({
    queryKey: ["ownedSets", username],
    queryFn: () => getSetsByOwner(username),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: trackedSets = [],
    isLoading: trackedSetsLoading,
    error: trackedSetsError,
  } = useQuery({
    queryKey: ["trackedSets"],
    queryFn: () => getTrackedSets(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createSetMutation = useMutation({
    mutationFn: createSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownedSets", username] });
    },
  });

  const handleCreateSet = () => {
    const title = prompt("Enter the title for your new study set:");
    if (title) {
      createSetMutation.mutate({ title });
    }
  };

  if (ownedSetsLoading || trackedSetsLoading) {
    return <div class="studysets-page">Loading study sets...</div>;
  }

  if (ownedSetsError || trackedSetsError) {
    return (
      <div class="studysets-page">
        Error loading study sets:{" "}
        {ownedSetsError?.message || trackedSetsError?.message}
      </div>
    );
  }

  return (
    <div class="studysets-page">
      <div class="header">
        <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
      </div>

      <h2>Your Sets</h2>
      <div class="set-grid">
        {ownedSets.map((set) => (
          <SetCard
            set={{
              title: set.title,
              owner: username,
              id: set.id,
            }}
          />
        ))}

        {/* Create New Set Card */}
        <div
          class={`set-card create-new-set ${
            createSetMutation.isPending ? "disabled" : ""
          }`}
          onClick={handleCreateSet}
        >
          <div class="set-card-title">＋ Create New Set</div>
        </div>
      </div>

      <h2>Active Sets</h2>
      <div class="set-grid">
        {trackedSets.map((set: Set) => (
          <SetCard
            key={set.id}
            set={{
              title: set.title,
              owner: set.owner,
              id: set.id,
            }}
          />
        ))}
      </div>
    </div>
  );
}
