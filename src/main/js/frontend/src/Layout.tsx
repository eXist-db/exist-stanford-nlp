import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React from "react";
import SideBar from "./SideBar";
import NLPContent from "./NLPContent";

export default class Layout extends React.Component<any, any> {

    render() {
        return (
            <div className={'App'}>
                <SideBar />
                <NLPContent />
            </div>
        );
    }
}
