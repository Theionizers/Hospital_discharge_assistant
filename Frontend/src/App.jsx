import Chatwindow from "./components/Chatwindow";
import Home from "./Pages/Home";
import "./App.css";
import { useEffect, useState } from "react";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleNavigation = () => setPath(window.location.pathname);

    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("app:navigation", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("app:navigation", handleNavigation);
    };
  }, []);

  return path === "/" ? <Home /> : <Chatwindow />;
}

export default App;
