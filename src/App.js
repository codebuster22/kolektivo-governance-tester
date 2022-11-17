import {
  shortenAddress,
  useCall,
  useEthers,
  useLookupAddress,
} from "@usedapp/core";
import React, { useEffect, useState } from "react";

import { Body, Button, Container, Header, Image, Link } from "./components";
import Form from "react-bootstrap/Form";
import {
  createTreasuryProposal,
  createReserveProposal,
  vetoProposalsOnKolektivoDelay,
  vetoProposalsOnMonetaryDelay,
  getMonetaryDelayQueuePointer,
  getKolektivoDelayQueuePointer,
} from "./createProposal";

function WalletButton() {
  const [rendered, setRendered] = useState("");

  const { ens } = useLookupAddress();
  const { account, activateBrowserWallet, deactivate, error } = useEthers();

  useEffect(() => {
    if (ens) {
      setRendered(ens);
    } else if (account) {
      setRendered(shortenAddress(account));
    } else {
      setRendered("");
    }
  }, [account, ens, setRendered]);

  useEffect(() => {
    if (error) {
      console.error("Error while connecting wallet:", error.message);
    }
  }, [error]);

  return (
    <Button
      onClick={() => {
        if (!account) {
          activateBrowserWallet();
        } else {
          deactivate();
        }
      }}
    >
      {rendered === "" && "Connect Wallet"}
      {rendered !== "" && rendered}
    </Button>
  );
}

function App() {
  const [selectedState, setSelectedState] = useState();
  const [indexToVetoOnReserve, setIndexToVetoOnReserve] = useState(0);
  const [indexToVetoOnTreasury, setIndexToVetoOnTreasury] = useState(0);
  const [monetaryQueuePointer, setMonetaryQueuePointer] = useState(0);
  const [kolektivoQueuePointer, setKolektivoQueuePointer] = useState(0);
  const { library: web3Provider } = useEthers();

  useEffect(() => {
    if (web3Provider?.getSigner) {
      getQueuePointers();
    }
  }, [web3Provider]);

  const getQueuePointers = async () => {
    const mQueuePointer = await getMonetaryQueuePointer(web3Provider);
    const kQueuePointer = await getKolektivoQueuePointer(web3Provider);
    if(!mQueuePointer){
      return;
    }
    if(!kQueuePointer){
      return;
    }
    setMonetaryQueuePointer(mQueuePointer);
    setKolektivoQueuePointer(kQueuePointer);
  };

  function handleSelectedState(event) {
    const value = event.target.value;
    setSelectedState(value);
  }

  async function createProposal() {
    const currentSelectedState = selectedState;
    switch (currentSelectedState) {
      case "1":
        await createTreasuryPublicProposal(web3Provider);
        break;
      case "2":
        await createTreasuryPrivateProposal(web3Provider);
        break;
      case "3":
        await createReservePublicProposal(web3Provider);
        break;
      case "4":
        await createReservePrivateProposal(web3Provider);
        break;
    }
  }

  function handleReserveProposalsIndexChange(event) {
    const value = event.target.value;
    setIndexToVetoOnReserve(value);
  }

  function handleTreasuryProposalIndexChange(event) {
    const value = event.target.value;
    setIndexToVetoOnTreasury(value);
  }

  async function vetoReserveProposals() {
    const vetoIndex = indexToVetoOnReserve + 1;
    // veto
    await vetoProposalOnReserve(web3Provider, vetoIndex);

    setIndexToVetoOnReserve(0);
  }

  async function vetoTreasuryProposals() {
    const vetoIndex = indexToVetoOnTreasury + 1;
    // veto
    await vetoProposalOnTreasury(web3Provider, vetoIndex);

    setIndexToVetoOnTreasury(0);
  }

  return (
    <Container>
      <Header>
        <WalletButton />
      </Header>
      <Body>
        <>
          <Form.Select
            aria-label="Default select example"
            onChange={handleSelectedState}
          >
            <option>Select what proposal to be created</option>
            <option value="1">
              Create "treasury.deregisterERC20" public proposal on
              KolektivoDelay
            </option>
            <option value="2">
              Create "treasury.registerERC20" private proposal on KolektivoDelay
            </option>
            <option value="3">
              Create "reserve.deregisterERC20" public proposal on MonetaryDelay
            </option>
            <option value="4">
              Create "reserve.registerERC20" private proposal on MonetaryDelay
            </option>
          </Form.Select>
          <button onClick={createProposal}>Create</button>
        </>
        <>
          <p>
            Number of proposals added to monetary delay: {monetaryQueuePointer}
          </p>
          <p>
            Number of proposals added to kolektivo delay:{" "}
            {kolektivoQueuePointer}
          </p>
        </>
        <>
          <Form.Label htmlFor="vetoReserveTransaction">
            Transaction index to veto
          </Form.Label>
          <Form.Control
            type="number"
            id="vetoReserveTransaction"
            value={indexToVetoOnReserve}
            onChange={handleReserveProposalsIndexChange}
          />
          <button onClick={vetoReserveProposals}>
            Veto proposal on Monetary Delay
          </button>
        </>
        <>
          <Form.Label htmlFor="vetoTreasuryTransaction">
            Transaction index to veto
          </Form.Label>
          <Form.Control
            type="number"
            id="vetoTreasuryTransaction"
            value={indexToVetoOnTreasury}
            onChange={handleTreasuryProposalIndexChange}
          />
          <button onClick={vetoTreasuryProposals}>
            Veto proposal on Kolektivo Delay
          </button>
        </>
      </Body>
    </Container>
  );
}

async function createTreasuryPublicProposal(web3Provider) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  await createTreasuryProposal(false, signer);
}

async function createTreasuryPrivateProposal(web3Provider) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  await createTreasuryProposal(true, signer);
}

async function createReservePublicProposal(web3Provider) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  await createReserveProposal(false, signer);
}

async function createReservePrivateProposal(web3Provider) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  await createReserveProposal(true, signer);
}

async function vetoProposalOnTreasury(web3Provider, newTrxNonce) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  await vetoProposalsOnKolektivoDelay(signer, newTrxNonce);
}

async function vetoProposalOnReserve(web3Provider, newTrxNonce) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  await vetoProposalsOnMonetaryDelay(signer, newTrxNonce);
}

async function getMonetaryQueuePointer(web3Provider) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  try {
    return await getMonetaryDelayQueuePointer(signer);
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function getKolektivoQueuePointer(web3Provider) {
  const signer = web3Provider.getSigner();
  if (signer === undefined) {
    return;
  }
  try {
    return await getKolektivoDelayQueuePointer(signer);
  } catch (e) {
    console.log(e);
    return false;
  }
}

export default App;
