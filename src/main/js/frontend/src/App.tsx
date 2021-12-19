import React from 'react';
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import LoadingContent from "./LoadingContent";
import NERContext from "./NERContext";

function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route path="/loading" element={<LoadingContent/>}>

                </Route>
                <Route path="/ner" element={<NERContext/>}>

                </Route>

            </Route>
        </Routes>
    </Router>
  );
}

export default App;
