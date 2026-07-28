import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import { Outlet } from "react-router-dom";
import './App.css';

function NLPContent() {
    return (
        <main id="main-content" tabIndex={-1} className={'NLPContent'}>
            <Outlet/>
        </main>
    )
}

export default NLPContent;
