define(["./my-app.js"],function(_myApp){"use strict";class MyView3 extends _myApp.PolymerElement{static get template(){return _myApp.html`
      <style include="shared-styles">
        :host {
          display: block;

          padding: 10px;
        }
      </style>

      <div class="card">
        <div class="circle">3</div>
        <h1>Initializing</h1>
        <p>In order for the intallation module to be kept to a smaller size, the language files are loaded afterwards into the database.</p>
        <p>In eXide, open and run <b>/db/apps/stanford-nlp/modules/load-languages.xq</b> as admin.</p>
      </div>
    `}}window.customElements.define("my-view3",MyView3)});