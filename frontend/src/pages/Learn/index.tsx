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

  const [studyCards, setStudyCards] = useState<Set | null>(null);

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

  useEffect(() => {
    if (studyCards == null && studySet != null) {
      setStudyCards(studySet);
    }
  }, [studySet, studySetLoading, studySetError]);

  const [currentCardId, setCurrentCardId] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (studyCards == null) {
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
    studyCards.cards == null || studyCards.cards.length <= currentCardId
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
  const currentCard = studyCards.cards[currentCardId];

  const handleFlagThrow = (correct: boolean) => {
    updateCardMutation.mutate({
      id: currentCard.id,
      result: correct ? "correct" : "incorrect",
    });
    setCurrentCardId(currentCardId + 1);
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
