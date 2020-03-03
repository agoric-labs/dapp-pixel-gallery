import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

import './App.css';

const RECONNECT_BACKOFF_SECONDS = 3;

let maxHeight = 10;
let maxWidth = 10;
const GALLERY_WIDTH_VW = 95;
function pixelSize(scale) {
  // Scale based on viewport width.
  return `${scale / maxWidth * GALLERY_WIDTH_VW}vw`;
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
  const [board, setBoard] = useState([]);
  const didUnmount = useRef(false);

  const options = useMemo(() => ({
    shouldReconnect: _closeEvent => {
      return didUnmount.current === false;
    },
    reconnectAttempts: Infinity,
    reconnectInterval: RECONNECT_BACKOFF_SECONDS * 1000,
  }), []);

  const [sendMessage, lastMessage, readyState] = useWebSocket(wsURL, options);
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      console.log('WebSocket connected!');
      const subscribe = {type: 'PIXEL_GALLERY_STREAM_CANVAS'};
      sendMessage(JSON.stringify(subscribe));
      const obj = {state: JSON.stringify([
        ['red', 'green', 'blue'],
        ['blue', 'red', 'green'],
        ['yellow', 'black'],
        ['black', 'yellow', 'purple'],
      ])};
      setBoard(oldBoard => calculateBoard(JSON.parse(obj.state), oldBoard));
    }
  }, [readyState, sendMessage]);

  useEffect(() => () => didUnmount.current = true, []);

  useEffect(() => {
    if (lastMessage === null) return;

    const obj = JSON.parse(lastMessage);

    if (obj.type === 'PIXEL_GALLERY_UPDATE_CANVAS') {
      // console.log(obj);
      setBoard(oldBoard => calculateBoard(JSON.parse(obj.state), oldBoard));
    } else {
      console.log(`unknown WS type in:`, obj);
    }
  }, [lastMessage]);

  return (
    <div className="container" style={{background: readyState === ReadyState.OPEN ? 'black' : 'red'}}>
      <Gallery board={board} />
    </div>
  );
}

export default App;
