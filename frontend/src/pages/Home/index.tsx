import "./style.css";
import { lazy, Suspense } from "preact/compat";

// const PromiseComponent = lazy(() =>
//   fetch("/api/test")
//     .then((x) => x.json())
//     .then((x) => () => <p>{JSON.stringify(x)}</p>),
// );

export default function Home() {
  return (
    <div class="home">
      <Suspense fallback=":)">
        {/*<PromiseComponent></PromiseComponent>*/}
      </Suspense>
    </div>
  );
}
