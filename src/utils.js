import LitJsSdk from "@lit-protocol/sdk-browser";
import axios from "axios";

// value of `operation` is always fixed
// for info:
//      opertaion = 0, means CALL
//      operation = 1, measn delegate call
// in our current scope, we will always have operation = 0
// for both, public and private proposal, operation = 0
const operation = 0;

export const createPublicProposal = async (
  targetContract,
  methodName,
  params,
  delay,
  delegate,
  delegateBadgeId,
  bac,
  ethers
) => {
  console.log("Data collected and populating transaction now");

  // step 1. generate populated transaction object of target contract
  // populate transaction for target contract to get data
  // invoke the target contract, how you normally do, with just one additional thing
  // normal - targetContract.targetFunction(...args[, overrides]);
  // here, add one thing - targetContract.populateTransaction.targetFunction(...args[, overrides]);
  const populatedTransactionOfTargetContract = await targetContract.populateTransaction[
    methodName
  ](...params);

  console.log(
    "Generated populated trasnaction of target contract, generating populated transaction of Secret Delay for proposal"
  );

  // performing check to resolve the typescript error of populatedTransactionOfTargetContract being undefined
  if (
    populatedTransactionOfTargetContract === undefined ||
    populatedTransactionOfTargetContract.data === undefined ||
    populatedTransactionOfTargetContract.to === undefined
  ) {
    throw Error("Populated Transaction of target contract is undefined");
  }
  if (populatedTransactionOfTargetContract.value === undefined) {
    populatedTransactionOfTargetContract.value = ethers.BigNumber.from(0);
  }

  // step 2. generate populated transaction object of secret delay
  /// create params to be passed on to BAC to add proposal
  // same thing as done above for target contract, but this time, it's secret delay instead of target contract
  // execTransactionFromModule - used to create public proposal
  const populatedTransactionOfDelay = await delay.populateTransaction.execTransactionFromModule(
    populatedTransactionOfTargetContract.to,
    populatedTransactionOfTargetContract.value,
    populatedTransactionOfTargetContract.data,
    operation
  );
  // performing check to resolve the typescript error of populatedTransactionOfDelay being undefined
  if (
    populatedTransactionOfDelay === undefined ||
    populatedTransactionOfDelay.data === undefined ||
    populatedTransactionOfDelay.to === undefined
  ) {
    throw Error("Populated Transaction of Secret Delay is undefined");
  }
  if (populatedTransactionOfDelay.value === undefined) {
    populatedTransactionOfDelay.value = ethers.BigNumber.from(0);
  }

  console.log("Generated delay data, creating proposal at Secret Delay");

  // step 3. this is the final step in creating public proposal
  //    invoke `execTransactionFromModule` with defined parameters
  //    it will tell BAC to add proposal to queue at Secret Delay
  //    a check is performed at BAC, that only specified delegate is allowed to add proposals
  const tx = await bac
    .connect(delegate)
    .execTransactionFromModule(
      populatedTransactionOfDelay.to,
      populatedTransactionOfDelay.value,
      populatedTransactionOfDelay.data,
      operation,
      delegateBadgeId
    );
  const receipt = await tx.wait();

  const queueIndex = receipt.events?.filter(
    (event) => event.event === "TransactionAdded"
  )[0].args?.queueIndex;

  // step 4. go out and enjoy life
  if (receipt) {
    console.log("Congratulations!! Public proposal created");
    return {
      populatedTransactionOfTargetContract,
      queueIndex,
    };
  } else {
    throw Error("Transaction failed");
  }
};

