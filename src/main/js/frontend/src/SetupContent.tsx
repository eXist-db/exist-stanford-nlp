import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useCallback, useEffect, useRef, useState } from "react";
import './App.css';
import {Button, Spinner} from "react-bootstrap";
import {Check } from 'react-bootstrap-icons';

type LogEntry = {
    timestamp: string;
    language: string;
    message: string;
};

type LanguageStatus = {
    start: string | null;
    end: string | null;
    isRunning: boolean;
    isLoaded: boolean;
};

type RunningState = {
    arabic: LanguageStatus;
    "english-kbp": LanguageStatus;
    english: LanguageStatus;
    chinese: LanguageStatus;
    french: LanguageStatus;
    german: LanguageStatus;
    spanish: LanguageStatus;
};

type LogsResponse = {
    logs: LogEntry[];
    running: RunningState;
    timestamp: string | null;
};

const EMPTY_STATUS: LanguageStatus = { start: null, end: null, isRunning: false, isLoaded: false };

const INITIAL_RUNNING: RunningState = {
    arabic: { ...EMPTY_STATUS },
    "english-kbp": { ...EMPTY_STATUS },
    english: { ...EMPTY_STATUS },
    chinese: { ...EMPTY_STATUS },
    french: { ...EMPTY_STATUS },
    german: { ...EMPTY_STATUS },
    spanish: { ...EMPTY_STATUS }
};

const LANGUAGE_BUTTONS: Array<{ key: keyof RunningState; label: string }> = [
    { key: "arabic", label: "Arabic" },
    { key: "chinese", label: "Chinese" },
    { key: "english", label: "English" },
    { key: "english-kbp", label: "English KBP" },
    { key: "french", label: "French" },
    { key: "german", label: "German" },
    { key: "spanish", label: "Spanish" }
];

function SetupContent() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [running, setRunning] = useState<RunningState>(INITIAL_RUNNING);
    const lastRef = useRef<string | null>(null);

    const fetchLogs = useCallback(() => {
        let uri = '/exist/restxq/stanford/nlp/logs';

        if (lastRef.current) {
            uri += "?timestamp=" + encodeURIComponent(lastRef.current);
        }

        fetch(uri)
            .then((response) => response.json())
            .then((result: LogsResponse) => {
                    setLogs((previousLogs) => {
                        if (lastRef.current) {
                            return [...result.logs, ...previousLogs];
                        }
                        return result.logs;
                    });
                    setRunning(result.running);
                    lastRef.current = result.timestamp;
                }
            )
            .catch(() => {
                // Keep UI stable during intermittent polling/network failures.
            });
    }, []);

    useEffect(() => {
        fetchLogs();
        const intervalVar = setInterval(fetchLogs, 10000);

        return () => clearInterval(intervalVar);
    }, [fetchLogs]);

    function loadLanguage(theLanguage: keyof RunningState) {
        setLogs((previousLogs) => previousLogs.filter((log) => !(log.language === theLanguage && log.message.startsWith("error:"))));
        setRunning((previousRunning) => ({
            ...previousRunning,
            [theLanguage]: {
                ...previousRunning[theLanguage],
                isRunning: true,
                isLoaded: false
            }
        }));

        fetch("/exist/restxq/stanford/nlp/load/" + theLanguage)
            .then((response) => response.json())
            .catch(() => {
                setRunning((previousRunning) => ({
                    ...previousRunning,
                    [theLanguage]: {
                        ...previousRunning[theLanguage],
                        isRunning: false
                    }
                }));
            });
    }

    function renderLanguageStatusIcon(status: LanguageStatus) {
        if (status.isRunning) {
            return <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true"/>;
        }

        if (status.isLoaded) {
            return <Check/>;
        }

        return null;
    }

    function getLanguageError(theLanguage: keyof RunningState) {
        const latestLanguageLog = logs.find((log) => log.language === theLanguage && log.message.startsWith("error:"));
        return latestLanguageLog ? latestLanguageLog.message : null;
    }

    return (
        <div className={'LoadingContent'}>
            <h1>Load</h1>
            <div>Click on the language button to load each language.</div>
            {LANGUAGE_BUTTONS.map((languageButton) => {
                const current = running[languageButton.key];
                const languageError = getLanguageError(languageButton.key);
                return (
                    <div key={languageButton.key} style={{display: 'inline-block', marginRight: 8, marginBottom: 8}}>
                        <Button
                            onClick={() => loadLanguage(languageButton.key)}
                            disabled={current.isRunning}
                        >
                            {renderLanguageStatusIcon(current)}
                            {languageButton.label}
                        </Button>
                        {languageError ? (
                            <div style={{color: '#b00020', fontSize: 12, marginTop: 4, maxWidth: 360}}>
                                {languageError}
                            </div>
                        ) : null}
                    </div>
                );
            })}
            <table>
                <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Language</th>
                    <th>Log</th>
                </tr>
                </thead>
                <tbody>{
                    logs.map((log, index) => {
                        return (
                            <tr key={log.timestamp + '-' + log.language + '-' + index}>
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

export default SetupContent;
