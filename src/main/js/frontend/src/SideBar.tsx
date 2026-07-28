import React, { memo, useCallback } from "react";
import './App.css';
import packageJson from "../package.json";
import {SideBarData} from "./SideBarData";
import TreeMenu from "react-simple-tree-menu";
import { useNavigate, useLocation } from "react-router-dom";
import 'react-simple-tree-menu/dist/main.css';

function SideBar() {
    let navigate = useNavigate();
    let location = useLocation();
    const onClickItem = useCallback(({ key }: { key: string }) => {
        navigate(key);
    }, [navigate]);

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
                <TreeMenu
                    data={SideBarData}
                    activeKey={location.pathname}
                    onClickItem={onClickItem}
                    hasSearch={false}
                />
            </nav>
        </aside>
    )
}

export default memo(SideBar);
