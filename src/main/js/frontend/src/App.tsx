import React from 'react';
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import SetupContent from "./SetupContent";
import NERContext from "./NERContext";
import HomeContent from "./HomeContent";
import RagContent from "./RagContent";
import OpenApiContent from "./OpenApiContent";

function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<HomeContent/>} />
                <Route path="/setup" element={<SetupContent/>} />
                <Route path="/ner" element={<NERContext/>} />
                <Route path="/rag" element={<RagContent/>} />
                <Route path="/api-docs" element={<OpenApiContent/>} />

            </Route>
        </Routes>
    </Router>
  );
}

export default App;
