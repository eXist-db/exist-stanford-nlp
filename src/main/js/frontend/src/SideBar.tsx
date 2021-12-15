import React from "react";
import './App.css';
import packageJson from "../package.json";
import {SideBarData} from "./SideBarData";

function SideBar() {
    return (
        <div className={'SideBar'}>
            <ul className={'SideBarList'}>
                <li key={-1} className={'toprow'}>
                    <div id={'icon'}>
                        <img
                            id="icon"
                            alt="Stanford Core NLP Logo"
                            src="icon.svg"
                            style={{height: 60}}
                            className="d-inline-block align-top"
                        />
                    </div>
                    {' '}
                    <div id={'title'}>
                        <div style={{fontSize: "24px"}}>Stanford NLP</div>
                        <div style={{fontSize: "8px"}}>Version {packageJson.version}</div>
                    </div>
                </li>
                {SideBarData.map((val, key) => {
                    return (
                        <li key={key} className={'row'}>
                            <div id={'icon'}>{val.icon}</div>
                            {' '}
                            <div id={'title'}>{val.title}</div>
                        </li>
                    )
                })}

            </ul>
        </div>
    )
}

export default SideBar;
