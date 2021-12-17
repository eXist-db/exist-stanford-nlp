import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import { Outlet } from "react-router-dom";
import './App.css';

function NLPContent() {
    return (
        <div className={'NLPContent'}>
            <Outlet/>
        </div>
    )
}

export default NLPContent;
