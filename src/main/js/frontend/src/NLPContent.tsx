import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import './App.css';

function NLPContent() {
    const location = useLocation();
    const mainRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        mainRef.current?.focus();
    }, [location.pathname]);

    return (
        <main id="main-content" ref={mainRef} tabIndex={-1} className={'NLPContent'}>
            <Outlet/>
        </main>
    )
}

export default NLPContent;
