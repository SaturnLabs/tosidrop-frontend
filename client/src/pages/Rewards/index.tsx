import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState, KeyboardEvent } from "react";
import { GetRewards, GetCustomRewards } from "../../entities/vm.entities";
import { getCustomRewards, getRewards } from "../../services/http.services";
import { ModalTypes } from "../../entities/common.entities";
import WalletApi from "../../services/connectors/wallet.connector";
import "./index.scss";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "src/store";
import { showModal } from "src/reducers/modalSlice";
import { getStakeKey } from "./utils/common.function";
import Spinner from "src/components/Spinner";
import ClaimableTokenBox from "./components/ClaimableTokenBox";
import DepositInfo from "./components/DepositInfo";

interface Params {
    connectedWallet: WalletApi | undefined;
    wrongNetwork: boolean | undefined;
}

function Rewards({ connectedWallet, wrongNetwork }: Params) {
    const dispatch = useDispatch();
    const networkId = useSelector((state: RootState) => state.wallet.networkId);
    const [hideCheck, setHideCheck] = useState(false);
    const [hideStakingInfo, setHideStakingInfo] = useState(true);
    const [hideSendAdaInfo, setHideSendAdaInfo] = useState(true);
    const [rewards, setRewards] = useState<GetRewards>();
    const [searchAddress, setSearchAddress] = useState<string>("");
    const [rewardsLoader, setRewardsLoader] = useState(false);
    const [checkedState, setCheckedState] = useState(new Array<boolean>());
    const [checkedCount, setCheckedCount] = useState(0);
    const [showTooltip, setShowTooltip] = useState(false);
    const [allIsSelected, setAllIsSelected] = useState<boolean>(false);
    const [stakeAddress, setStakeAddress] = useState<string>("");
    const [txDetail, setTxDetail] = useState<GetCustomRewards | undefined>();
    const [claimMyRewardLoading, setClaimMyRewardLoading] =
        useState<boolean>(false);

    /**
     * check if every token is selected
     */
    useEffect(() => {
        setAllIsSelected(checkedState.every((i) => i));
    }, [checkedState]);

    useEffect(() => {
        if (rewards?.claimable_tokens.length) {
            setCheckedState(
                new Array(rewards.claimable_tokens.length).fill(false)
            );
            setHideStakingInfo(false);
        } else {
            setCheckedState([]);
            setHideStakingInfo(true);
        }
    }, [rewards?.claimable_tokens]);

    useEffect(() => {
        async function init() {
            if (connectedWallet?.wallet?.api && !wrongNetwork) {
                setSearchAddress(await connectedWallet.getAddress());
                setHideCheck(false);
                setHideStakingInfo(true);
                setHideSendAdaInfo(true);
            }
        }

        init();
    }, [connectedWallet?.wallet?.api, connectedWallet, wrongNetwork]);

    /**
     * select/unselect all tokens
     */
    const selectAll = () => {
        let updatedCheckedState;
        if (allIsSelected) {
            updatedCheckedState = checkedState.map(() => false);
        } else {
            updatedCheckedState = checkedState.map(() => true);
        }

        setCheckedState(updatedCheckedState);
        const updatedCheckedCount = updatedCheckedState.filter(
            (check) => check
        ).length;
        setCheckedCount(updatedCheckedCount);
    };

    /**
     * handle token select
     */
    const handleTokenSelect = (position: number) => {
        const updatedCheckedState = checkedState.map((item, index) =>
            index === position ? !item : item
        );

        setCheckedState(updatedCheckedState);
        const updatedCheckedCount = updatedCheckedState.filter(
            (check) => check
        ).length;
        setCheckedCount(updatedCheckedCount);
    };

    const checkRewards = async () => {
        if (searchAddress) {
            setRewardsLoader(true);
            try {
                /**
                 * check if the inserted address is cardano address
                 * we want the stake address
                 * if it is cardano address, get the staking address
                 */
                let address = await getStakeKey(searchAddress, networkId);
                if (address == null) throw new Error();

                setStakeAddress(address);
                const rewards = await getRewards(address);

                if (
                    rewards &&
                    Object.keys(rewards.consolidated_promises).length
                ) {
                    setRewards(rewards);
                    setRewardsLoader(false);
                } else {
                    dispatch(
                        showModal({
                            text: "No rewards found for the account, yet.",
                            type: ModalTypes.info,
                        })
                    );
                    setRewardsLoader(false);
                }
            } catch (ex: any) {
                switch (true) {
                    case ex?.response?.status === 404:
                    default:
                        dispatch(
                            showModal({
                                text: "Account not found.",
                                type: ModalTypes.info,
                            })
                        );
                        setRewardsLoader(false);
                }
            }
        }
    };

    const claimMyRewards = async () => {
        if (checkedCount === 0) return;
        if (rewards == null) return;

        /**
         * get tx info for custom withdrawal
         */
        if (rewards == null) return;

        setClaimMyRewardLoading(true);

        const selectedTokenId = [];
        const availableRewards = rewards.claimable_tokens;
        for (let i = 0; i < checkedState.length; i++) {
            if (checkedState[i]) {
                selectedTokenId.push(availableRewards[i].assetId);
            }
        }
        try {
            const res = await getCustomRewards(
                stakeAddress,
                stakeAddress.slice(0, 40),
                selectedTokenId.join(",")
            );
            if (res == null) throw new Error();

            setTxDetail(res as GetCustomRewards);
            setHideCheck(true);
            setHideStakingInfo(true);
            setHideSendAdaInfo(false);
            setClaimMyRewardLoading(false);
        } catch (e) {
            dispatch(
                showModal({
                    text: "Something went wrong. Please try again later.",
                    type: ModalTypes.failure,
                })
            );
            setClaimMyRewardLoading(false);
            return;
        }
    };

    const cancelClaim = async () => {
        setRewards(undefined);
        setSearchAddress("");
    };

    const renderStakeInfo = () => {
        if (rewards?.pool_info) {
            return (
                <>
                    {rewards?.pool_info?.delegated_pool_logo ? (
                        <img
                            className="pool-logo"
                            src={rewards?.pool_info?.delegated_pool_logo}
                            alt=""
                        />
                    ) : (
                        ""
                    )}
                    <div className="pool-info">
                        <div className="staking-info">
                            Currently staking&nbsp;
                            <b>{rewards?.pool_info?.total_balance} ADA</b>
                            &nbsp;with&nbsp;
                            <b className="no-break">
                                [{rewards?.pool_info?.delegated_pool_name}
                                ]&nbsp;
                                {rewards?.pool_info?.delegated_pool_description}
                            </b>
                            <b className="no-break-mobile">
                                [{rewards?.pool_info?.delegated_pool_name}]
                            </b>
                        </div>
                    </div>
                </>
            );
        } else {
            return <>Unregistered</>;
        }
    };

    const triggerTooltip = () => {
        setShowTooltip(true);
        setTimeout(() => {
            setShowTooltip(false);
        }, 1000);
    };

    function renderCheckRewardsStep() {
        if (!hideCheck) {
            return (
                <div className="content-reward check">
                    <p>
                        Enter your wallet/stake address or $handle to view your
                        rewards
                    </p>
                    <input
                        className="transparent-input"
                        type="text"
                        value={searchAddress}
                        onInput={(e: KeyboardEvent<HTMLInputElement>) =>
                            setSearchAddress(
                                (e.target as HTMLInputElement).value
                            )
                        }
                        disabled={
                            !hideStakingInfo ||
                            (typeof connectedWallet?.wallet?.api !==
                                "undefined" &&
                                !wrongNetwork)
                        }
                    ></input>
                    <div className="content-button">
                        <button
                            className="tosi-button"
                            disabled={!hideStakingInfo}
                            onClick={checkRewards}
                        >
                            Check my rewards
                            {rewardsLoader ? <Spinner></Spinner> : null}
                        </button>
                        <button
                            className={
                                "tosi-cancel-button" +
                                (hideStakingInfo ? " hidden" : "")
                            }
                            onClick={cancelClaim}
                        >
                            <div className="tosi-cancel-icon">
                                <FontAwesomeIcon icon={faXmark} />
                            </div>
                            <div className="tosi-cancel-text">Cancel</div>
                        </button>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }

    function renderStakingInfoStep() {
        if (!hideStakingInfo) {
            return (
                <div className="staking-info">
                    <div className={"content-reward staked"}>
                        {renderStakeInfo()}
                    </div>
                    <div className={"claim-list"}>
                        {rewards?.claimable_tokens?.map((token, index) => {
                            return (
                                <ClaimableTokenBox
                                    key={index}
                                    index={index}
                                    ticker={token.ticker}
                                    checked={checkedState[index]}
                                    handleOnChange={handleTokenSelect}
                                    amount={token.amount}
                                    decimals={token.decimals}
                                    logo={token.logo}
                                    assetId={token.assetId}
                                />
                            );
                        })}
                    </div>

                    <div className={"content-reward claim"}>
                        <div className="text">
                            Selected {checkedCount} token
                        </div>
                        <button className="tosi-button" onClick={selectAll}>
                            {allIsSelected ? "Unselect All" : "Select All"}
                        </button>
                        <button
                            className="tosi-button"
                            disabled={checkedCount === 0}
                            onClick={claimMyRewards}
                        >
                            Claim my rewards
                            {claimMyRewardLoading ? <Spinner></Spinner> : null}
                        </button>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }

    return (
        <div className="rewards">
            <h1>Claim your rewards</h1>
            {!hideSendAdaInfo ? (
                <DepositInfo
                    txDetail={txDetail}
                    checkedCount={checkedCount}
                    connectedWallet={connectedWallet}
                    wrongNetwork={wrongNetwork}
                    stakeAddress={stakeAddress}
                ></DepositInfo>
            ) : null}
            {renderCheckRewardsStep()}
            {renderStakingInfoStep()}
        </div>
    );
}

export default Rewards;
