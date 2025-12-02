import "./style.css";
import { useLocation, useRoute } from "preact-iso/router";
import { useEffect, useState } from "preact/hooks";
import { useQuery } from "@tanstack/react-query";
import { searchSets } from "../../api/sets.ts";
import { SetCard } from "../../components/SetCard.tsx";
import { Search } from "../../components/Search.tsx";

const SearchPage = () => {
  const route = useRoute();
  const location = useLocation();

  const search = route.query.q ?? "";

  const { data, isLoading, isError } = useQuery({
    queryFn() {
      return searchSets(search);
    },
    queryKey: ["search", search],
  });

  return (
    <>
      <div class="header">
        <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
      </div>

      <Search defaultSearch={search}></Search>

      {(isLoading || !data)
        ? "Loading..."
        : isError
        ? "Error in search. Try again."
        : (
          <div class="results">
            {data.map((x) => (
              <SetCard set={x} previewCard={x.card} key={x.id}></SetCard>
            ))}
          </div>
        )}
    </>
  );
};

export default SearchPage;
