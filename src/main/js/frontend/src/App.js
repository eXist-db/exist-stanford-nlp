import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand href="#home">Stanford Core NLP</Navbar.Brand>
        <Nav className="mr-auto">
          <Nav.Link href="#home">Home</Nav.Link>
          <Nav.Link href="#api">API</Nav.Link>
          <Nav.Link href="#initializing">Initializing</Nav.Link>
        </Nav>
      </Navbar>
  );
}

export default App;
