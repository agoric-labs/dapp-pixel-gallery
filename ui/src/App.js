import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

import './App.css';

/*
// Let's pretend this <Counter> component is expensive to re-render so ...
// ... we wrap with React.memo, but we're still seeing performance issues :/
// So we add useWhyDidYouUpdate and check our console to see what's going on.
const Counter = React.memo(props => {
  useWhyDidYouUpdate('Counter', props);
  return <div style={props.style}>{props.count}</div>;
});

// Debugging hook
function useWhyDidYouUpdate(name, props) {
  // Get a mutable ref object where we can store props ...
  // ... for comparison next time this hook runs.
  const previousProps = useRef();

  useEffect(() => {
    if (previousProps.current) {
      // Get all keys from previous and current props
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      // Use this object to keep track of changed props
      const changesObj = {};
      // Iterate through keys
      allKeys.forEach(key => {
        // If previous is different from current
        if (previousProps.current[key] !== props[key]) {
          // Add to changesObj
          changesObj[key] = {
            from: previousProps.current[key],
            to: props[key]
          };
        }
      });

      // If changesObj not empty then output to console
      if (Object.keys(changesObj).length) {
        console.log('[why-did-you-update]', name, changesObj);
      }
    }

    // Finally update previousProps with current props for next hook call
    previousProps.current = props;
  });
}
*/

/* global fetch */
const RECONNECT_BACKOFF_SECONDS = 3;

let maxHeight = 10;
let maxWidth = 10;
function pixelSize(scale) {
  // Scale based on viewport width.
  return `${scale / maxWidth * 100}vw`;
}

async function call(req) {
  // console.log(req);
  // TODO
  return {state: JSON.stringify([
    ['red', 'green', 'blue'],
    ['blue', 'red', 'green'],
    ['yellow', 'black'],
    ['black', 'yellow'],
  ])}; // TODO
  const res = await fetch('/vat', {
    method: 'POST',
    body: JSON.stringify(req),
    headers: { 'Content-Type': 'application/json' },
  });
  const j = await res.json();
  if (j.ok) {
    return j.res;
  }
  throw new Error(`server error: ${JSON.stringify(j.rej)}`);
}


const Pixel = React.memo(function Pixel({ color, generation }) {
  // useWhyDidYouUpdate('Pixel', { color, generation });
  return (
    <div
      className={`pixel updated${generation % 2}`}
      style={{ backgroundColor: color, height: pixelSize(1), width: pixelSize(1) }}
    />
  );
});

function Gallery({ board }) {
  let pxs = [];
  // We need to render increasing x followed by increasing y.
  maxHeight = board.reduce((prior, column) => Math.max(prior, column.length), 0);
  maxWidth = board.length;
  for (let y = 0; y < maxHeight; y += 1) {
    for (let x = 0; x < board.length; x += 1) {
      const [color, generation] = y < board[x].length ? board[x][y] : [];
      pxs.push(<Pixel
        key={`${x},${y}`}
        color={color}
        generation={generation}
      />);
    }
  }
  const style = {
    height: pixelSize(maxHeight),
    width: pixelSize(maxWidth),
  };
  return (
    <div id="galleryBoard" className="gallery" style={style}>{pxs}</div>
  );
}

function calculateBoard(colors, oldBoard = []) {
  const newBoard = [];
  for (let x = 0; x < colors.length; x += 1) {
    newBoard.push([]);
    for (let y = 0; y < colors[x].length; y += 1) {
      const [oldColor, oldGen] =
        (oldBoard && oldBoard[x] && oldBoard[x][y]) || [];
      const newColor = colors[x][y];
      const gen = oldGen || 0;
      const newGen = oldColor === newColor ? gen : gen + 1;
      newBoard[x].push([newColor, newGen]);
    }
  }
  return newBoard;
}

// history updates (promises being resolved) and canvas updates
// (pixels being colored) are delivered by websocket
// broadcasts
function App({ wsURL }) {
  const [history, setHistory] = useState([]);
  const [board, setBoard] = useState([]);
  const didUnmount = useRef(false);

  const sendCommand = command => {
    console.log('submitEval', command);
    const number = history.length;
    setHistory([...history, { number, command, result: 'sending for eval' }]);
    call({ type: 'doEval', number, body: command }).catch(ex => console.log(ex));
  };

  const options = useMemo(() => ({
    onOpen: () => call({ type: 'getCanvasState' })
      .then(obj => setBoard(oldBoard => calculateBoard(JSON.parse(obj.state), oldBoard)))
      .catch(e => console.error(e))
      .then(_ => call({ type: 'rebroadcastHistory' })),
    shouldReconnect: closeEvent => {
      return didUnmount.current === false;
    },
    reconnectAttempts: 10,
    reconnectInterval: RECONNECT_BACKOFF_SECONDS * 1000,
  }), []);

  const [sendMessage, lastMessage, readyState] = useWebSocket(wsURL, options);

  useEffect(() => {
    if (lastMessage === null) return;

    const obj = JSON.parse(lastMessage);

    if (obj.type === 'updateCanvas') {
      // console.log(obj);
      setBoard(oldBoard => calculateBoard(JSON.parse(obj.state), oldBoard));
    } else {
      console.log(`unknown WS type in:`, obj);
    }
  }, [lastMessage]);

  useEffect(() => () => didUnmount.current = true);

  return (
    <div>
      <div>{readyState === ReadyState.OPEN ? 'Online' : 'Offline'}</div>
      <Gallery board={board} />
    </div>
  );
}

export default App;
