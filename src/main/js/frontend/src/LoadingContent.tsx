import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import './App.css';
import {Button} from "react-bootstrap";

function LoadingContent() {
    return (
        <div className={'LoadingContent'}>
            <h1>Load</h1>
            <Button>Arabic</Button>
            <Button>Chinese</Button>
            <Button>English</Button>
            <Button>English KBP</Button>
            <Button>French</Button>
            <Button>German</Button>
            <Button>Spanish</Button>
        </div>
    )
}

export default LoadingContent;
