define(["./my-app.js"],function(_myApp){"use strict";class MyView1 extends _myApp.PolymerElement{static get template(){return _myApp.html`
      <style include="shared-styles">
        :host {
          display: block;

          padding: 10px;
        }
      </style>

      <div class="card">
        <div class="circle">1</div>
        <h1>Home</h1>
        <p>Ut labores minimum atomorum pro. Laudem tibique ut has.</p>
        <p>Lorem ipsum dolor sit amet, per in nusquam nominavi periculis, sit elit oportere ea.Lorem ipsum dolor sit amet, per in nusquam nominavi periculis, sit elit oportere ea.Cu mei vide viris gloriatur, at populo eripuit sit.</p>
      </div>

      <div class="card">
        <div class="circle">2</div>
        <h1>Before Using</h1>
        <p>Please see instructions on the <b>Initializing</b> tab.</p>
      </div>
    `}}window.customElements.define("my-view1",MyView1)});