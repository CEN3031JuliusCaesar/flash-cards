import "./style.css";
import { FlashCard } from "../../components/FlashCard.tsx";
import { useQuery } from "@tanstack/react-query";
import { getSetById } from "../../api/sets.ts";
import { useLocation, useRoute } from "preact-iso/router";
import { EditButton } from "../../components/EditButton.tsx";
import { useAuthRedirect } from "../../utils/cookies.ts";

export default function SetViewPage() {
  const location = useLocation();

  const route = useRoute();
  const setId = route.params.id;
  const { isAdmin, username, isLoading: authLoading } = useAuthRedirect(false);
  const setEditUrl = setId ? `/set/${setId}` : "/set";

  // shows status in inspect element for debugging memes
  console.log(
    "SetView - isAdmin:",
    isAdmin,
    "authLoading:",
    authLoading,
    "setId:",
    setId,
  );

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

  if (isLoading) {
    return <div class="set-view-page">Loading set...</div>;
  }

  if (error) {
    return (
      <div class="set-view-page">
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
    <div class="set-view-page">
      <div class="header">
        <h3 onClick={() => location.route("/studysets")}>🡄 Back to Sets</h3>
        <div class="header-buttons">
          {/* show edit button if admin, set owner, or devuser */}
          {!authLoading && setId && (isAdmin || username === set?.owner) && (
            <EditButton onClick={() => location.route(setEditUrl)} />
          )}
          {setId && (
            <button
              type="button"
              class="study-button button"
              onClick={() => location.route(`/learn/${setId}`)}
            >
              Study
            </button>
          )}
        </div>
      </div>

      <h2>{set?.title ?? "Study Set"}</h2>

      <section class="cards-section">
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
                />
              ))}
            </div>
          )
          : <div>No cards in this set.</div>}
      </section>
    </div>
  );
}
