/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { makeGallery } from './src/gallery';


export const makeContract = harden((zoe, terms) => {
  const { contractHost, canvasSize = [10, 10] } = terms;

  let resolveNextState;
  let nextStateChangeP = new Promise(res => resolveNextState = res);
  const updateState = () => {
    resolveNextState();
    nextStateChangeP = new Promise(res => resolveNextState = res);
  };

  const [canvasX, canvasY] = canvasSize;
  assert(canvasX === canvasY, details`Non-square canvas ${canvasX}x${canvasY} is unimplemented`);
  const log = (...args) => console.log(...args);
  const { userFacet, adminFacet } = makeGallery(E, log, contractHost, updateState, canvasSize);

  const { pixelAssay, dustAssay } = userFacet.getAssays();

  const makeAdminInvite = () => {
    const seat = harden({
      ...adminFacet,
      dustMint: () => adminFacet.dustMint,
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return { invite, inviteHandle };
  };
  return harden({
    invite: makeAdminInvite(),
    publicAPI: {
      ...userFacet,
      getStateAndChangePromise() {
        return [userFacet.getState(), nextStateChangeP];
      },
    },
    terms: {
      assays: [pixelAssay, dustAssay],
      canvasSize: [canvasX, canvasY],
    },
  });
});
