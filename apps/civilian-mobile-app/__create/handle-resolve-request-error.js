const path = require('node:path');
const { reportErrorToRemote } = require('./report-error-to-remote');

const VIRTUAL_ROOT = path.join(__dirname, '../.metro-virtual');
const VIRTUAL_ROOT_UNRESOLVED = path.join(VIRTUAL_ROOT, 'unresolved');

const handleResolveRequestError = ({ error, context, moduleName }) => {
  const errorMessage = `Unable to resolve module '${moduleName}' from '${context.originModulePath}'`;
  const syntheticError = new Error(errorMessage);
  syntheticError.stack = error.stack;
  reportErrorToRemote({ error: syntheticError }).catch(() => {
    // no-op
  });
  throw error;
};

module.exports = {
  handleResolveRequestError,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
};
