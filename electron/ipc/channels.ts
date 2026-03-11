export const IPC_CHANNELS = {
  ACCOUNT_GET_ALL: 'account:getAll',
  ACCOUNT_GET_BY_SERVICE: 'account:getByService',
  ACCOUNT_ADD: 'account:add',
  ACCOUNT_UPDATE: 'account:update',
  ACCOUNT_REMOVE: 'account:remove',
  ACCOUNT_SET_ACTIVE: 'account:setActive',
  ACCOUNT_GET_ACTIVE: 'account:getActive',

  INTEGRATION_GET_AVAILABLE: 'integration:getAvailable',
  INTEGRATION_INVOKE: 'integration:invoke',
  INTEGRATION_VALIDATE: 'integration:validate',
} as const;
