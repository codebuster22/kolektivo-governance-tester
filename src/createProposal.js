import { contracts } from "./contracts/celo-test.json";
import {
  Badger,
  SecretDelay,
  BACRoles,
  ITreasury,
  IReserve,
} from "./contracts/sharedAbi.json";
import { kolektivoBadgeIds, monetaryBadgeIds } from "./contracts/badgeIds";
import { createPrivateProposal, createPublicProposal } from "./utils";
import { ethers } from "ethers";

const treasuryContractAddress = "0x74b06277Cd1efaA9f6595D25AdB54b4530d15BF5";
const reserveContractAddress = "0xdb2B19C8e3ce01E7f5101652B9dEb500D1298716";

export const createTreasuryProposal = async (isSecret, signer) => {
  let signerAddress;
  try {
    signerAddress = await signer.getAddress();
    console.log(signerAddress);
  } catch (e) {
    console.error(e);
    throw Error("Signer not defined");
  }
  // get signer
  // signer should be treasury delegate

  // log a message stating what type of proposal is being created
  const message = isSecret
    ? "Creating a secret proposal on Kolektivo Delay"
    : "Creating a public proposal on Kolektivo Delay";
  console.log(message);

  // instantiate contracts
  // get kolektivo delay
  const kolektivoDelay = new ethers.Contract(
    contracts.kolektivoDelay.address,
    SecretDelay,
    signer
  );

  // get BAC Kolektivo
  const bacK = new ethers.Contract(contracts.bacK.address, BACRoles, signer);

  // get treasury contract
  const treasuryContract = new ethers.Contract(
    treasuryContractAddress,
    ITreasury,
    signer
  );

  // get kolektivo badger address
  const kolektivoBadger = new ethers.Contract(
    contracts.kolektivoBadger.address,
    Badger,
    signer
  );

  // get badge ID
  const treasuryDelegateBadgeId = kolektivoBadgeIds.TREASURY_DELEGATE;

  // verify treasury delgate role
  const balanceOfTreasuryDelegateBadge = await kolektivoBadger.balanceOf(
    signerAddress,
    treasuryDelegateBadgeId
  );
  if (balanceOfTreasuryDelegateBadge.eq(0)) {
    throw Error("Signer doesn't hold Treasury Delegate Badge");
  }

  // Treasury Delegate Role (Treasury Delegate)
  // create mock parameters for treasury contract
  const erc20Address = "0xe15043634c27384E99a3A4373f1d61bbDFf1da39";
  const treasuryTokenOracle = "0x044bE97050A7225176391d47615CE0667DCBa134";

  if (isSecret) {
    await createPrivateProposal(
      treasuryContract,
      "registerERC20",
      [erc20Address, treasuryTokenOracle, 1, 1],
      kolektivoDelay,
      signer,
      treasuryDelegateBadgeId,
      bacK,
      ethers,
      kolektivoBadger,
      [
        kolektivoBadgeIds.TREASURY_DELEGATE,
        kolektivoBadgeIds.KOLEKTIVO_MULTI_SIG_MEMBER,
        kolektivoBadgeIds.TREASURY_VETO_DELEGATE,
      ]
    );
    return;
  }
  await createPublicProposal(
    treasuryContract,
    "deregisterERC20",
    [erc20Address],
    kolektivoDelay,
    signer,
    treasuryDelegateBadgeId,
    bacK,
    ethers
  );
};

export const createReserveProposal = async (isSecret, signer) => {
  let signerAddress;
  try {
    signerAddress = await signer.getAddress();
    console.log(signerAddress);
  } catch (e) {
    console.error(e);
    throw Error("Signer not defined");
  }
  // get signer
  // signer should be reserve delegate

  // log a message stating what type of proposal is being created
  const message = isSecret
    ? "Creating a secret proposal on Kolektivo Delay"
    : "Creating a public proposal on Kolektivo Delay";
  console.log(message);

  // instantiate contracts
  // get monetary delay
  const monetaryDelay = new ethers.Contract(
    contracts.monetaryDelay.address,
    SecretDelay,
    signer
  );

  // get BAC Monetary Delay
  const bacMD = new ethers.Contract(contracts.bacMD.address, BACRoles, signer);

  // get reserve contract
  const reserveContract = new ethers.Contract(
    reserveContractAddress,
    IReserve,
    signer
  );

  // get monetary badger address
  const monetaryBadger = new ethers.Contract(
    contracts.monetaryBadger.address,
    Badger,
    signer
  );

  // get badge ID
  const reserveDelegateBadgeId = monetaryBadgeIds.RESERVE_DELEGATE;

  // verify reserve delgate role
  const balanceOfReserveDelegateBadge = await monetaryBadger.balanceOf(
    signerAddress,
    reserveDelegateBadgeId
  );
  if (balanceOfReserveDelegateBadge.eq(0)) {
    throw Error("Signer doesn't hold Reserve Delegate Badge");
  }

  // Reserve Delegate Role (Reserve Delegate)
  // create mock parameters for reserve contract
  const erc20Address = "0xe15043634c27384E99a3A4373f1d61bbDFf1da39";
  const reserveTokenOracle = "0x86baecC60c5c1CCe2c73f2Ff42588E6EBce18707";

  if (isSecret) {
    await createPrivateProposal(
      reserveContract,
      "registerERC20",
      [erc20Address, reserveTokenOracle, 1, 1],
      monetaryDelay,
      signer,
      reserveDelegateBadgeId,
      bacMD,
      ethers,
      monetaryBadger,
      [
        monetaryBadgeIds.RESERVE_DELEGATE,
        monetaryBadgeIds.LOCAL_MULTI_SIG_MEMBER,
        monetaryBadgeIds.RESERVE_VETO_DELEGATE,
      ]
    );
    return;
  }
  await createPublicProposal(
    reserveContract,
    "deregisterERC20",
    [erc20Address],
    monetaryDelay,
    signer,
    reserveDelegateBadgeId,
    bacMD,
    ethers
  );
};

