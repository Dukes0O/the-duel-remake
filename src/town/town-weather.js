import {registerTownSystem} from './town-sim.js';

const DAYS_PER_YEAR=360;
const asBigInt=value=>typeof value==='bigint'?value:BigInt(value);
const dayNumber=calendar=>(asBigInt(calendar.year)-1n)*BigInt(DAYS_PER_YEAR)+BigInt((calendar.month-1)*30+calendar.day);
const temperatureBase=Object.freeze({Spring:18,Summer:34,Autumn:16,Winter:-3});

function nextDrought(town,calendar,rng) {
  const year=asBigInt(calendar.year);
  const nextYear=town.weatherSchedule?.drought?.nextYear;
  if(nextYear!==undefined) return asBigInt(nextYear);
  const firstYear=year+BigInt(rng.int(4,7));
  town.weatherSchedule.drought={nextYear:firstYear,month:rng.int(4,6),months:rng.int(1,3)};
  return firstYear;
}

export function stepTownWeather({town,rng,calendar}) {
  const day=dayNumber(calendar);
  if(town.weather?.day===day) return;
  town.weather||={};
  town.weatherSchedule||={};
  const year=asBigInt(calendar.year);
  let drought=town.weatherSchedule.drought;
  if(!drought) {
    nextDrought(town,calendar,rng);
    drought=town.weatherSchedule.drought;
  } else if(year>=asBigInt(drought.nextYear)&&calendar.month>=drought.month
    &&String(drought.lastStart?.year)!==String(year)) {
    const startMonth=drought.month;
    drought={
      nextYear:year+BigInt(rng.int(4,7)),
      month:rng.int(4,6),
      months:rng.int(1,3),
      lastStart:{year:String(year),month:startMonth,months:drought.months},
    };
    town.weatherSchedule.drought=drought;
  }
  const startYear=drought.lastStart?asBigInt(drought.lastStart.year):asBigInt(calendar.year);
  const startMonth=drought.lastStart?.month??drought.month;
  const active=Boolean(drought.lastStart&&year===startYear&&calendar.month>=startMonth&&calendar.month<startMonth+drought.lastStart.months);
  const forecast=year===asBigInt(drought.nextYear)&&calendar.month<=3&&calendar.month<drought.month
    ? {year:String(drought.nextYear),month:drought.month,months:drought.months}
    : null;
  const summer=calendar.season==='Summer';
  const temperatureC=temperatureBase[calendar.season]+rng.int(-6,6);
  const windSpeedKph=rng.int(5,36);
  const windDirection=rng.int(0,359);
  const dustSeason=calendar.season==='Spring'&&rng.chance(0.35);
  const weather={
    day,season:calendar.season,temperatureC,lowTemperatureC:temperatureC-7,
    coldNight:calendar.season==='Winter'&&temperatureC-7<0,
    windSpeedKph,windDirection,windFactor:windSpeedKph/18,
    dust:dustSeason,drought:active,droughtForecast:forecast,
    droughtFactor:active?0.5:1,waterUseFactor:summer&&temperatureC>=35?1.5:1,
    waterLitresPerPerson:summer&&temperatureC>=35?50:15,
  };
  town.weather=weather;
  town.peopleConditions||={};
  town.peopleConditions.coldNight=weather.coldNight;
  town.peopleConditions.waterUseFactor=weather.waterUseFactor;
  town.peopleConditions.waterNeedLitresPerPerson=weather.waterLitresPerPerson;
  town.utilities||={};
  town.utilities.windFactor=weather.windFactor;
}

registerTownSystem('town-weather',10,1,stepTownWeather);