export const createPrivateProposal = async (
  targetContract,
  methodName,
  params,
  delay,
  delegate,
  delegateBadgeId,
  bac,
  ethers,
  badger,
  badgeIds
) => {
  const client = new LitJsSdk.LitNodeClient();
  await client.connect();
  window.litNodeClient = client;
  // step 1. generate populated transaction object of target contract
  // populate transaction for target contract to get data
  // invoke the target contract, how you normally do, with just one additional thing
  // normal - targetContract.targetFunction(...args[, overrides]);
  // here, add one thing - targetContract.populateTransaction.targetFunction(...args[, overrides]);
  console.log("Data collected and populating transaction now");
  const populatedTransactionOfTargetContract = await targetContract.populateTransaction[
    methodName
  ](...params);

  // performing check to resolve the typescript error of populatedTransactionOfTargetContract being undefined
  if (
    populatedTransactionOfTargetContract === undefined ||
    populatedTransactionOfTargetContract.data === undefined ||
    populatedTransactionOfTargetContract.to === undefined
  ) {
    throw Error("Populated Transaction of target contract is undefined");
  }
  if (populatedTransactionOfTargetContract.value === undefined) {
    populatedTransactionOfTargetContract.value = ethers.BigNumber.from(0);
  }

  console.log("Constructing Private proposal parameters");
  // step 2. get salt
  // it's a number, which get's incremented everytime, a new secret/private proposal is enqueued
  const salt = await delay.salt();

  // step 3. generate secret/private trx hash
  // it is not a transaction, but a normal call to secret delay
  // as we are making a call to smart contract, it will take some time
  const privateTrxHash = await delay.getSecretTransactionHash(
    populatedTransactionOfTargetContract.to,
    populatedTransactionOfTargetContract.value,
    populatedTransactionOfTargetContract.data,
    operation,
    salt
  );

  // we can use ethers to generate the same output
  // hence to improve performace, ethers should be used.
  // eslint-disable-next-line
  const privateTrxHashUsingEthers = ethers.utils.solidityKeccak256(
    ["address", "uint256", "bytes", "uint8", "uint256"],
    [
      populatedTransactionOfTargetContract.to,
      populatedTransactionOfTargetContract.value,
      populatedTransactionOfTargetContract.data,
      operation,
      salt,
    ]
  );

  // note: privateTrxHashUsingEthers === privateTrxHash
  //       above mentioned are two different ways of generating the private/secret trasnaction hash,
  //       both ways will generate same output,
  //       second way, that is using `ethers` is faster

  // step 4. store details that are needed to recreate the same privateTrxHash on IPFS
  // note: below are the necessary details that needs to be stored, to recreate the private proposal hash
  //       if you want to store more details or you want to store it in a different way, you can.
  //       but ensure, you are able to recreate the private transaction hash,
  //       as you will need to pass this individual parameters to execute private proposal
  const privateProposal = {
    to: populatedTransactionOfTargetContract.to,
    value: populatedTransactionOfTargetContract.value,
    data: populatedTransactionOfTargetContract.data,
    operation: operation,
    salt: salt,
  };
  let concatenatedUserAddress = "";
  let concatendatedBadgeIds = "";
  for (let i = 0; i < badgeIds.length; i++) {
    if (i === badgeIds.length - 1) {
      concatenatedUserAddress = `${concatenatedUserAddress}:userAddress`;
      concatendatedBadgeIds = `${concatendatedBadgeIds}${badgeIds[i]}`;
    } else {
      concatenatedUserAddress = `${concatenatedUserAddress}:userAddress,`;
      concatendatedBadgeIds = `${concatendatedBadgeIds}${badgeIds[i]},`;
    }
  }

  // encrypt proposal with LIT
  const accessControlConditions = [
    {
      contractAddress: badger.address,
      standardContractType: "ERC1155",
      chain: "celo",
      method: "balanceOfBatch",
      parameters: [concatenatedUserAddress, concatendatedBadgeIds],
      returnValueTest: {
        comparator: ">",
        value: "0",
      },
    },
  ];

  const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: "celo" });

  const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(
    JSON.stringify(privateProposal)
  );

  const chain = "celo";
  const encryptedSymmetricKey = await client.saveEncryptionKey({
    accessControlConditions,
    symmetricKey,
    authSig,
    chain,
  });

  const encryptedSymmetricKeyBase16 = LitJsSdk.uint8arrayToString(
    encryptedSymmetricKey,
    "base16"
  );

  const jsonFileName = `Private Proposal ${salt}`;

  const encryptedTransactionProposalCid = await pinFile(
    encryptedString,
    jsonFileName
  );

  const proposalToPin = {
    encryptedDataPin: encryptedTransactionProposalCid,
    name: jsonFileName,
  };

  // currently I'm giving the json file a name to identify on pinata, giving name is purely optional
  const ipfsURI = await pinJson(proposalToPin, jsonFileName);

  // step 5. generate populated transaction object of secret delay
  // create params to be passed on to BAC to add proposal
  // same thing as done above for target contract, but this time, it's secret delay instead of target contract
  // enqueueSecretTx - used to create private proposal
  const populatedTransactionOfDelay = await delay.populateTransaction.enqueueSecretTx(
    privateTrxHash,
    ipfsURI
  );
  // performing check to resolve the typescript error of populatedTransactionOfDelay being undefined
  if (
    populatedTransactionOfDelay === undefined ||
    populatedTransactionOfDelay.data === undefined ||
    populatedTransactionOfDelay.to === undefined
  ) {
    throw Error("Populated Transaction of Secret Delay is undefined");
  }
  if (populatedTransactionOfDelay.value === undefined) {
    populatedTransactionOfDelay.value = ethers.BigNumber.from(0);
  }

  // step 6. this is the final step in creating private proposal
  //    invoke `execTransactionFromModule` with defined parameters
  //    it will tell BAC to add proposal to queue at Secret Delay
  //    a check is performed at BAC, that only specified delegate is allowed to add proposals
  const tx = await bac
    .connect(delegate)
    .execTransactionFromModule(
      populatedTransactionOfDelay.to,
      populatedTransactionOfDelay.value,
      populatedTransactionOfDelay.data,
      operation,
      delegateBadgeId
    );
  const receipt = await tx.wait();

  const queueIndex = receipt.events?.filter(
    (event) => event.event === "SecretTransactionAdded"
  )[0].args?.queueIndex;

  // step 7. go out and enjoy life
  if (receipt) {
    console.log("Private Proposal created");
    return {
      populatedTransactionOfTargetContract,
      salt,
      queueIndex,
    };
  } else {
    throw Error("Transaction failed");
  }
};

const pinFile = async (file, name) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  let data = new FormData();
  data.append("file", file, {
    filename: "proposal.bin",
    contentType: "application/octet-stream",
  });
  console.log(data.get("file"));
  const metadata = JSON.stringify({
    name: name,
  });
  data.append("pinataMetadata", metadata);
  const res = await axios.post(url, data, {
    maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
    headers: {
      "Content-Type": "multipart/form-data",
      pinata_api_key: process.env.REACT_APP_PINATA_API_Key,
      pinata_secret_api_key: process.env.REACT_APP_PINATA_API_Secret,
    },
  });
  console.log("Encrypted File pinned at:-", res.data.IpfsHash);
  return res.data.IpfsHash;
};

export const pinJson = async (jsonData, name) => {
  const data = JSON.stringify({
    pinataOptions: {
      cidVersion: 1,
    },
    pinataMetadata: {
      name: name,
      keyvalues: {
        customKey: "customValue",
        customKey2: "customValue2",
      },
    },
    pinataContent: jsonData,
  });
  const config = {
    method: "post",
    url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.REACT_APP_JWT}`,
    },
    data: data,
  };
  const res = await axios(config);
  console.log("JSON pinned at:-", res.data.IpfsHash);
  return res.data.IpfsHash;
};
