import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import { Link } from "react-router-dom";
import './App.css';

function HomeContent() {
    return (
        <div className={'NLPContent'} style={{padding: 35, overflowY: 'auto'}}>
            <h1>Stanford NLP for eXist-db</h1>
            <p>
                This app integrates Stanford CoreNLP with eXist-db so you can load language resources,
                process text, and extract named entities directly in your database-backed workflows.
            </p>

            <h2>What you can do here</h2>
            <ul>
                <li>
                    <b>Setup</b>: Download and load language models into the app data collection.
                </li>
                <li>
                    <b>NER</b>: Submit text and view highlighted named entities in the result.
                </li>
                <li>
                    <b>API/XQuery</b>: Use RESTXQ endpoints and XQuery modules for automation.
                </li>
            </ul>

            <h2>Typical workflow</h2>
            <ol>
                <li>Open <b>Setup</b> and load one or more languages.</li>
                <li>Open <b>NER</b>, pick a loaded language, then submit text.</li>
                <li>Use the generated output in your eXist-db queries or applications.</li>
            </ol>

            <h2>Quick Start</h2>
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
                <Link to="/setup" className="btn btn-primary">Go to Setup</Link>
                <Link to="/ner" className="btn btn-outline-primary">Go to NER</Link>
                <Link to="/rag" className="btn btn-outline-secondary">Go to RAG</Link>
                <Link to="/api-docs" className="btn btn-outline-dark">Open API Docs</Link>
            </div>
            <p style={{marginTop: 10}}>
                <b>RAG tip:</b> Ingest source text first, then run search queries to retrieve ranked chunks with entity-aware scoring.
            </p>

            <p style={{marginTop: 20}}>
                If a model load fails, the Setup page now shows a per-language error message to help
                with troubleshooting.
            </p>
        </div>
    );
}

export default HomeContent;

