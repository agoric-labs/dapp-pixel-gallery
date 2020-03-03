import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

import dappConstants from './utils/constants'
const { API_URL } = dappConstants;

const socketEndpoint = API_URL.replace(/^http/, 'ws');

ReactDOM.render(<App wsURL={socketEndpoint} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
