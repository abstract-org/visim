export const BalanceBar = (props) => {
    const nf = new Intl.NumberFormat('en-US')

    return (
        <div
            className={`${
                props.value <= 0 ? 'balance-bar-bg-grey' : ''
            } p-2 mr-1 ml-1 mt-2 balance-bar border-round-sm flex align-items-center justify-content-center flex-grow-1`}
        >
            <span className="balance-bar-value mr-1">
                {props.token.toUpperCase()}:{' '}
                <b>{nf.format(props.value.toFixed(2))}</b>{' '}
            </span>
            {props.usdcValue > 0 ? (
                <h6 style={{ color: 'lightgrey' }}>
                    ({nf.format(props.usdcValue)})
                </h6>
            ) : (
                ''
            )}
        </div>
    )
}
