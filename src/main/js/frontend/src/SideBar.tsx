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
            </ul>
            <TreeMenu
                data={SideBarData}
                activeKey={location.pathname}
                onClickItem={onClickItem}
                hasSearch={false}
            />
        </div>
    )
}

export default memo(SideBar);
