import { useState } from "preact/hooks";

type Props = {
  onGoBack?: () => void; // new prop for navigation
  
};

const FlashCardPage = ({ onGoBack }: Props) => {
  const [flipped, setFlipped] = useState(false);
  const handleFlagThrow = () => {alert("Feature not implemented yet");
// const FlashCardPage = () => {
//   const [flipped, setFlipped] = useState(false);
  }
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      {/* Flashcard rendering */}
      <div
        style={{
          width: "300px",
          height: "200px",
          border: "2px solid #333",
          borderRadius: "8px",
          display: "flex",
          justifyCaontent: "center",
          alignItems: "center",
          fontSize: "1.5rem",
          marginBottom: "1rem",
          backgroundColor: "#f0f0f0",
        }}
      >
        {/* ternary operator, switches between two states, True and False */}
        {flipped ? "Back of card" : "Front of card"}
      </div>

      {/* "Flips" flashcard */}
      <button
        onClick={() => setFlipped(!flipped)}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        Flip Card
      </button>


      {/* Throw flags if buttons pressed (feature not implemented) */}
      <div style={{ display: "flex", gap: "0.5rem" }}>

        <button 
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            onClick = {handleFlagThrow} 
        >
          Fully Learned
        </button>
        <button
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            onClick = {handleFlagThrow} 
        >
          Almost Learned
        </button>

        <button 
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            onClick = {handleFlagThrow} 
        >
          Need More Review
        </button>

      </div>
    {/*Back to dashboard button connects with onClick={onGoBack} */}
    <div style={{ marginTop: "1rem" }}>
        <button
          onClick={onGoBack}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  );
};

export default FlashCardPage;
