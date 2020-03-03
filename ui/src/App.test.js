import React from 'react';
import ReactDOM from 'react-dom';
import WS from 'jest-websocket-mock';

import App from './App';

it('renders without crashing', () => {
  const wsURL = 'ws://pixel-gallery.testnet.example.com:8000';
  const server = new WS(wsURL);
  server.connected.then(_ => server.close());
  const div = document.createElement('div');
  ReactDOM.render(<App wsURL={wsURL} />, div);
  ReactDOM.unmountComponentAtNode(div);
});
