export const BalanceBar = (props) => {
    const nf = new Intl.NumberFormat('en-US')

    return (
        <div
            className={`${
                props.value <= 0 ? 'balance-bar-bg-grey' : ''
            } p-2 mr-1 ml-1 mt-2 balance-bar border-round-sm flex align-items-center justify-content-center flex-grow-1`}
        >
            <span className="balance-bar-value">
                {props.token.toUpperCase()}: <b>{nf.format(props.value)}</b>
            </span>
        </div>
    )
}
