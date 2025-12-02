import "./Search.css";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso/router";

export function Search(
  { defaultSearch, class: classlist }: {
    defaultSearch?: string;
    class?: string;
  },
) {
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setSearchValue(defaultSearch ?? "");
  }, [defaultSearch]);

  return (
    <div class={`searchbar ${classlist}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          location.route(`/search?q=${searchValue}`);
        }}
      >
        <label>🔍︎</label>
        <input
          size={1}
          type="text"
          value={searchValue}
          placeholder="Search..."
          onInput={(e: InputEvent) =>
            setSearchValue((e.target as HTMLInputElement).value)}
        />
      </form>
    </div>
  );
}
