import "./DeleteButton.css";

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="delete-button" type="button" onClick={onClick}>
      Delete
    </button>
  );
}
