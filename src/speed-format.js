// The simulation and saved records keep their existing mph units. Convert only
// at display boundaries so changing the dashboard cannot change the handling.
export const KPH_PER_MPH=1.609344;
export function speedKph(mph){const value=Number(mph);return Number.isFinite(value)?Math.round(Math.abs(value)*KPH_PER_MPH):0;}
export const formatSpeed=mph=>`${speedKph(mph)} km/h`;
