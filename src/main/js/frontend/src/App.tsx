import React from 'react';
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./Layout";

function App() {
  return (
      <Router>
          <Routes>
              <Route path="/" element={<Layout />}>

              </Route>
          </Routes>
      </Router>
  );
}

export default App;
