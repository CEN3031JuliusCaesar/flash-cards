import "./SandwichMenu.css";
import { VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

interface SandwichMenuProps {
  children: (close: () => void) => VNode;
  buttonAriaLabel?: string;
  className?: string;
}

export function SandwichMenu({
  children,
  buttonAriaLabel = "Open menu",
  className = "",
}: SandwichMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  // Handle clicks outside to close menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <div className={`sandwich-menu ${className}`} ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label={buttonAriaLabel}
        aria-haspopup="true"
        className={`sandwich-button ${isOpen ? "open" : ""}`}
      >
        <div className="sandwich-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="sandwich-content"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
