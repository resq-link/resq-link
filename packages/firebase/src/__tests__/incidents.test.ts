import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  areAllResponderAssignmentsComplete,
  isResponderAssignmentPendingAccept,
  getResponderAssignment,
} from '../incidents';

describe('areAllResponderAssignmentsComplete', () => {
  it('does not resolve incident when one responder remains active', () => {
    const complete = areAllResponderAssignmentsComplete({
      'uid-a': { responderId: 'uid-a', status: 'resolved' },
      'uid-b': { responderId: 'uid-b', status: 'on_scene' },
    });
    assert.equal(complete, false);
  });

  it('resolves incident when all responders are resolved or declined', () => {
    const complete = areAllResponderAssignmentsComplete({
      'uid-a': { responderId: 'uid-a', status: 'resolved' },
      'uid-b': { responderId: 'uid-b', status: 'declined' },
    });
    assert.equal(complete, true);
  });
});

describe('responder assignment pending accept', () => {
  it('dispatched incident with assigned slot is pending accept', () => {
    const incident = {
      id: 'inc-1',
      status: 'dispatched',
      assignedResourceIds: ['uid-a'],
      responderAssignments: {
        'uid-a': { responderId: 'uid-a', status: 'assigned' },
      },
    } as unknown as import('../incidents').IncidentRecord;

    assert.equal(isResponderAssignmentPendingAccept(incident, 'uid-a'), true);
    assert.equal(getResponderAssignment(incident, 'uid-a')?.status, 'assigned');
  });

  it('synthetic assignment from assignedResourceIds when slot missing', () => {
    const incident = {
      id: 'inc-2',
      status: 'dispatched',
      assignedResourceIds: ['uid-b'],
      responderAssignments: {},
    } as unknown as import('../incidents').IncidentRecord;

    assert.equal(isResponderAssignmentPendingAccept(incident, 'uid-b'), true);
    assert.equal(getResponderAssignment(incident, 'uid-b')?.status, 'assigned');
  });

  it('peer enroute does not clear pending accept for assigned responder', () => {
    const incident = {
      id: 'inc-3',
      status: 'enroute',
      assignedResourceIds: ['uid-a', 'uid-b'],
      responderAssignments: {
        'uid-a': { responderId: 'uid-a', status: 'enroute' },
        'uid-b': { responderId: 'uid-b', status: 'assigned' },
      },
    } as unknown as import('../incidents').IncidentRecord;

    assert.equal(isResponderAssignmentPendingAccept(incident, 'uid-a'), false);
    assert.equal(isResponderAssignmentPendingAccept(incident, 'uid-b'), true);
  });
});
