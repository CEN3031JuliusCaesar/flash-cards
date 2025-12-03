import "./style.css";
import { FlashCard } from "../../components/FlashCard.tsx";
import { EditButton } from "../../components/EditButton.tsx";
import { useEffect, useState } from "preact/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSet, getSetById, updateSet } from "../../api/sets.ts";
import { createCard, deleteCard, updateCard } from "../../api/cards.ts";
import { useLocation, useRoute } from "preact-iso/router";
import { useAuthRedirect } from "../../utils/cookies.ts";

export default function SetEditPage() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const route = useRoute();
  const setId = route.params.id;
  const { isAdmin, username, isLoading: authLoading } = useAuthRedirect(false);

  const {
    data: set,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["set", setId],
    queryFn: () => getSetById(setId),
    enabled: Boolean(setId),
    retry(fails, error) {
      if (fails >= 3) return false;

      return !error.message.includes("404");
    },
  });

  // Redirect unauthorized users to view page after set data loads
  useEffect(() => {
    if (!authLoading && !isLoading && setId && set) {
      const isOwner = username === set.owner;
      const allowed = isAdmin || isOwner;
      if (!allowed) {
        location.route(`/view/${setId}`, true);
      }
    }
  }, [authLoading, isLoading, isAdmin, username, set, setId, location]);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(set?.title ?? "");
  // Editing states
  const [editingCard, setEditingCard] = useState<
    { id: string; front: string; back: string } | null
  >(null);

  function handleEditCard(card: { id: string; front: string; back: string }) {
    setEditingCard(card);
    setFront(card.front);
    setBack(card.back);
  }

  const updateCardMutation = useMutation({
    mutationFn: (
      { cardId, front, back }: { cardId: string; front: string; back: string },
    ) => updateCard(cardId, { front, back }),
    onSuccess: () => {
      setEditingCard(null);
      setFront("");
      setBack("");
      // Refresh the set so updated card appears
      queryClient.invalidateQueries({ queryKey: ["set", setId] });
    },
  });

  function handleEditFinish(e: Event) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      alert("Both front and back must be provided");
      return;
    }

    if (editingCard) {
      updateCardMutation.mutate({
        cardId: editingCard.id,
        front: front.trim(),
        back: back.trim(),
      });
    }
  }

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => {
      // Refresh the set so card is removed from the set
      queryClient.invalidateQueries({ queryKey: ["set", setId] });
    },
  });

  function handleDeleteCard(cardId: string) {
    if (confirm("Are you sure you want to delete this card?")) {
      deleteCardMutation.mutate(cardId);
    }
  }

  const updateSetTitleMutation = useMutation({
    mutationFn: ({ setId, title }: { setId: string; title: string }) =>
      updateSet(setId, { title }),
    onSuccess: () => {
      setEditingTitle(false);
      // Refresh the set so new name appears
      queryClient.invalidateQueries({ queryKey: ["set", setId] });
    },
  });

  function handleEditTitle() {
    setEditingTitle(true);
    setNewTitle(set?.title ?? "");
  }

  function handleEditTitleFinish(e: Event) {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Title cannot be empty");
      return;
    }

    updateSetTitleMutation.mutate({
      setId,
      title: newTitle.trim(),
    });
  }
  // end of editing states

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

  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) => deleteSet(setId),
    onSuccess: () => {
      // Invalidate queries so the deleted set is removed from cache (so its gone after redirect without need of refresh)
      queryClient.invalidateQueries({ queryKey: ["ownedSets"] });
      queryClient.invalidateQueries({ queryKey: ["trackedSets"] });
      queryClient.invalidateQueries({ queryKey: ["set", setId] });
      // takes the user back to studysets page
      location.route("/studysets");
    },
  });

  function handleDeleteSet() {
    if (confirm("Are you sure you want to delete this set?")) {
      deleteSetMutation.mutate(setId);
    }
  }

  if (isLoading) {
    return <div class="set-edit-page">Loading set...</div>;
  }

  if (error) {
    return (
      <div class="set-edit-page">
        <div class="header">
          <h3 onClick={() => location.route("/studysets")}>🡄 Back to Sets</h3>
        </div>
        {error.message.includes("404")
          ? <>Set not found. Is the URL correct?</>
          : <>Error loading set: {String((error as Error).message)}</>}
      </div>
    );
  }

  return (
    <div class="set-edit-page">
      <div class="header">
        <h3 onClick={() => location.route("/studysets")}>🡄 Back to Sets</h3>
        <button
          type="button"
          class="view-mode-button button"
          onClick={() => location.route(`/view/${setId}`)}
        >
          View Mode
        </button>
      </div>

      {editingTitle
        ? (
          <section class="edit-title">
            <form onSubmit={handleEditTitleFinish}>
              <input
                type="text"
                value={newTitle}
                onInput={(e: Event) =>
                  setNewTitle((e.target as HTMLInputElement).value)}
                placeholder="Enter set title..."
                autoFocus
              />
              <div class="submit">
                <button type="submit">Save Title</button>
              </div>
            </form>
          </section>
        )
        : (
          <div class="title-section">
            <h2>{set?.title ?? "Study Set"}</h2>
            <EditButton onClick={handleEditTitle} />
          </div>
        )}

      <section class="new-card">
        <h3>{editingCard ? "Now Editing Card" : "Add New Card"}</h3>
        <form onSubmit={editingCard ? handleEditFinish : handleCreate}>
          <div class="edit-card">
            <FlashCard
              front={front}
              back={back}
              editable
              onFrontChange={setFront}
              onBackChange={setBack}
            />
          </div>
          <div class="submit">
            <button
              type="submit"
              disabled={createCardMutation.isPending ||
                updateCardMutation.isPending}
            >
              {editingCard
                ? updateCardMutation.isPending
                  ? "Updating..."
                  : "Finish Editing"
                : createCardMutation.isPending
                ? "Creating..."
                : "Create Card"}
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
                <FlashCard
                  key={card.id}
                  front={card.front}
                  back={card.back}
                  onEdit={() => handleEditCard(card)}
                  onDelete={() => handleDeleteCard(card.id)}
                />
              ))}
            </div>
          )
          : <div>No cards yet. Add the first one above.</div>}
      </section>

      <section class="delete-set">
        <button
          type="button"
          class="delete-set-button"
          onClick={handleDeleteSet}
          disabled={deleteSetMutation.isPending}
        >
          {deleteSetMutation.isPending ? "Deleting..." : "Delete Set"}
        </button>
      </section>
    </div>
  );
}
