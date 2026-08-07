import Chatwindow from "./components/Chatwindow";
import Home from "./Pages/Home";
import "./App.css";

function App() {
  return window.location.pathname === "/" ? <Home /> : <Chatwindow />;
}

export default App;
