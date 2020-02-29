import harden from '@agoric/harden';

export default harden((_terms, _inviteMaker) => {
  return harden({
    getCommandHandler() {
      return harden({
        processInbound(obj, _home) {
          switch (obj.type) {
            case 'pixel-demo/Message': {
              return harden({ type: 'pixel-demo/Response', orig: obj });
            }
            default:
              return undefined;
          }
        },
      });
    },
  });
});
