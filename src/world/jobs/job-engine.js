import { stepReach } from './steps/reach.js';
import { stepCarry } from './steps/carry.js';
import { stepChase } from './steps/chase.js';
import { stepEscort } from './steps/escort.js';
import { stepOnFoot } from './steps/onfoot.js';
import { stepHeist } from './steps/heist.js';
import { stepRescue } from './steps/rescue.js';
import { stepDefend } from './steps/defend.js';
import { stepExplore } from './steps/explore.js';
import { stepBoard } from './steps/board.js';
import { stepDrivetrain } from './steps/drivetrain.js';
import { stepLines, stepLineTriggers } from './step-lines.js';

const runners = { reach: stepReach, carry: stepCarry, chase: stepChase, escort: stepEscort,
  onfoot: stepOnFoot, heist: stepHeist, rescue: stepRescue, defend: stepDefend, explore: stepExplore,
  board: stepBoard, drivetrain: stepDrivetrain };

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

export function createJob(def, seed = 0) {
  if (!def || !Array.isArray(def.steps)) throw new TypeError('A job definition needs a steps array');
  for (const step of def.steps) if (!runners[step?.kind]) throw new TypeError(`Unknown job step: ${step?.kind}`);
  return { id: def.id ?? null, seed, steps: clone(def.steps), stepIndex: 0, stepState: {}, events: [], requests: [],
    done: def.steps.length === 0, failedStep: false, lineId: def.steps[0]?.lineId ?? def.lineId ?? null };
}

export function stepJob(job, view = {}, dt = 0) {
  if (!job || !Array.isArray(job.steps)) throw new TypeError('Invalid job state');
  if (!Number.isFinite(dt) || dt < 0) throw new RangeError('dt must be a non-negative number');
  const result = { ...job, stepState: clone(job.stepState), events: [], requests: [], failedStep: false };
  if (result.done || result.stepIndex >= result.steps.length) { result.done = true; return result; }
  const step = result.steps[result.stepIndex];
  if(!result.stepState.linesStarted&&!result.stepState.lineBlocking&&step.opening?.length) {
    const openingOutcome=runners[step.kind](step,result.stepState,
      {...view,controls:{...(view.controls??{}),throttle:0,brake:0}},0,result.seed);
    const opening=stepLines(step,result.stepState,view,dt,{...openingOutcome,complete:false});
    result.stepState=opening.state??result.stepState;result.requests=opening.requests??[];
    if(result.stepState.lineBlocking)return result;
  }
  if(result.stepState.lineBlocking) {
    const held=stepLines(step,result.stepState,view,dt,{state:result.stepState,complete:false,events:[],requests:[]});
    result.stepState=held.state??result.stepState;result.requests=held.requests??[];
    return result;
  }
  const outcome = runners[step.kind](step, result.stepState, view, dt, result.seed);
  const triggered = stepLineTriggers(step, result.stepState, view, outcome);
  const lined = stepLines(step, result.stepState, view, dt, triggered);
  result.stepState = lined.state ?? result.stepState;
  result.events = lined.events ?? [];
  result.requests = lined.requests ?? [];
  result.lineId = lined.lineId ?? step.lineId ?? result.lineId;
  if (lined.restart) {
    result.stepState = lined.state ?? {};
    result.failedStep = true;
  } else if (lined.complete) {
    const waiting = result.stepState.lineQueue ?? [], showing = result.stepState.lineRemaining ?? 0;
    result.stepIndex += 1;
    const following = result.steps[result.stepIndex];
    if (following?.opening?.length) result.stepState = waiting.length ? { carriedLines: waiting } : {};
    else result.stepState = waiting.length || showing > 0 ? { lineQueue: waiting, lineRemaining: showing } : {};
    result.done = result.stepIndex >= result.steps.length;
    result.lineId = result.steps[result.stepIndex]?.lineId ?? result.lineId;
    if (result.done) result.events = [...result.events, { type: 'done' }];
  }
  return result;
}
