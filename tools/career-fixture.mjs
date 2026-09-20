import {COURSE} from '../src/config.js';

// Explicit ownership for isolated in-memory physics/reward fixtures. This does
// not buy courses, change balances, or bypass the production App entry guard.
// Purchase, migration and locked-course behavior have their own access suite.
export const testCourseAccess=()=>({version:1,unlocked:COURSE.map(course=>course.id)});
export function ownTestCourses(app){app.profile={...app.profile,courses:testCourseAccess()};app._saveProfile();return app;}
