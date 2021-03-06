import uuid4 from 'uuid4';
import * as types from '../actionTypes';

// TODO cache
// TODO don't make a call for a local ledger destination
export const destinationChange = (destination) => ({
  types: [types.DESTINATION_CHANGE, types.DESTINATION_CHANGE_SUCCESS, types.DESTINATION_CHANGE_FAIL],
  promise: (client) => client.get('/parse/destination', {
    params: {
      destination: destination
    }
  })
})

export const findPath = (values) => ({
  types: [types.PATHFIND, types.PATHFIND_SUCCESS, types.PATHFIND_FAIL],
  promise: (client) => client.post('/payments/findPath', {
    // TODO source user set here or in api?
    data: {
      destination: values.destination,
      source_amount: values.sourceAmount,
      destination_amount: values.destinationAmount
    }
  })
})

// TODO confirm findPath instead of using the sender.default
export const transfer = (values) => (dispatch, getState) => dispatch({
  types: [types.SEND, types.SEND_SUCCESS, types.SEND_FAIL],
  promise: (client) => client.put('/payments/' + uuid4(), {
    // TODO source user set here or in api?
    data: {
      destination_account: values.destination,
      source_amount: values.sourceAmount,
      destination_amount: values.destinationAmount,
      path: getState().send.pathRaw,
      message: values.message
    }
  })
})

// TODO there's gotta be a way to automate this somehow (fallback to default state)
export const unmount = () => ({
  type: types.DESTROY
})
