import React, { memo } from "react";
import './App.css';
import packageJson from "../package.json";
import {SideBarData} from "./SideBarData";
import { NavLink } from "react-router-dom";

function SideBar() {
    return (
        <aside className={'SideBar'}>
            <ul className={'SideBarList'}>
                <li key={-1} className={'toprow'}>
                    <div className={'icon'}>
                        <img
                            alt="Stanford Core NLP Logo"
                            src="icon.svg"
                            style={{height: 60}}
                            className="d-inline-block align-top"
                        />
                    </div>
                    {' '}
                    <div className={'title'}>
                        <h2 style={{fontSize: "24px", margin: 0}}>Stanford NLP</h2>
                        <div style={{fontSize: "12px"}}>Version {packageJson.version}</div>
                    </div>
                </li>
            </ul>
            <nav aria-label="Primary navigation">
                <ul className="SideBarNavList">
                    {SideBarData.map((item) => (
                        <li key={item.key} className="SideBarNavItem">
                            <NavLink
                                to={item.key}
                                end={item.key === '/'}
                                className={({ isActive }) => `SideBarNavLink${isActive ? ' is-active' : ''}`}
                            >
                                {item.icon ? <span className="SideBarNavIcon">{item.icon}</span> : null}
                                <span>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )
}

export default memo(SideBar);
