import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from "react";
import './App.css';
import {Button, Spinner} from "react-bootstrap";
import {Check } from 'react-bootstrap-icons';

function LoadingContent() {
    const [logs, setLogs] = useState([{
        timestamp: "",
        language: "",
        message: ""
    }]);
    const [running, setRunning] = useState({
        "arabic": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "english-kbp": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "english": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "chinese": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "french": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "german": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "spanish": { "start": null, "end": null, "isRunning": false, isLoaded: false }
    })
    const [last, setLast] = useState(null);
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        const intervalVar = setInterval(fetchLogs, 10000);

        return () => clearInterval(intervalVar);
    }, [])

    function fetchLogs() {
        let uri = '/exist/restxq/stanford/nlp/logs';

        if (last) {
            uri += "?timestamp=" + last;
        }

        fetch(uri)
            .then((response) => response.json())
            .then(
                (result) => {
                    if (last) {
                        setLogs([result.logs, ...logs]);
                    } else {
                        setLogs(result.logs);
                    }
                    setRunning(result.running);
                    setLast(result.timestamp);
                },
                (error) => {

                }
            )
    }

    function loadLanguage(theLanguage: string) {
        let aRunning = running;
        // @ts-ignore
        aRunning[theLanguage].isRunning = true;
        // @ts-ignore
        aRunning[theLanguage].isLoaded = false;
        setRunning(aRunning);
        setCounter(counter + 1)

        fetch("/exist/restxq/stanford/nlp/load/" + theLanguage)
            .then((response) => response.json())
            .then(
                (result) => {
                },
                (error) => {

                }
            )
    }

    return (
        <div className={'LoadingContent'}>
            <h1>Load</h1>
            <Button onClick={() => loadLanguage('arabic')} disabled={running.arabic.isRunning}>
                {
                    running.arabic.isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running.arabic.isLoaded ?
                    <Check/>
                    :null
                    }
                Arabic
            </Button>
            <Button onClick={() => loadLanguage('chinese')} disabled={running.chinese.isRunning}>{
                running.chinese.isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running.chinese.isLoaded ?
                        <Check/>
                        :null
            }
                Chinese</Button>
            <Button onClick={() => loadLanguage('english')} disabled={running.english.isRunning}>{
                running.english.isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running.english.isLoaded ?
                        <Check/>
                        :null
            }
                English</Button>
            <Button onClick={() => loadLanguage('english-kbp')} disabled={running['english-kbp'].isRunning}>{
                running['english-kbp'].isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running['english-kbp'].isLoaded ?
                        <Check/>
                        :null
            }
                English KBP</Button>
            <Button onClick={() => loadLanguage('french')} disabled={running.french.isRunning}>{
                running.french.isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running.french.isLoaded ?
                        <Check/>
                        :null
            }
                French</Button>
            <Button onClick={() => loadLanguage('german')} disabled={running.german.isRunning}>{
                running.german.isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running.german.isLoaded ?
                        <Check/>
                        :null
            }
                German</Button>
            <Button onClick={() => loadLanguage('spanish')} disabled={running.spanish.isRunning}>{
                running.spanish.isRunning ?
                    <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>
                    : running.spanish.isLoaded ?
                        <Check/>
                        :null
            }
                Spanish</Button>
            <table>
                <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Language</th>
                    <th>Log</th>
                </tr>
                </thead>
                <tbody>{
                    logs.map((log) => {
                        return (
                            <tr>
                                <td>{log.timestamp}</td>
                                <td>{log.language}</td>
                                <td>{log.message}</td>
                            </tr>
                    )
                })
                }</tbody>
            </table>
        </div>
    )
}

export default LoadingContent;
