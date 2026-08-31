import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No #root element found");

ReactDOM.createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
