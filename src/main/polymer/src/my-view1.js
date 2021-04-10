/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import './shared-styles.js';

class MyView1 extends PolymerElement {
  static get template() {
    return html`
      <style include="shared-styles">
        :host {
          display: block;

          padding: 10px;
        }
      </style>

      <div class="card">
        <div class="circle">1</div>
        <h1>Home</h1>
        <p>This application is a wrapper around the <a href="https://stanfordnlp.github.io/CoreNLP/">Stanford CoreNLP</a> pipeline for
         <a href="https://www.exist-db.org">eXist-db</a>. The application is installed without language files OOTB. The
         files need to be loaded after installation.
         </p>
        <p>The pipeline uses default properties that assume that the english jar
        file is loaded in the classpath. Since the english jar is loaded into
        the database it is important to have a defaults <pre>JSON</pre> document that
        points to the english files in the database.
        
        The defaults are loaded into
        <pre>/db/apps/stanford-nlp/data/StanfordCoreNLP-english.json</pre></p> 
      </div>

      <div class="card">
        <div class="circle">2</div>
        <h1>Before Using</h1>
        <p>Please see instructions on the <b>Initializing</b> tab.</p>
      </div>

      <div class="card">
        <div class="circle">4</div>
        <h1>Usage from xquery</h1>
        <p>You can either run a full Natural Language Processging (NLP) annotation pipeline, or use the convenience functions for Name Entity Recognition (NER)</p>
        <h2>Natural Langauge Processing</h2>
        <p>Creating NLP annotations requires you to set the desired properties via a <pre>JSON</pre> file. The default property file for english is located at <pre>/data/StanfordCoreNLP-english.json</pre>.</p>
        <p>Consult the <a href="https://stanfordnlp.github.io/CoreNLP/annotators.html">Stanford Core NLP Documentation</a> to find out about available options.</p>
        <p>The calling xquery function is <pre>nlp:parse()</pre>, consult the <a href='https://github.com/lcahlander/exist-stanford-nlp'>Readme</a> of this application for full code samples and expected outputs.</p>
        <h2>Named Entity Recognition</h2>
        <p>Using the full NLP pipeline, when all you want is to perform Named Entity Recognition, can be cumbersome. We provide convenience functions that will insert the <pre>xml</pre> tags of the just the NER into your existing xml:
        <pre>ner:query-text-as-xml()</pre>. Once more, see the <a href='https://github.com/lcahlander/exist-stanford-nlp'>Readme</a> for working code samples.</p>
        </div>
    `;
  }
}

window.customElements.define('my-view1', MyView1);
