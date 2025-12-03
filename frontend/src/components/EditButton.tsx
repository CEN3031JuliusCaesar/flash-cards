import "./EditButton.css";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="edit-button button" type="button" onClick={onClick}>
      Edit
    </button>
  );
}
