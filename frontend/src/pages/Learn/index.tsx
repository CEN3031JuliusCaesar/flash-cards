import "./style.css";
import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSetById, Set } from "../../api/sets.ts";
import { studyCard } from "../../api/cards.ts";

const FlashCardPage = () => {
  const location = useLocation();
  const route = useRoute();
  const queryClient = useQueryClient();

  const id = route.params.id;

  const {
    data: studySet = null,
    isLoading: studySetLoading,
    error: studySetError,
  } = useQuery({
    queryKey: ["sets", id, "study"],
    queryFn: () => getSetById(id, true),
  });

  const updateCardMutation = useMutation({
    mutationFn: async (
      { id, result }: { id: string; result: "correct" | "incorrect" },
    ) => {
      await studyCard(id, { result });

      return { id, result } as const;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sets", id, "study"],
        exact: true,
      });
    },
  });

  const [flipped, setFlipped] = useState(false);

  if (studySet == null) {
    return (
      <>
        <div class="header">
          <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
        </div>
        <div class="learn">
          <h2>Loading...</h2>
        </div>
      </>
    );
  } else if (
    studySet.cards == null || studySet.cards.length == 0
  ) {
    return (
      <>
        <div class="header">
          <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
        </div>
        <div class="learn">
          <h2>No cards left to study!</h2>
        </div>
      </>
    );
  }
  // Derived State
  // actual card from index
  const currentCard = studySet.cards[0];

  const handleFlagThrow = (correct: boolean) => {
    updateCardMutation.mutate({
      id: currentCard.id,
      result: correct ? "correct" : "incorrect",
    });
  };

  return (
    <>
      <div class="header">
        <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
      </div>
      <div class="learn">
        {/* Flashcard rendering */}
        <div class={`flashcard ${flipped ? "flipped" : ""}`}>
          <div class="front">{currentCard.front}</div>
          <div class="back">{currentCard.back}</div>
        </div>

        {/* "Flips" flashcard */}
        <button
          type="button"
          class="flip-button"
          onClick={() => setFlipped(!flipped)}
        >
          Flip Card
        </button>

        {/* Throw flags if buttons pressed (feature not implemented) */}
        <div class="flag-buttons">
          <button
            type="button"
            class="flag-button"
            onClick={() => handleFlagThrow(true)}
          >
            Correct
          </button>
          <button
            type="button"
            class="flag-button"
            onClick={() => handleFlagThrow(false)}
          >
            Incorrect
          </button>
        </div>
      </div>
    </>
  );
};

export default FlashCardPage;
