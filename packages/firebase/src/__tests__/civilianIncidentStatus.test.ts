import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCivilianIncidentResolved,
  getCivilianIncidentStatusPresentation,
  getCivilianStatusShortLabel,
  type CivilianReportStatusInput,
} from '../civilianIncidentStatus';

function baseReport(overrides: Partial<CivilianReportStatusInput> = {}): CivilianReportStatusInput {
  return {
    id: 'report-1',
    userId: 'user-1',
    incidentType: 'fire',
    status: 'active',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  } as CivilianReportStatusInput;
}

describe('civilianIncidentStatus', () => {
  it('linked incident resolved overrides stale enroute report fields', () => {
    const report = baseReport({
      status: 'active',
      acceptedAt: new Date('2026-01-01T10:05:00Z'),
      linkedIncidentStatus: 'resolved',
      linkedIncidentResolutionStatus: 'resolved',
      linkedIncidentResolvedAt: new Date('2026-01-01T11:00:00Z'),
    });

    assert.equal(isCivilianIncidentResolved(report), true);
    const presentation = getCivilianIncidentStatusPresentation(report);
    assert.equal(presentation.key, 'resolved');
    assert.equal(getCivilianStatusShortLabel(report), 'Resolved');
  });

  it('active incident with enroute responder shows En Route', () => {
    const report = baseReport({
      status: 'active',
      acceptedAt: new Date('2026-01-01T10:05:00Z'),
      linkedIncidentStatus: 'enroute',
    });

    assert.equal(isCivilianIncidentResolved(report), false);
    const presentation = getCivilianIncidentStatusPresentation(report);
    assert.equal(presentation.key, 'en_route');
    assert.equal(getCivilianStatusShortLabel(report), 'Responder En Route');
  });

  it('active incident with on_scene responder shows On Scene', () => {
    const report = baseReport({
      status: 'active',
      linkedIncidentStatus: 'on_scene',
      touchdownAt: new Date('2026-01-01T10:30:00Z'),
    });

    const presentation = getCivilianIncidentStatusPresentation(report);
    assert.equal(presentation.key, 'on_scene');
    assert.equal(getCivilianStatusShortLabel(report), 'Responders On Scene');
  });

  it('resolved report with stale on_scene responder assignment still shows Resolved', () => {
    const report = baseReport({
      status: 'resolved',
      resolvedAt: new Date('2026-01-01T11:00:00Z'),
      acceptedAt: new Date('2026-01-01T10:05:00Z'),
      touchdownAt: new Date('2026-01-01T10:30:00Z'),
      linkedIncidentStatus: 'on_scene',
    });

    const presentation = getCivilianIncidentStatusPresentation(report);
    assert.equal(presentation.key, 'resolved');
    assert.equal(getCivilianStatusShortLabel(report), 'Resolved');
  });

  it('postIncidentReport on report marks resolved even when status is active', () => {
    const report = baseReport({
      status: 'active',
      acceptedAt: new Date('2026-01-01T10:05:00Z'),
      postIncidentReport: {
        submittedAt: new Date('2026-01-01T11:00:00Z'),
      },
    });

    assert.equal(isCivilianIncidentResolved(report), true);
    assert.equal(getCivilianIncidentStatusPresentation(report).key, 'resolved');
  });
});
