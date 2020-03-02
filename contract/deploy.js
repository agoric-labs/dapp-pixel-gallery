// Agoric Dapp contract deployment script
import fs from 'fs';

const DAPP_NAME = "pixel-gallery";
const DEFAULT_CANVAS_SIZE = [10, 10];

export default async function deployContract(homeP, { bundleSource, pathResolve },
  CONTRACT_NAME = DAPP_NAME, initCanvasSize = DEFAULT_CANVAS_SIZE) {

  // Create a source bundle for the "pixel-demo" smart contract.
  const { source, moduleFormat } = await bundleSource(pathResolve(`./${CONTRACT_NAME}.js`), 'nestedEvaluate');

  const [
    installationHandle,
    contractHost,
  ] = await Promise.all([
    await homeP~.zoe~.install(source, moduleFormat),
    homeP~.contractHost,
  ]);

  // 2. Contract instance.
  const invite
    = await homeP~.zoe~.makeInstance(installationHandle, {
      assays: [],
      canvasSize: initCanvasSize,
      contractHost,
    });
  
  // 3. Get the instanceHandle and admin seat
  
  const [
    {
      extent: { instanceHandle },
    },
    adminSeat,
  ] = await Promise.all([
    invite~.getBalance(),
    homeP~.zoe~.redeem(invite, [], []),
  ]);

  // 4. Get the contract terms and assays

  const { terms: { assays: [pixelAssay, dustAssay], canvasSize }} = await homeP~.zoe~.getInstance(instanceHandle);

  const [contractId, instanceId, pixelId, dustId, dustMint] = await Promise.all([
    homeP~.registrar~.register(DAPP_NAME, installationHandle),
    homeP~.registrar~.register(CONTRACT_NAME, instanceHandle),
    homeP~.registrar~.register('pixel', pixelAssay),
    homeP~.registrar~.register('dust', dustAssay),
    adminSeat~.dustMint(),
  ]);

  console.log('- installation made', CONTRACT_NAME, '=>',  contractId);
  console.log('- instance made', CONTRACT_NAME, '=>', instanceId);
  console.log('- instance pixel assay', pixelId),
  console.log('- instance dust assay', dustId);
  console.log('- admin dust mint', dustMint);
  console.log('- canvas size', canvasSize);

  // Save the instanceId somewhere where the UI can find it.
  const cjfile = pathResolve(`../ui/src/utils/contractID.js`);
  console.log('writing', cjfile);
  const ids = {
    pixelId,
    dustId,
    instanceId,
  };
  await fs.promises.writeFile(cjfile, `export default ${JSON.stringify(ids)};`);
}
