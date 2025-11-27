import "./style.css";
import { FlashCard } from "../../components/FlashCard.tsx";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSetById } from "../../api/sets.ts";
import { createCard } from "../../api/cards.ts";

export default function SetEditPage() {
  const location = useLocation();
  const queryClient = useQueryClient();

  // Extract set id from the path like /set/:id
  // use window.location.pathname because the LocationHook doesn't expose pathname
  const _g = globalThis as unknown as { location?: { pathname?: string } };
  const pathname = _g.location?.pathname ?? "";
  //regular expression to extract set id
  const match = pathname.match(/\/set\/([^/]+)/);
  const setId = match ? match[1] : "";

  const {
    data: set,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["set", setId],
    queryFn: () => getSetById(setId),
    enabled: !!setId,
  });

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const createCardMutation = useMutation({
    mutationFn: (params: { set_id: string; front: string; back: string }) =>
      createCard(params),
    onSuccess: () => {
      // Refresh the set so new card appears
      queryClient.invalidateQueries({ queryKey: ["set", setId] });
      setFront("");
      setBack("");
    },
  });

  const handleCreate = (e: Event) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      alert("Both front and back must be provided");
      return;
    }
    createCardMutation.mutate({
      set_id: setId,
      front: front.trim(),
      back: back.trim(),
    });
  };

  if (!setId) {
    return <div class="set-edit-page">No set id provided in URL</div>;
  }

  if (isLoading) {
    return <div class="set-edit-page">Loading set...</div>;
  }

  if (error) {
    return (
      <div class="set-edit-page">
        Error loading set: {String((error as Error).message)}
      </div>
    );
  }

  return (
    <div class="set-edit-page">
      <div class="header">
        <h3 onClick={() => location.route("/studysets")}>🡄 Back to Sets</h3>
      </div>

      <h2>{set?.title ?? "Study Set"}</h2>

      <section class="new-card">
        <h3>Add New Card</h3>
        <form onSubmit={handleCreate}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <FlashCard
              front={front}
              back={back}
              editable
              onFrontChange={setFront}
              onBackChange={setBack}
            />
          </div>
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <button type="submit" disabled={createCardMutation.isPending}>
              {createCardMutation.isPending ? "Creating..." : "Create Card"}
            </button>
          </div>
        </form>
      </section>

      <section class="existing-cards">
        <h3>Cards</h3>
        {set?.cards && set.cards.length > 0
          ? (
            <div class="cards-list">
              {set.cards.map((
                card: {
                  id: string;
                  set_id: string;
                  front: string;
                  back: string;
                },
              ) => (
                <FlashCard key={card.id} front={card.front} back={card.back} />
              ))}
            </div>
          )
          : <div>No cards yet. Add the first one below.</div>}
      </section>
    </div>
  );
}
