### Liquidity Math

Example:

add position of 1000 beers at price range [$9...$25]

liquidity=amount/(1/sqrtlow-1/sqrthigh)
=1000/(0.33-0.2)
=7500

If now at $9: 
amountX=liquidity*(sqrtNOW-sqrtLO)=7500*(3-3)=0 $

amtY=liq*(1/sqrtNOW-1/sqrtHIGH)
=7500*(.33-.2)=1000 beers


if now at $25:
amtX=liq*(sNOW-sLO) =7500*(5-3)=15000 $

amtY=liq*(1/sNOW-sHI) =7500*(.2-.2)=0 beers

if now at $16:
amtX=liq*(sNOW-sLO)
=7500*(4-3)=7500 $

amtY=liq*(1/sNOW-1/sHI)
=7500*(.25-.2)
=7500*.05=375 beers