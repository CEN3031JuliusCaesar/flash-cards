import preactLogo from "../../assets/preact.svg";
import "./style.css";
import { Suspense, lazy } from "preact/compat";

const PromiseComponent = lazy(() =>
  fetch("/api/test")
    .then((x) => x.json())
    .then((x) => () => <p>{JSON.stringify(x)}</p>),
);

export function Home() {
  return (
    <div class="home">
      <Suspense fallback=":)">
        <PromiseComponent></PromiseComponent>
      </Suspense>
    </div>
  );
}
