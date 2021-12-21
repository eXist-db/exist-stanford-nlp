import 'bootstrap/dist/css/bootstrap.min.css';
import React, {useEffect, useState} from "react";
import './App.css';
import {Button, Col, Form, Row} from "react-bootstrap";
import ReactJson from 'react-json-view';

function NERContext() {

    const [running, setRunning] = useState({
        "arabic": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "english-kbp": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "english": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "chinese": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "french": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "german": { "start": null, "end": null, "isRunning": false, isLoaded: false },
        "spanish": { "start": null, "end": null, "isRunning": false, isLoaded: false }
    })

    const [language, setLanguage] = useState("en");
    const [content, setContent] = useState("");
    const [namedEntities, setNamedEntities] = useState("");
    const [nerError, setNerError] = useState({ code: null, description: null, value: null, properties: {}});

    useEffect(() => {
        let uri = '/exist/restxq/stanford/nlp/logs';

        fetch(uri)
            .then((response) => response.json())
            .then(
                (result) => {
                    setRunning(result.running);
                },
                (error) => {

                }
            )

    }, [])

    // @ts-ignore
    function handleChange(e) {
        if (e.target.name === 'language') {
            setLanguage(e.target.value);
        } else {
            setContent(e.target.value);
        }
    }

    function handleSubmit() {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: language,
                text: content
            })
        };

        fetch("/exist/restxq/Stanford/ner", requestOptions)
            .then(res => res.json())
            .then(
                (result) => {
                    if (result.text) {
                        setNamedEntities(result.text);
                    } else {
                        setNerError(result);
                    }
                },
                (error) => {

                }
            )

    }

    return (
        <div style={{padding: 35}}>
            <Form>
                <Row className={'mb-3'}>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Select language</Form.Label>
                            <Form.Select name="language" onChange={handleChange}>
                                <option value="en" disabled={!running.english.isLoaded}>English</option>
                                <option value="ar" disabled={!running.arabic.isLoaded}>Arabic</option>
                                <option value="zh" disabled={!running.chinese.isLoaded}>Chinese</option>
                                <option value="fr" disabled={!running.french.isLoaded}>French</option>
                                <option value="de" disabled={!running.german.isLoaded}>German</option>
                                <option value="es" disabled={!running.spanish.isLoaded}>Spanish</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group as={Row} className={'mb-3'}>
                    <Form.Label>Text to find named entities</Form.Label>
                    <Form.Control as="textarea" rows={10} onChange={handleChange} />
                </Form.Group>
                <Form.Group as={Row} className={'mb-3'}>
                    <Col sm={2}>
                        <Button type={'submit'} onClick={handleSubmit}>Submit</Button>
                    </Col>
                </Form.Group>
            </Form>
            <Row>
                <div>Results</div>
                <hr/>
                <div id="NER" dangerouslySetInnerHTML={{__html: namedEntities}}></div>
                <div>{
                    nerError.code ?
                        <>
                            <div><b>Code</b> <span>{nerError.code}</span></div>
                            <div><b>Description</b> <span>{nerError.description}</span></div>
                            <div><b>Value</b> <span>{nerError.value}</span></div>
                            <ReactJson src={nerError.properties} />
                        </>
                        : null
                }</div>
                <hr/>
            </Row>
        </div>
    )

}

export default NERContext;
