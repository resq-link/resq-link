import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasSceneReport,
  mapSceneReportToLegacyPostReport,
  normalizeResponderReport,
  parseSceneReportRecord,
  validateArrivalTime,
  validateSceneReportInput,
  computeTotalPeopleAffected,
  getPeopleAffectedDisplay,
} from '../sceneReport';

describe('validateArrivalTime', () => {
  const now = new Date('2026-08-30T10:24:00.000Z');
  const acceptedAt = new Date('2026-08-30T10:00:00.000Z');

  it('accepts current operational time', () => {
    assert.equal(
      validateArrivalTime(new Date('2026-08-30T10:24:00.000Z'), { acceptedAt, now }),
      null,
    );
  });

  it('accepts earlier manual correction after acceptance', () => {
    assert.equal(
      validateArrivalTime(new Date('2026-08-30T10:20:00.000Z'), { acceptedAt, now }),
      null,
    );
  });

  it('rejects future arrival time', () => {
    assert.match(
      validateArrivalTime(new Date('2026-08-30T10:40:00.000Z'), { acceptedAt, now }) || '',
      /future/i,
    );
  });

  it('rejects arrival before acceptance', () => {
    assert.match(
      validateArrivalTime(new Date('2026-08-30T09:50:00.000Z'), { acceptedAt, now }) || '',
      /before case acceptance/i,
    );
  });
});

describe('validateSceneReportInput', () => {
  it('requires situation status and actions', () => {
    assert.match(validateSceneReportInput({}) || '', /Situation status/i);
    assert.match(
      validateSceneReportInput({
        situationStatus: 'ongoing',
        peopleAffected: ['none'],
        additionalResourcesNeeded: false,
      }) || '',
      /action/i,
    );
  });

  it('requires per-category counts when affected (new schema)', () => {
    assert.match(
      validateSceneReportInput({
        situationStatus: 'critical',
        peopleAffected: ['injured'],
        actionsTaken: ['Rescue'],
        additionalResourcesNeeded: false,
        peopleAffectedCounts: { injured: -1, rescued: 0, fatality: 0 },
      }) || '',
      /injured/i,
    );
  });

  it('accepts legacy numberOfPeople when counts absent', () => {
    assert.equal(
      validateSceneReportInput({
        situationStatus: 'critical',
        peopleAffected: ['injured'],
        numberOfPeople: 2,
        actionsTaken: ['Rescue'],
        additionalResourcesNeeded: false,
      }),
      null,
    );
  });
});

describe('people affected counts', () => {
  it('parses and totals category counts', () => {
    const parsed = parseSceneReportRecord({
      situationStatus: 'under_control',
      peopleAffected: ['injured', 'rescued'],
      peopleAffectedCounts: { injured: 3, rescued: 2, fatality: 0 },
      numberOfPeople: 5,
      actionsTaken: ['First Aid'],
      additionalResourcesNeeded: false,
      submittedAt: new Date('2026-08-30T10:47:00.000Z'),
    });

    assert.equal(parsed?.peopleAffectedCounts?.injured, 3);
    assert.equal(parsed?.peopleAffectedCounts?.rescued, 2);
    assert.equal(computeTotalPeopleAffected(parsed?.peopleAffectedCounts), 5);
  });

  it('displays legacy reports without inventing breakdown', () => {
    const display = getPeopleAffectedDisplay({
      situationStatus: 'ongoing',
      peopleAffected: ['injured', 'rescued'],
      numberOfPeople: 3,
      actionsTaken: ['Rescue'],
      additionalResourcesNeeded: false,
    });

    assert.equal(display.mode, 'legacy');
    assert.equal(display.total, 3);
    assert.match(display.legacyNote || '', /Legacy report/i);
  });

  it('displays detailed breakdown for new reports', () => {
    const display = getPeopleAffectedDisplay({
      situationStatus: 'ongoing',
      peopleAffected: ['injured', 'rescued'],
      peopleAffectedCounts: { injured: 4, rescued: 2, fatality: 0 },
      numberOfPeople: 6,
      actionsTaken: ['Rescue'],
      additionalResourcesNeeded: false,
    });

    assert.equal(display.mode, 'detailed');
    assert.equal(display.injured, 4);
    assert.equal(display.rescued, 2);
    assert.equal(display.total, 6);
  });
});

describe('parseSceneReportRecord', () => {
  it('parses and preserves actions taken arrays', () => {
    const parsed = parseSceneReportRecord({
      situationStatus: 'under_control',
      peopleAffected: ['injured', 'rescued'],
      numberOfPeople: 2,
      actionsTaken: ['Fire Suppression', 'First Aid'],
      additionalResourcesNeeded: true,
      additionalResourceType: 'ambulance',
      submittedAt: new Date('2026-08-30T10:47:00.000Z'),
      submittedByDispatcherId: 'uid-a',
      submittedByName: 'Responder A',
    });

    assert.ok(parsed);
    assert.deepEqual(parsed?.actionsTaken, ['Fire Suppression', 'First Aid']);
    assert.equal(parsed?.numberOfPeople, 2);
    assert.equal(hasSceneReport(parsed), true);
  });
});

describe('mapSceneReportToLegacyPostReport', () => {
  it('maps structured scene report into legacy post report fields', () => {
    const legacy = mapSceneReportToLegacyPostReport({
      situationStatus: 'under_control',
      peopleAffected: ['injured'],
      numberOfPeople: 1,
      actionsTaken: ['Scene Secured'],
      additionalResourcesNeeded: false,
      submittedAt: new Date('2026-08-30T10:47:00.000Z'),
      submittedByDispatcherId: 'uid-a',
      submittedByName: 'Responder A',
    });

    assert.equal(legacy.reasonForIncident, 'Under Control');
    assert.match(legacy.notes || '', /Scene Secured/);
    assert.equal(legacy.peopleInvolved, 1);
  });
});

describe('normalizeResponderReport', () => {
  it('prefers new scene report over legacy post report', () => {
    const normalized = normalizeResponderReport(
      {
        sceneReports: {
          'uid-a': {
            situationStatus: 'ongoing',
            peopleAffected: ['none'],
            actionsTaken: ['Scene Secured'],
            additionalResourcesNeeded: false,
            submittedAt: new Date('2026-08-30T10:47:00.000Z'),
          },
        },
        postIncidentReports: {
          'uid-a': {
            reasonForIncident: 'Legacy',
            submittedAt: new Date('2026-08-30T10:40:00.000Z'),
          },
        },
      },
      'uid-a',
    );

    assert.equal(normalized?.source, 'scene_report');
    assert.equal(normalized?.sceneReport?.situationStatus, 'ongoing');
  });

  it('falls back to legacy post report for old incidents', () => {
    const normalized = normalizeResponderReport(
      {
        postIncidentReports: {
          'uid-b': {
            reasonForIncident: 'Accidental',
            notes: 'Scene secured',
            submittedAt: new Date('2026-08-30T09:00:00.000Z'),
            submittedByName: 'Legacy Responder',
          },
        },
      },
      'uid-b',
    );

    assert.equal(normalized?.source, 'legacy_post_report');
    assert.equal(normalized?.legacyPostReport?.reasonForIncident, 'Accidental');
  });
});
