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
    const [pollError, setPollError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
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
                    setPollError(null);
                    lastRef.current = result.timestamp;
                    if (result.timestamp) {
                        setLastUpdated(result.timestamp);
                    }
                }
            )
            .catch(() => {
                setPollError('Language status is temporarily unavailable. Retrying automatically.');
            });
    }, []);

    useEffect(() => {
        fetchLogs();
        const intervalVar = setInterval(fetchLogs, 10000);

        return () => clearInterval(intervalVar);
    }, [fetchLogs]);

    async function loadLanguage(theLanguage: keyof RunningState) {
        setLogs((previousLogs) => previousLogs.filter((log) => !(log.language === theLanguage && log.message.startsWith("error:"))));
        setRunning((previousRunning) => ({
            ...previousRunning,
            [theLanguage]: {
                ...previousRunning[theLanguage],
                isRunning: true,
                isLoaded: false
            }
        }));

        try {
            const response = await fetch("/exist/restxq/stanford/nlp/load/" + theLanguage);
            const payload = await response.json() as { status?: boolean; error?: string };

            if (!response.ok || payload.status !== true) {
                throw new Error(payload.error ?? `HTTP ${response.status}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to start language load.';
            setRunning((previousRunning) => ({
                ...previousRunning,
                [theLanguage]: {
                    ...previousRunning[theLanguage],
                    isRunning: false
                }
            }));
            setLogs((previousLogs) => [
                {
                    timestamp: new Date().toISOString(),
                    language: theLanguage,
                    message: `error: ${message}`
                },
                ...previousLogs
            ]);
        }
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
            {pollError ? (
                <div role="alert" style={{color: '#b00020', marginTop: 8, marginBottom: 8}}>
                    {pollError}
                </div>
            ) : null}
            {lastUpdated ? (
                <div style={{fontSize: 12, marginBottom: 8}}>
                    Last updated: {lastUpdated}
                </div>
            ) : null}
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
