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
        <div className={'LoadingContent setup-panel'}>
            <h1>Load</h1>
            <p className="setup-intro">Click on the language button to load each language.</p>
            {pollError ? (
                <div role="alert" className="setup-poll-error">
                    {pollError}
                </div>
            ) : null}
            {lastUpdated ? (
                <div role="status" aria-live="polite" className="setup-last-updated">
                    Last updated: <time dateTime={lastUpdated}>{lastUpdated}</time>
                </div>
            ) : null}
            <div className="setup-language-grid">
                {LANGUAGE_BUTTONS.map((languageButton) => {
                    const current = running[languageButton.key];
                    const languageError = getLanguageError(languageButton.key);
                    return (
                        <div key={languageButton.key} className="setup-language-item">
                            <Button
                                className="setup-language-button"
                                onClick={() => loadLanguage(languageButton.key)}
                                disabled={current.isRunning}
                            >
                                <span className="setup-language-button-label">
                                    {renderLanguageStatusIcon(current)}
                                    <span>{languageButton.label}</span>
                                </span>
                            </Button>
                            {languageError ? (
                                <div className="setup-language-error">
                                    {languageError}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <section className="setup-logs">
                <h2>Activity Log</h2>
                <div className="setup-log-table-wrap">
                    <table className="setup-log-table">
                        <caption>Language loader activity log.</caption>
                        <thead>
                        <tr>
                            <th scope="col" className="setup-col-timestamp">Timestamp</th>
                            <th scope="col" className="setup-col-language">Language</th>
                            <th scope="col" className="setup-col-message">Log</th>
                        </tr>
                        </thead>
                        <tbody>{
                            logs.length === 0 ? (
                                <tr>
                                    <td colSpan={3}>No log entries yet.</td>
                                </tr>
                            ) : logs.map((log, index) => {
                                return (
                                    <tr key={log.timestamp + '-' + log.language + '-' + index}>
                                        <td className="setup-col-timestamp">{log.timestamp}</td>
                                        <td className="setup-col-language">{log.language}</td>
                                        <td className="setup-col-message">{log.message}</td>
                                    </tr>
                                )
                            })
                        }</tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

export default SetupContent;
