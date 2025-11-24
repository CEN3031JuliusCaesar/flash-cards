import { useState } from "preact/hooks";
import { useLocation } from "preact-iso/router";
import "./style.css"
export default function StudySetsPage() {
  const yourSets = [
    //EXAMPLE SETS, REMOVE AFTER API HOOKUP:
    {
      title: "Limits Study Set",
      creator: "John Smith",
      published: "10/09/2025",
      cards: 35,
      isEnabled: true,
    },
    {
      title: "Derivatives and Differentiation Methods with a Long name example",
      creator: "John Smith",
      published: "10/04/2025",
      cards: 35,
      isEnabled: true,
    },
    {
      title: "Another example study set with a longer named",
      creator: "John Smith",
      published: "10/04/2025",
      cards: 1000,
      isEnabled: true,
    },
    {
      title: "Title 1",
      creator: "Creator 1",
      published: "10/04/2025",
      cards: 15,
      isEnabled: true,
    },
    {
      title: "Title 2",
      creator: "Creator 1",
      published: "10/04/2025",
      cards: 15,
      isEnabled: true,
    },
    {
      title: "Title 2",
      creator: "Creator 1",
      published: "10/04/2025",
      cards: 15,
      isEnabled: true,
    },
    {
      title: "Title 2",
      creator: "Creator 1",
      published: "10/04/2025",
      cards: 15,
      isEnabled: true,
    },
    {
      title: "Title 2",
      creator: "Creator 1",
      published: "10/04/2025",
      cards: 15,
      isEnabled: true,
    },
    //last set will be for adding new sets:



    //GRAB OWNED SETS FROM API
    //APU UPDATE
  ];

  const followedSets = [
    //EXAMPLE SETS, REMOVE AFTER API HOOKUP:
    {
      title: "A study set on study sets",
      creator: "WormSniff421",
      published: "10/09/2025",
      cards: 35,
      isEnabled: false,
    },
    {
      title: "How to do a handstand",
      creator: "NoArmLarry",
      published: "10/04/2025",
      cards: 35,
      isEnabled: false,
    },
    {
      title: "Luffy from one piece vs uhh naruto or whatever?",
      creator: "Edgy_Anime_xXx",
      published: "10/04/2025",
      cards: 35,
      isEnabled: false,
    },
    //GRAB FOLLOWED SETS FROM API
    //API UPDATE
  ];

  return (
    <div class="studysets-page">

      <h2>Your Sets</h2>
      <div class="set-grid">
        {yourSets.map((set) => (
          <SetCard set={set} />
        ))}

        {/* Last card: Create New Set */}
        <div class="set-card create-new-set" onClick={() => alert("Not implemented yet")}>
          <div class="set-card-title">＋ Create New Set</div>
        </div>

      </div>
      


      <h2>Followed Sets</h2>
      <div class="set-grid">
        {followedSets.map((set) => (
          <SetCard set={set} />
        ))}
      </div>
    </div>
  );
}

function SetCard({ set }) {
  const [isEnabled, setIsEnabled] = useState(set.isEnabled);

  const toggleEnabled = () => {
    setIsEnabled(!isEnabled);
    // API UPDATE
  };

  return (
    <div class="set-card">
      <div class="set-card-title">{set.title}</div>

      <div class="set-card-pencil" title="Edit Set">✏️</div>

      <div class="set-card-info">
        <div>Creator: <span class="creator">{set.creator}</span></div>
        <div>Published: {set.published}</div>
        <div>{set.cards} Cards</div>
      </div>

      <div class="set-card-icon" onClick={toggleEnabled}>
        {isEnabled ? (
          <div class="icon-check">✔</div>
        ) : (
          <div class="icon-plus">＋</div>
        )}
      </div>
    </div>
  );
}