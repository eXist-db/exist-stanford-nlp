import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React, { memo } from "react";
import SideBar from "./SideBar";
import NLPContent from "./NLPContent";

function Layout() {
    function focusMainContent() {
        document.getElementById('main-content')?.focus();
    }

    return (
        <div className={'App'}>
            <button type="button" className="skip-link" onClick={focusMainContent}>Skip to main content</button>
            <SideBar />
            <NLPContent />
        </div>
    );
}

export default memo(Layout);