export const vetoProposalsOnKolektivoDelay = async (signer, newTrxNonce) => {
  let signerAddress;
  try {
    signerAddress = await signer.getAddress();
    console.log(signerAddress);
  } catch (e) {
    console.error(e);
    throw Error("Signer not defined");
  }

  // instantiate contracts
  // get kolektivo delay
  const kolektivoDelay = new ethers.Contract(
    contracts.kolektivoDelay.address,
    SecretDelay,
    signer
  );

  // get BAC Kolektivo
  const bacK = new ethers.Contract(contracts.bacK.address, BACRoles, signer);

  // get kolektivo badger address
  const kolektivoBadger = new ethers.Contract(
    contracts.kolektivoBadger.address,
    Badger,
    signer
  );

  // get badge ID
  const treasuryVetoDelegateBadgeId = kolektivoBadgeIds.TREASURY_VETO_DELEGATE;

  // verify treasury delgate role
  const balanceOfTreasuryDelegateBadge = await kolektivoBadger.balanceOf(
    signerAddress,
    treasuryVetoDelegateBadgeId
  );
  if (balanceOfTreasuryDelegateBadge.eq(0)) {
    throw Error("Signer doesn't hold Treasury Delegate Badge");
  }

  const populatedSecretDelayTransaction = await kolektivoDelay.populateTransaction.vetoTransactionsTill(
    newTrxNonce
  );
  populatedSecretDelayTransaction.value = ethers.BigNumber.from(0);

  const tx = await bacK.execTransactionFromModule(
    populatedSecretDelayTransaction.to,
    populatedSecretDelayTransaction.value,
    populatedSecretDelayTransaction.data,
    0,
    treasuryVetoDelegateBadgeId
  );

  const receipt = await tx.wait();

  if (receipt) {
    alert("Vetoed");
  } else {
    alert("Error");
    throw Error("Transaction failed");
  }
};

export const vetoProposalsOnMonetaryDelay = async (signer, newTrxNonce) => {
  let signerAddress;
  try {
    signerAddress = await signer.getAddress();
    console.log(signerAddress);
  } catch (e) {
    console.error(e);
    throw Error("Signer not defined");
  }

  // instantiate contracts
  // get kolektivo delay
  const monetaryDelay = new ethers.Contract(
    contracts.monetaryDelay.address,
    SecretDelay,
    signer
  );

  // get BAC Kolektivo
  const bacMD = new ethers.Contract(contracts.bacMD.address, BACRoles, signer);

  // get kolektivo badger address
  const monetaryBadger = new ethers.Contract(
    contracts.monetaryBadger.address,
    Badger,
    signer
  );

  // get badge ID
  const reserveVetoDelegateBadgeId = monetaryBadgeIds.RESERVE_VETO_DELEGATE;

  // verify treasury delgate role
  const balanceOfReserveDelegateBadge = await monetaryBadger.balanceOf(
    signerAddress,
    reserveVetoDelegateBadgeId
  );
  if (balanceOfReserveDelegateBadge.eq(0)) {
    throw Error("Signer doesn't hold Reserve Delegate Badge");
  }

  const populatedSecretDelayTransaction = await monetaryDelay.populateTransaction.vetoTransactionsTill(
    newTrxNonce
  );
  populatedSecretDelayTransaction.value = ethers.BigNumber.from(0);

  const tx = await bacMD.execTransactionFromModule(
    populatedSecretDelayTransaction.to,
    populatedSecretDelayTransaction.value,
    populatedSecretDelayTransaction.data,
    0,
    reserveVetoDelegateBadgeId
  );

  const receipt = await tx.wait();

  if (receipt) {
    alert("Vetoed");
  } else {
    alert("Error");
    throw Error("Transaction failed");
  }
};

export const getMonetaryDelayQueuePointer = async (signer) => {
  let signerAddress;
  try {
    signerAddress = await signer.getAddress();
  } catch (e) {
    console.error(e);
  }
  const monetaryDelayInstance = new ethers.Contract(
    contracts.monetaryDelay.address,
    SecretDelay,
    signer
  );
  const queuePointer = await monetaryDelayInstance.queuePointer({
    from: signerAddress,
  });
  return parseInt(queuePointer.toString());
};

export const getKolektivoDelayQueuePointer = async (signer) => {
  let signerAddress;
  try {
    signerAddress = await signer.getAddress();
  } catch (e) {
    console.error(e);
  }
  const kolektivoDelay = new ethers.Contract(
    contracts.kolektivoDelay.address,
    SecretDelay,
    signer
  );
  const queuePointer = await kolektivoDelay.queuePointer({
    from: signerAddress,
  });
  return parseInt(queuePointer.toString());
};
