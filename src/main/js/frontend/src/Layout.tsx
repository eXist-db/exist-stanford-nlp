import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React, { memo } from "react";
import SideBar from "./SideBar";
import NLPContent from "./NLPContent";

function Layout() {
    return (
        <div className={'App'}>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <SideBar />
            <NLPContent />
        </div>
    );
}

export default memo(Layout);
