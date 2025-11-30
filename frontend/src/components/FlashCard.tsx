import "./FlashCard.css";
import { EditButton } from "./EditButton.tsx";
import { DeleteButton } from "./DeleteButton.tsx";

export interface FlashCardProps {
  front: string;
  back: string;
  editable?: boolean;
  onFrontChange?: (value: string) => void;
  onBackChange?: (value: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FlashCard(
  {
    front,
    back,
    editable = false,
    onFrontChange,
    onBackChange,
    onEdit,
    onDelete,
  }: FlashCardProps,
) {
  return (
    <div className="flash-card">
      {onEdit || onDelete
        ? (
          <div className="flash-card-buttons">
            {onEdit && <EditButton onClick={onEdit} />}
            {onDelete && <DeleteButton onClick={onDelete} />}
          </div>
        )
        : null}
      <div className="flash-card-labels">
        <div className="flash-card-label front-label">
          <span style={{ fontWeight: "bold" }}>Front:</span>
        </div>
        <div className="flash-card-label back-label">
          <span style={{ fontWeight: "bold" }}>Back:</span>
        </div>
      </div>
      <div className="flash-card-content">
        <div
          className="flash-card-front"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            flex: 1,
          }}
        >
          {editable
            ? (
              <textarea
                id="front-input"
                style={{ width: "90%", minHeight: "60px", resize: "vertical" }}
                value={front}
                placeholder="Enter front text..."
                onInput={(e: Event) =>
                  onFrontChange &&
                  onFrontChange((e.target as HTMLTextAreaElement).value)}
              />
            )
            : front}
        </div>
        <div
          className="flash-card-back"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            flex: 1,
          }}
        >
          {editable
            ? (
              <textarea
                id="back-input"
                style={{ width: "90%", minHeight: "60px", resize: "vertical" }}
                value={back}
                placeholder="Enter back text..."
                onInput={(e: Event) =>
                  onBackChange &&
                  onBackChange((e.target as HTMLTextAreaElement).value)}
              />
            )
            : back}
        </div>
      </div>
    </div>
  );
}
