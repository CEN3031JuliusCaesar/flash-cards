import "./style.css";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso/router";

const FlashCardPage = () => {
  const location = useLocation();

  const [flipped, setFlipped] = useState(false);
  const handleFlagThrow = () => {
    alert("Feature not implemented yet");
  };

  return (
    <main class="learn">
      {/* Flashcard rendering */}
      <div class={`flashcard ${flipped ? "flipped" : ""}`}>
        <div class="front">Front of card</div>
        <div class="back">Back of card</div>
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
        <button type="button" class="flag-button" onClick={handleFlagThrow}>
          Fully Learned
        </button>
        <button type="button" class="flag-button" onClick={handleFlagThrow}>
          Almost Learned
        </button>

        <button type="button" class="flag-button" onClick={handleFlagThrow}>
          Need More Review
        </button>
      </div>
      {/*Back to dashboard button connects with onClick={onGoBack} */}
      <div>
        <button
          type="button"
          class="back-button"
          onClick={() => location.route("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  );
};

export default FlashCardPage;
